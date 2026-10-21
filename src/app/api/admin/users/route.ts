import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { sendApprovalNotification } from "@/lib/email";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return session;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Paginated + server-side search so the page never has to load the entire
  // user table at once (a flood of bot sign-ups used to freeze the UI).
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(params.get("pageSize") || "50", 10) || 50)
  );
  const search = (params.get("search") || "").trim();

  // Sorting: by registration date, login count, or last login.
  const sortField = (() => {
    switch (params.get("sort")) {
      case "loginCount":
        return "loginCount" as const;
      case "lastLoginAt":
        return "lastLoginAt" as const;
      default:
        return "createdAt" as const;
    }
  })();
  const sortDir = params.get("order") === "asc" ? "asc" : "desc";
  let orderBy: Prisma.UserOrderByWithRelationInput;
  if (sortField === "lastLoginAt") {
    orderBy = { lastLoginAt: { sort: sortDir, nulls: "last" } };
  } else if (sortField === "loginCount") {
    orderBy = { loginCount: sortDir };
  } else {
    orderBy = { createdAt: sortDir };
  }

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total, pendingUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        loginCount: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: "PENDING" } }),
  ]);

  return Response.json({ users, total, pendingUsers, page, pageSize });
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
