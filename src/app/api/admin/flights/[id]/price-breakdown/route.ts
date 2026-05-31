import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPricingConfig, getActiveSurcharges, calculateBasePrice, calculateSurcharges } from "@/lib/pricing";

async function requireManagerOrAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MANAGER") return null;
  return session;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireManagerOrAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const flight = await prisma.flight.findUnique({
    where: { id },
  });

  if (!flight) {
    return Response.json({ error: "Flight not found" }, { status: 404 });
  }

  const config = await getPricingConfig();
  const surcharges = await getActiveSurcharges();

  // Replicate calculation to get breakdown
  let basePriceCalculation = {};
  
  if (config.pricingMode === "TIME" && flight.durationMin != null) {
    const flightHours = flight.durationMin / 60;
    basePriceCalculation = {
      mode: "TIME",
      flightHours,
      flightHourPrice: config.flightHourPrice,
      rawBasePrice: flightHours * config.flightHourPrice,
    };
  } else {
    const isShortFlight = flight.distanceNm < config.shortFlightThresholdNm;
    const multiplier = isShortFlight ? config.shortFlightMultiplier : config.longFlightMultiplier;
    basePriceCalculation = {
      mode: "DISTANCE",
      distanceNm: flight.distanceNm,
      isShortFlight,
      multiplierUsed: multiplier,
      rawBasePrice: flight.distanceNm * multiplier,
    };
  }

  const basePrice = calculateBasePrice(flight.distanceNm, flight.durationMin, config);
  
  const surchargeData = calculateSurcharges(
    basePrice,
    flight.depCountry,
    flight.arrCountry,
    surcharges
  );

  return Response.json({
    flightNo: flight.flightNo,
    configUsed: config,
    basePriceCalculation,
    roundedBasePrice: basePrice,
    minimumPriceApplied: basePrice === config.minimumPrice,
    surcharges: surchargeData.applied,
    totalTaxPerPax: surchargeData.total,
  });
}
