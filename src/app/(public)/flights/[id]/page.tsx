"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Plane,
  Calendar,
  Clock,
  Users,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Ruler,
  Phone,
  Mail,
} from "lucide-react";
import {
  formatPrice,
  formatDate,
  isCabotageRestricted,
  isIdTraveller,
  ID_TRAVELLER_PRICE,
} from "@/lib/utils";
import type { FlightPublic } from "@/types";

function formatUtcTime(utcDateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(utcDateStr));
}

interface FlightDetailResponse {
  flights: FlightPublic[];
  canViewPrices: boolean;
  role?: string;
}

export default function FlightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [flight, setFlight] = useState<FlightPublic | null>(null);
  const [canViewPrices, setCanViewPrices] = useState(false);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFlight() {
      try {
        const res = await fetch(`/api/flights`);
        if (!res.ok) {
          throw new Error("Failed to load flight details.");
        }

        const data: FlightDetailResponse = await res.json();
        const found = data.flights.find((f) => f.id === id);

        if (!found) {
          throw new Error("Flight not found.");
        }

        setFlight(found);
        setCanViewPrices(data.canViewPrices);
        setRole(data.role || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      } finally {
        setLoading(false);
      }
    }

    loadFlight();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a96e]" />
        <p className="mt-4 text-sm text-gray-400">Loading flight details...</p>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-900/50 bg-red-950/20 py-16">
          <p className="text-red-400">{error || "Flight not found."}</p>
          <Link
            href="/flights"
            className="mt-4 flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Flights
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
      <Link
        href="/flights"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-[#c9a96e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all flights
      </Link>

      {/* Flight Header Card */}
      <div className="mb-8 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60">
        {/* Route Visualization */}
        <div className="border-b border-gray-800 bg-[#111827]/50 px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex items-center justify-between gap-4">
            {/* Departure */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-[#c9a96e]" />
                <span className="text-sm font-medium uppercase tracking-wide text-[#c9a96e]">
                  Departure
                </span>
              </div>
              <h2 className="mt-2 truncate text-2xl font-bold text-white sm:text-3xl">
                {flight.depCity}
              </h2>
              <p className="mt-1 text-gray-400">
                {flight.depAirportIata} &middot; {flight.depCountry}
              </p>
            </div>

            {/* Route Line */}
            <div className="hidden flex-col items-center gap-2 px-6 sm:flex">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full border-2 border-[#c9a96e]" />
                <div className="flex w-24 items-center md:w-36">
                  <div className="h-px flex-1 border-t-2 border-dashed border-gray-700" />
                  <Plane className="mx-2 h-5 w-5 text-[#c9a96e]" />
                  <div className="h-px flex-1 border-t-2 border-dashed border-gray-700" />
                </div>
                <div className="h-2 w-2 rounded-full bg-[#c9a96e]" />
              </div>
              <span className="text-xs text-gray-500">
                {flight.distanceNm.toLocaleString()} NM
              </span>
            </div>

            {/* Arrival */}
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-medium uppercase tracking-wide text-[#c9a96e]">
                  Arrival
                </span>
                <MapPin className="h-4 w-4 flex-shrink-0 text-[#c9a96e]" />
              </div>
              <h2 className="mt-2 truncate text-2xl font-bold text-white sm:text-3xl">
                {flight.arrCity}
              </h2>
              <p className="mt-1 text-gray-400">
                {flight.arrAirportIata} &middot; {flight.arrCountry}
              </p>
            </div>
          </div>

          {/* Mobile route indicator */}
          <div className="mt-4 flex items-center justify-center gap-3 sm:hidden">
            <div className="h-2 w-2 rounded-full border-2 border-[#c9a96e]" />
            <div className="flex items-center">
              <div className="h-px w-8 border-t-2 border-dashed border-gray-700" />
              <Plane className="mx-1 h-4 w-4 text-[#c9a96e]" />
              <ArrowRight className="h-3 w-3 text-gray-600" />
              <div className="h-px w-8 border-t-2 border-dashed border-gray-700" />
            </div>
            <div className="h-2 w-2 rounded-full bg-[#c9a96e]" />
          </div>
        </div>

        {/* Flight Details Grid */}
        <div className="grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-4 lg:grid-cols-5">
          <DetailCell
            icon={<Calendar className="h-4 w-4" />}
            label="Date"
            value={formatDate(flight.depDatetimeUtc)}
          />
          <DetailCell
            icon={<Clock className="h-4 w-4" />}
            label="Departure (UTC)"
            value={formatUtcTime(flight.depDatetimeUtc)}
          />
          <DetailCell
            icon={<Plane className="h-4 w-4" />}
            label="Aircraft"
            value={flight.aircraftType}
          />
          <DetailCell
            icon={<Users className="h-4 w-4" />}
            label="Seats Available"
            value={String(flight.paxCapacity)}
          />
          <DetailCell
            icon={<Ruler className="h-4 w-4" />}
            label="Distance"
            value={`${flight.distanceNm.toLocaleString()} NM`}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* Cabotage Notice */}
        {isCabotageRestricted(flight.depCountry, flight.arrCountry) && (
          <div className="border-t border-red-900/30 bg-red-950/10 px-6 py-5 sm:px-10">
            <div className="flex items-center gap-3">
              <span className="inline-block rounded-full border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs font-medium text-red-400">
                Not bookable
              </span>
              <p className="text-sm text-gray-400">
                This domestic flight is not available for booking due to cabotage regulations.
              </p>
            </div>
          </div>
        )}

        {/* Price Band */}
        {!isCabotageRestricted(flight.depCountry, flight.arrCountry) && canViewPrices && flight.calculatedPrice != null && (
          <div className="border-t border-gray-800 bg-[#111827]/30 px-6 py-5 sm:px-10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Estimated charter price
              </span>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-bold text-[#d4af37]">
                  {formatPrice(flight.calculatedPrice)}
                </span>
                {flight.estimatedTaxPerPax && flight.estimatedTaxPerPax > 0 ? (
                  <span className="text-sm text-gray-400 mt-1">
                    + {formatPrice(flight.estimatedTaxPerPax)} Luxury Tax / pax
                  </span>
                ) : null}
              </div>
            </div>
            {/* Surcharge notice for France / Italy flights */}
            {(() => {
              const dep = (flight.depCountry || '').toLowerCase();
              const arr = (flight.arrCountry || '').toLowerCase();
              const hasFrance = dep.includes('france') || arr.includes('france');
              const hasItaly = dep.includes('italy') || arr.includes('italy') || dep.includes('italia') || arr.includes('italia');
              if (!hasFrance && !hasItaly) return null;
              const countries = [hasFrance && 'French tax', hasItaly && 'Italian luxury tax'].filter(Boolean).join(' and/or ');
              return (
                <p className="mt-2 text-[11px] text-gray-500 leading-snug">
                  * Please note there is a surcharge of {countries} subjected to each passenger.
                </p>
              );
            })()}
          </div>
        )}

        {/* Price Band — ID Traveller (fixed per-person range, on request) */}
        {!isCabotageRestricted(flight.depCountry, flight.arrCountry) && isIdTraveller(role) && (
          <div className="border-t border-gray-800 bg-[#111827]/30 px-6 py-5 sm:px-10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Price per person
              </span>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-bold text-[#d4af37]">
                  {ID_TRAVELLER_PRICE} €
                </span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-500 leading-snug">
              * Price may be adjusted for incoming luxury tax depending on country.
            </p>
          </div>
        )}


        {/* Flight Number */}
        <div className="border-t border-gray-800 px-6 py-3 sm:px-10">
          <span className="text-xs uppercase tracking-wider text-gray-600">
            Flight {flight.flightNo}
          </span>
        </div>
      </div>

      {/* Inquiry Form */}
      {isCabotageRestricted(flight.depCountry, flight.arrCountry) ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 sm:p-8">
          <h3 className="mb-1 text-xl font-bold text-white">
            Not Available for Booking
          </h3>
          <p className="text-sm text-gray-400">
            Due to cabotage regulations, domestic flights within this country cannot be offered for charter.
            Please browse our other available empty legs for international routes.
          </p>
          <Link
            href="/flights"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Other Flights
          </Link>
        </div>
      ) : (
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 sm:p-8">
        <h3 className="mb-1 text-xl font-bold text-white">
          Inquire About This Flight
        </h3>
        <p className="mb-6 text-sm text-gray-400">
          Please contact us or write us an email to the following address.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="tel:+4961718986402"
            className="inline-flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3 text-sm font-medium text-white transition-colors hover:border-[#c9a96e]/40 hover:bg-gray-800"
          >
            <Phone className="h-4 w-4 flex-shrink-0 text-[#c9a96e]" />
            +49 617 189 864 02
          </a>
          <a
            href="mailto:fly@hypejets.com"
            className="inline-flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3 text-sm font-medium text-white transition-colors hover:border-[#c9a96e]/40 hover:bg-gray-800"
          >
            <Mail className="h-4 w-4 flex-shrink-0 text-[#c9a96e]" />
            fly@hypejets.com
          </a>
        </div>
      </div>
      )}
    </div>
  );
}

/** Small helper component for the detail cells */
function DetailCell({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-gray-900/60 px-5 py-4 ${className}`}>
      <div className="mb-1 flex items-center gap-1.5 text-gray-500">{icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
