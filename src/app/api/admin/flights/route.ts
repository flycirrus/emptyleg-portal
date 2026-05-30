import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireManagerOrAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MANAGER") return null;
  return session;
}

export async function GET() {
  if (!(await requireManagerOrAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flights = await prisma.flight.findMany({
    orderBy: { depDatetimeUtc: "asc" },
    include: { _count: { select: { inquiries: true } } },
  });

  return Response.json({ flights });
}

const updateSchema = z.object({
  flightId: z.string(),
  isVisible: z.boolean().optional(),
  adminNotes: z.string().optional(),
});

export async function PUT(request: Request) {
  if (!(await requireManagerOrAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { flightId, ...data } = parsed.data;

  const flight = await prisma.flight.update({
    where: { id: flightId },
    data,
  });

  return Response.json({ flight });
}
