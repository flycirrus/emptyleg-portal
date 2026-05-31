import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculatePrice, getActiveSurcharges } from "@/lib/pricing";

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

  let config = await prisma.pricingConfig.findFirst();

  if (!config) {
    config = await prisma.pricingConfig.create({
      data: {},
    });
  }

  return Response.json({ config });
}

const updateSchema = z.object({
  pricingMode: z.enum(["DISTANCE", "TIME"]),
  flightHourPrice: z.number().min(0),
  shortFlightThresholdNm: z.number().min(1),
  shortFlightMultiplier: z.number().min(0),
  longFlightMultiplier: z.number().min(0),
  minimumPrice: z.number().min(0),
  maximumPrice: z.number().min(0).nullable().optional(),
  roundToNearest: z.number().min(1),
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

  let config = await prisma.pricingConfig.findFirst();

  if (config) {
    config = await prisma.pricingConfig.update({
      where: { id: config.id },
      data: parsed.data,
    });
  } else {
    config = await prisma.pricingConfig.create({
      data: parsed.data,
    });
  }

  // Recalculate prices for all flights
  const pricingConfigToUse = {
    pricingMode: config.pricingMode as "DISTANCE" | "TIME",
    flightHourPrice: config.flightHourPrice,
    shortFlightThresholdNm: config.shortFlightThresholdNm,
    shortFlightMultiplier: config.shortFlightMultiplier,
    longFlightMultiplier: config.longFlightMultiplier,
    minimumPrice: config.minimumPrice,
    maximumPrice: config.maximumPrice,
    roundToNearest: config.roundToNearest,
  };

  const flights = await prisma.flight.findMany();
  const surcharges = await getActiveSurcharges();

  const updatePromises = flights.map((flight) => {
    const { basePrice, taxPerPax } = calculatePrice(
      flight.distanceNm,
      flight.durationMin,
      pricingConfigToUse,
      flight.depCountry,
      flight.arrCountry,
      surcharges
    );
    return prisma.flight.update({
      where: { id: flight.id },
      data: {
        calculatedPrice: basePrice,
        estimatedTaxPerPax: taxPerPax,
      },
    });
  });

  await prisma.$transaction(updatePromises);

  return Response.json({ config });
}
