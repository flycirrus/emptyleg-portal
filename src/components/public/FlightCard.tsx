"use client";

import Link from "next/link";
import { Plane, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import type { FlightPublic } from "@/types";

interface FlightCardProps {
  flight: FlightPublic;
  showPrice: boolean;
}

function formatUtcTime(utcDateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(utcDateStr));
}

export default function FlightCard({ flight, showPrice }: FlightCardProps) {
  const utcTime = formatUtcTime(flight.depDatetimeUtc);

  return (
    <Link
      href={`/flights/${flight.id}`}
      className="group flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900/60 px-5 py-4 transition-all duration-200 hover:border-[#c9a96e]/40 hover:bg-gray-800/50 hover:shadow-lg hover:shadow-[#c9a96e]/5 sm:flex-row sm:items-center"
    >
      {/* Route: Departure → Arrival */}
      <div className="flex flex-col justify-center sm:min-w-[240px]">
        {/* IATA Codes and Plane */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-[#c9a96e]">{flight.depAirportIata}</span>
          <div className="flex items-center gap-1.5 text-gray-500">
            <div className="h-px w-6 bg-gray-700" />
            <Plane className="h-4 w-4 text-[#c9a96e]" />
            <div className="h-px w-6 bg-gray-700" />
          </div>
          <span className="text-lg font-bold text-[#c9a96e]">{flight.arrAirportIata}</span>
        </div>
        {/* City Names */}
        <p className="mt-0.5 text-base font-semibold text-white truncate max-w-[280px]">
          {flight.depCity} <span className="mx-1 text-gray-500 font-normal">-</span> {flight.arrCity}
        </p>
      </div>

      {/* Date & Local Time */}
      <div className="flex items-center gap-4 text-sm text-gray-400 sm:min-w-[200px]">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <span>{formatDate(flight.depDatetimeUtc)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <span className="whitespace-nowrap">
            {utcTime}{" "}
            <span className="text-xs text-gray-500">UTC</span>
          </span>
        </div>
      </div>

      {/* Aircraft, Flight No & Seats */}
      <div className="flex flex-wrap items-center gap-3 sm:min-w-[180px]">
        <span className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300">
          {flight.aircraftType}
        </span>
        {flight.flightNo && (
          <span className="rounded-full border border-gray-700 bg-gray-800/50 px-2.5 py-0.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
            {flight.flightNo}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <Users className="h-3.5 w-3.5 text-gray-500" />
          <span>{flight.paxCapacity}</span>
        </div>
      </div>

      {/* Price */}
      <div className="sm:ml-auto sm:min-w-[100px] sm:text-right">
        {showPrice && flight.calculatedPrice != null ? (
          <div className="flex flex-col items-end">
            <p className="text-xl font-bold text-[#d4af37]">
              {formatPrice(flight.calculatedPrice)}
            </p>
            {flight.estimatedTaxPerPax && flight.estimatedTaxPerPax > 0 ? (
              <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                + {formatPrice(flight.estimatedTaxPerPax)} Luxury Tax / pax
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm italic text-gray-500">Price on request</p>
        )}
      </div>

      {/* CTA */}
      <span className="flex items-center justify-center gap-1.5 rounded-lg bg-[#c9a96e]/10 px-4 py-2 text-sm font-medium text-[#c9a96e] transition-colors group-hover:bg-[#c9a96e]/20 sm:ml-2">
        Inquire
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
