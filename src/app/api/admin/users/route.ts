import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalNotification } from "@/lib/email";
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

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  return Response.json({ users });
}

const updateSchema = z.object({
  userId: z.string(),
  role: z.enum(["PENDING", "BASIC", "BROKER", "MANAGER", "ADMIN"]),
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

  const oldUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  if (oldUser?.role === "PENDING" && parsed.data.role !== "PENDING") {
    try {
      await sendApprovalNotification(user.email, user.name || "User");
    } catch {
      // Email failure should not block role update
    }
  }

  return Response.json({ user });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await request.json();

  await prisma.user.delete({ where: { id: userId } });

  return Response.json({ success: true });
}
