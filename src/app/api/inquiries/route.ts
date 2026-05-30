import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInquiryNotification } from "@/lib/email";
import { formatDate } from "@/lib/utils";
import { z } from "zod";

const inquirySchema = z.object({
  flightId: z.string(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role || "PENDING";
  if (role === "PENDING") {
    return Response.json({ error: "Account pending approval" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const flight = await prisma.flight.findUnique({
    where: { id: parsed.data.flightId },
  });

  if (!flight) {
    return Response.json({ error: "Flight not found" }, { status: 404 });
  }

  const inquiry = await prisma.inquiry.create({
    data: parsed.data,
  });

  try {
    await sendInquiryNotification({
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      message: parsed.data.message,
      flightRoute: `${flight.depCity} (${flight.depAirportIata}) → ${flight.arrCity} (${flight.arrAirportIata})`,
      flightDate: formatDate(flight.depDatetimeUtc),
    });
  } catch {
    // Email failure should not block inquiry creation
  }

  return Response.json({ inquiry }, { status: 201 });
}
