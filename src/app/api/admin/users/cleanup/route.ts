import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return session;
}

// A term must be at least 3 characters so a bulk delete can never match
// (almost) the whole table by accident.
const MIN_TERM = 3;

function buildWhere(
  term: string,
  selfId: string | undefined
): Prisma.UserWhereInput {
  return {
    AND: [
      {
        OR: [
          { email: { contains: term, mode: "insensitive" } },
          { name: { contains: term, mode: "insensitive" } },
        ],
      },
      // Never touch privileged accounts or the admin running this.
      { role: { notIn: ["ADMIN", "MANAGER"] } },
      ...(selfId ? [{ id: { not: selfId } }] : []),
    ],
  };
}

// GET /api/admin/users/cleanup?term=pj-assessment
// Preview only: how many users match, plus a small sample. Does NOT return the
// full list, so it stays fast even with thousands of rows.
export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const term = (new URL(request.url).searchParams.get("term") || "").trim();
  if (term.length < MIN_TERM) {
    return Response.json(
      { error: `Search term must be at least ${MIN_TERM} characters.` },
      { status: 400 }
    );
  }

  const selfId = (session.user as { id?: string }).id;
  const where = buildWhere(term, selfId);

  const [count, sample] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { email: true, name: true, role: true },
    }),
  ]);

  return Response.json({ term, count, sample });
}

const deleteSchema = z.object({
  term: z.string().trim().min(MIN_TERM),
});

// POST /api/admin/users/cleanup  { term: "pj-assessment" }
// Deletes every matching non-privileged user in one shot. Returns the count.
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: `Search term must be at least ${MIN_TERM} characters.` },
      { status: 400 }
    );
  }

  const selfId = (session.user as { id?: string }).id;
  const where = buildWhere(parsed.data.term, selfId);

  const matches = await prisma.user.findMany({ where, select: { id: true } });
  const ids = matches.map((u) => u.id);

  if (ids.length === 0) {
    return Response.json({ deleted: 0 });
  }

  // Detach handled inquiries first so the delete can't fail on a foreign key.
  await prisma.inquiry.updateMany({
    where: { handledById: { in: ids } },
    data: { handledById: null },
  });

  const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });

  return Response.json({ deleted: result.count });
}
