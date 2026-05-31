import { Role, InquiryStatus, SyncStatus } from "@/generated/prisma/client";

export type { Role, InquiryStatus, SyncStatus };

export interface FlightPublic {
  id: string;
  flightNo: string;
  depDatetimeUtc: string;
  aircraftType: string;
  depAirportIata: string;
  depCity: string;
  depCountry: string;
  arrAirportIata: string;
  arrCity: string;
  arrCountry: string;
  distanceNm: number;
  paxCapacity: number;
  calculatedPrice?: number;
  estimatedTaxPerPax?: number;
}

export interface InquiryFormData {
  flightId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  message: string;
}

export interface PricingConfigData {
  pricingMode: "DISTANCE" | "TIME";
  flightHourPrice: number;
  shortFlightThresholdNm: number;
  shortFlightMultiplier: number;
  longFlightMultiplier: number;
  minimumPrice: number;
  maximumPrice?: number | null;
  roundToNearest: number;
}

export interface FlightFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  aircraftType?: string;
  maxPrice?: number;
  minSeats?: number;
}

export interface UserSession {
  id: string;
  email: string;
  name?: string;
  role: Role;
  image?: string;
}
