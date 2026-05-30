import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const surcharges = await prisma.countrySurcharge.findMany({
    orderBy: { countryName: "asc" },
  });

  return Response.json({ surcharges });
}

const createSchema = z.object({
  countryCode: z.string().min(2).max(3),
  countryName: z.string().min(1),
  surchargeType: z.enum(["FIXED", "PERCENTAGE"]),
  amount: z.number().min(0),
  label: z.string().min(1),
  appliesTo: z.enum(["DEPARTURE", "ARRIVAL", "BOTH"]),
  isActive: z.boolean().default(true),
});

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const surcharge = await prisma.countrySurcharge.create({
    data: parsed.data,
  });

  return Response.json({ surcharge }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string(),
  countryCode: z.string().min(2).max(3).optional(),
  countryName: z.string().min(1).optional(),
  surchargeType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  amount: z.number().min(0).optional(),
  label: z.string().min(1).optional(),
  appliesTo: z.enum(["DEPARTURE", "ARRIVAL", "BOTH"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;

  const surcharge = await prisma.countrySurcharge.update({
    where: { id },
    data,
  });

  return Response.json({ surcharge });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  await prisma.countrySurcharge.delete({ where: { id } });

  return Response.json({ success: true });
}
