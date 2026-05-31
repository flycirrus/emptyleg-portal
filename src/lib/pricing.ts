import { prisma } from "./prisma";

export interface PricingConfig {
  pricingMode: "DISTANCE" | "TIME";
  flightHourPrice: number;
  shortFlightThresholdNm: number;
  shortFlightMultiplier: number;
  longFlightMultiplier: number;
  minimumPrice: number;
  maximumPrice?: number | null;
  roundToNearest: number;
}

export interface Surcharge {
  countryCode: string;
  countryName: string;
  surchargeType: "FIXED" | "PERCENTAGE";
  amount: number;
  label: string;
  appliesTo: "DEPARTURE" | "ARRIVAL" | "BOTH";
}

const DEFAULT_CONFIG: PricingConfig = {
  pricingMode: "DISTANCE",
  flightHourPrice: 3000,
  shortFlightThresholdNm: 400,
  shortFlightMultiplier: 18.9,
  longFlightMultiplier: 8.5,
  minimumPrice: 1700,
  maximumPrice: null,
  roundToNearest: 100,
};

export function calculateBasePrice(
  distanceNm: number,
  durationMin: number | null | undefined,
  config: PricingConfig
): number {
  let raw = 0;

  if (config.pricingMode === "TIME" && durationMin != null) {
    // Pricing based on flight hours
    const flightHours = durationMin / 60;
    raw = flightHours * config.flightHourPrice;
  } else {
    // Pricing based on distance
    const multiplier =
      distanceNm < config.shortFlightThresholdNm
        ? config.shortFlightMultiplier
        : config.longFlightMultiplier;
    raw = distanceNm * multiplier;
  }

  const rounded =
    Math.round(raw / config.roundToNearest) * config.roundToNearest;
  let finalPrice = Math.max(rounded, config.minimumPrice);
  if (config.maximumPrice != null) {
    finalPrice = Math.min(finalPrice, config.maximumPrice);
  }
  return finalPrice;
}

export function calculateSurcharges(
  basePrice: number,
  depCountry: string,
  arrCountry: string,
  surcharges: Surcharge[]
): { total: number; applied: { label: string; amount: number }[] } {
  const applied: { label: string; amount: number }[] = [];
  let total = 0;

  for (const s of surcharges) {
    const matchesDep =
      (s.appliesTo === "DEPARTURE" || s.appliesTo === "BOTH") &&
      depCountry.toLowerCase() === s.countryName.toLowerCase();
    const matchesArr =
      (s.appliesTo === "ARRIVAL" || s.appliesTo === "BOTH") &&
      arrCountry.toLowerCase() === s.countryName.toLowerCase();

    if (matchesDep || matchesArr) {
      const amount =
        s.surchargeType === "PERCENTAGE"
          ? Math.round((basePrice * s.amount) / 100)
          : s.amount;
      applied.push({ label: s.label, amount });
      total += amount;
    }
  }

  return { total, applied };
}

export function calculatePrice(
  distanceNm: number,
  durationMin: number | null | undefined,
  config: PricingConfig,
  depCountry?: string,
  arrCountry?: string,
  surcharges?: Surcharge[]
): { basePrice: number; taxPerPax: number } {
  const basePrice = calculateBasePrice(distanceNm, durationMin, config);
  let taxPerPax = 0;

  if (depCountry && arrCountry && surcharges?.length) {
    const { total } = calculateSurcharges(
      basePrice,
      depCountry,
      arrCountry,
      surcharges
    );
    taxPerPax = total;
  }

  return { basePrice, taxPerPax };
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const config = await prisma.pricingConfig.findFirst();
  if (!config) return DEFAULT_CONFIG;
  return {
    pricingMode: config.pricingMode as "DISTANCE" | "TIME",
    flightHourPrice: config.flightHourPrice,
    shortFlightThresholdNm: config.shortFlightThresholdNm,
    shortFlightMultiplier: config.shortFlightMultiplier,
    longFlightMultiplier: config.longFlightMultiplier,
    minimumPrice: config.minimumPrice,
    maximumPrice: config.maximumPrice,
    roundToNearest: config.roundToNearest,
  };
}

export async function getActiveSurcharges(): Promise<Surcharge[]> {
  const surcharges = await prisma.countrySurcharge.findMany({
    where: { isActive: true },
  });
  return surcharges.map((s) => ({
    countryCode: s.countryCode,
    countryName: s.countryName,
    surchargeType: s.surchargeType as "FIXED" | "PERCENTAGE",
    amount: s.amount,
    label: s.label,
    appliesTo: s.appliesTo as "DEPARTURE" | "ARRIVAL" | "BOTH",
  }));
}
