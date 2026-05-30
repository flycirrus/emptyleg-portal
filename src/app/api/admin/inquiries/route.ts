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
  const session = await requireManagerOrAdmin();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      flight: {
        select: {
          depCity: true,
          arrCity: true,
          depAirportIata: true,
          arrAirportIata: true,
          depDatetimeUtc: true,
        },
      },
      handledBy: { select: { name: true, email: true } },
    },
  });

  return Response.json({ inquiries });
}

const updateSchema = z.object({
  inquiryId: z.string(),
  status: z.enum(["NEW", "READ", "REPLIED", "CLOSED"]).optional(),
  adminNotes: z.string().optional(),
});

export async function PUT(request: Request) {
  const session = await requireManagerOrAdmin();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { inquiryId, ...data } = parsed.data;

  const inquiry = await prisma.inquiry.update({
    where: { id: inquiryId },
    data: {
      ...data,
      handledById: session.user.id,
    },
  });

  return Response.json({ inquiry });
}
