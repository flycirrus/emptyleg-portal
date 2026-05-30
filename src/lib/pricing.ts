import { prisma } from "./prisma";

export interface PricingConfig {
  shortFlightThresholdNm: number;
  shortFlightMultiplier: number;
  longFlightMultiplier: number;
  minimumPrice: number;
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
  shortFlightThresholdNm: 400,
  shortFlightMultiplier: 18.9,
  longFlightMultiplier: 8.5,
  minimumPrice: 1700,
  roundToNearest: 100,
};

export function calculateBasePrice(
  distanceNm: number,
  config: PricingConfig
): number {
  const multiplier =
    distanceNm < config.shortFlightThresholdNm
      ? config.shortFlightMultiplier
      : config.longFlightMultiplier;

  const raw = distanceNm * multiplier;
  const rounded =
    Math.round(raw / config.roundToNearest) * config.roundToNearest;
  return Math.max(rounded, config.minimumPrice);
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
  config: PricingConfig,
  depCountry?: string,
  arrCountry?: string,
  surcharges?: Surcharge[]
): number {
  const basePrice = calculateBasePrice(distanceNm, config);

  if (depCountry && arrCountry && surcharges?.length) {
    const { total } = calculateSurcharges(
      basePrice,
      depCountry,
      arrCountry,
      surcharges
    );
    return basePrice + total;
  }

  return basePrice;
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const config = await prisma.pricingConfig.findFirst();
  if (!config) return DEFAULT_CONFIG;
  return {
    shortFlightThresholdNm: config.shortFlightThresholdNm,
    shortFlightMultiplier: config.shortFlightMultiplier,
    longFlightMultiplier: config.longFlightMultiplier,
    minimumPrice: config.minimumPrice,
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
