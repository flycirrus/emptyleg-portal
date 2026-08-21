"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plane, Loader2, X } from "lucide-react";
import FlightCard from "@/components/public/FlightCard";
import { ID_TRAVELLER_PRICE } from "@/lib/utils";
import type { FlightPublic } from "@/types";

interface IdTravellerResponse {
  flights: FlightPublic[];
}

export default function IdTravellerPage() {
  const [flights, setFlights] = useState<FlightPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const queryString = params.toString();
      const url = `/api/idtravel/flights${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load flights. Please try again.");
      }

      const data: IdTravellerResponse = await res.json();
      setFlights(data.flights);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounced fetch on search change
  useEffect(() => {
    const t = setTimeout(fetchFlights, 300);
    return () => clearTimeout(t);
  }, [fetchFlights]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero / Intro */}
      <div className="mb-8 rounded-xl border border-[#c9a96e]/30 bg-gradient-to-br from-[#111827]/70 to-[#0a0a0a] px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex items-center gap-2 text-[#c9a96e]">
          <Plane className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-widest">
            ID Traveller
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
          Empty Leg flights — {ID_TRAVELLER_PRICE} € per person
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          Browse our current empty leg availability. As an ID Traveller you fly
          for a flat rate of{" "}
          <span className="font-semibold text-[#d4af37]">
            {ID_TRAVELLER_PRICE} € per person
          </span>
          . Prices may be adjusted for incoming luxury tax depending on the
          country. Select a flight to see the details and get in touch.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by city, airport or country…"
            className="w-full rounded-lg border border-gray-800 bg-gray-900/60 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-[#c9a96e]/40 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Flight list */}
      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a96e]" />
          <p className="mt-4 text-sm text-gray-400">Loading flights…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-900/50 bg-red-950/20 py-16">
          <p className="text-red-400">{error}</p>
        </div>
      ) : flights.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900/40 py-16">
          <Plane className="h-8 w-8 text-gray-600" />
          <p className="mt-4 text-sm text-gray-400">
            No flights match your search right now.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {flights.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              showPrice={false}
              idTraveller={true}
              hrefBase="/idtravel"
            />
          ))}
        </div>
      )}
    </div>
  );
}
