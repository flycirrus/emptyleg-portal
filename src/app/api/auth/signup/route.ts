import { prisma } from "@/lib/prisma";
import { sendNewUserNotification } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return Response.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "PENDING",
    },
  });

  try {
    await sendNewUserNotification(user.name || "Unknown", user.email);
  } catch {
    // Email failure should not block registration
  }

  return Response.json(
    { message: "Registration successful. Please wait for admin approval." },
    { status: 201 }
  );
}
