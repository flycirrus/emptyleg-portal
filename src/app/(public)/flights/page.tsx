"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Calendar, Plane, Users, Loader2, X, Filter } from "lucide-react";
import FlightCard from "@/components/public/FlightCard";
import { isIdTraveller } from "@/lib/utils";
import type { FlightPublic } from "@/types";

interface FlightsResponse {
  flights: FlightPublic[];
  canViewPrices: boolean;
  role?: string;
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<FlightPublic[]>([]);
  const [canViewPrices, setCanViewPrices] = useState(false);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [minSeats, setMinSeats] = useState("");

  // Distinct aircraft types for dropdown
  const [aircraftTypes, setAircraftTypes] = useState<string[]>([]);

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (aircraftType) params.set("aircraftType", aircraftType);
      if (minSeats) params.set("minSeats", minSeats);

      const queryString = params.toString();
      const url = `/api/flights${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please sign in to view available flights.");
        }
        if (res.status === 403) {
          throw new Error(
            "Your account is pending approval. Please wait for an administrator to activate your access."
          );
        }
        throw new Error("Failed to load flights. Please try again.");
      }

      const data: FlightsResponse = await res.json();
      setFlights(data.flights);
      setCanViewPrices(data.canViewPrices);
      setRole(data.role || "");

      // Build distinct aircraft types list from unfiltered results
      if (!aircraftType) {
        const types = [
          ...new Set(data.flights.map((f) => f.aircraftType)),
        ].sort();
        setAircraftTypes((prev) => {
          // Merge to keep types from previous full fetches
          const merged = [...new Set([...prev, ...types])].sort();
          return merged;
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, aircraftType, minSeats]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchFlights();
    }, 300);

    return () => clearTimeout(debounce);
  }, [fetchFlights]);

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setAircraftType("");
    setMinSeats("");
  };

  const hasActiveFilters =
    search || dateFrom || dateTo || aircraftType || minSeats;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8 sm:pb-8">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Available Empty Legs
        </h1>
      </div>

      {/* Mobile Filter Toggle (Docked Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-800 bg-[#0a0a0a]/95 p-4 backdrop-blur-md sm:hidden">
        <button
          onClick={() => setShowMobileFilters(true)}
          className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gray-800 py-3.5 text-sm font-semibold text-white transition-transform active:scale-95"
        >
          <Filter className="h-4 w-4 text-[#c9a96e]" />
          Filter Flights
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#c9a96e] text-xs font-bold text-black">
              !
            </span>
          )}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {showMobileFilters && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm sm:hidden"
          onClick={() => setShowMobileFilters(false)}
        />
      )}

      {/* Filter Bar / Modal */}
      <div
        className={`
          ${
            showMobileFilters
              ? "fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-gray-800 bg-gray-900 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:bottom-auto sm:translate-y-0"
              : "hidden sm:block"
          }
          sm:sticky sm:inset-auto sm:top-20 sm:z-40 sm:mb-8 sm:max-h-none sm:overflow-visible sm:rounded-xl sm:border sm:border-gray-800 sm:bg-gray-900/95 sm:p-6 sm:shadow-2xl sm:backdrop-blur-sm
        `}
      >
        {/* Mobile Header */}
        {showMobileFilters && (
          <div className="mb-6 flex items-center justify-between sm:hidden">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="City or airport..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
            />
          </div>

          <div className="flex flex-col gap-4 sm:contents">
            {/* Date From */}
            <div className="relative w-full">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-3 text-sm text-white transition-colors focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e] [color-scheme:dark]"
                placeholder="From"
              />
            </div>

            {/* Date To */}
            <div className="relative w-full">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-9 pr-3 text-sm text-white transition-colors focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e] [color-scheme:dark]"
                placeholder="To"
              />
            </div>
          </div>

          {/* Aircraft Type */}
          <div className="relative">
            <Plane className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <select
              value={aircraftType}
              onChange={(e) => setAircraftType(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-8 text-sm text-white transition-colors focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
            >
              <option value="">All Aircraft</option>
              {aircraftTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Min Seats */}
          <div className="relative">
            <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="number"
              min="1"
              placeholder="Min seats"
              value={minSeats}
              onChange={(e) => setMinSeats(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
            />
          </div>
        </div>

        {/* Action Buttons for Mobile */}
        {showMobileFilters && (
          <div className="mt-6 sm:hidden">
            <button
              onClick={() => setShowMobileFilters(false)}
              className="w-full rounded-lg bg-[#c9a96e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#b0935d]"
            >
              Show Results
            </button>
          </div>
        )}

        {/* Active Filter Indicator (Desktop / Mobile combined state) */}
        {hasActiveFilters && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
            <p className="text-sm text-gray-400">
              {loading
                ? "Searching..."
                : `${flights.length} flight${flights.length !== 1 ? "s" : ""} found`}
            </p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a96e]" />
          <p className="mt-4 text-sm text-gray-400">Loading flights...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-900/50 bg-red-950/20 py-16">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchFlights}
            className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
          >
            Try Again
          </button>
        </div>
      ) : flights.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900/40 py-20">
          <Plane className="h-12 w-12 text-gray-700" />
          <p className="mt-4 text-lg font-medium text-gray-400">
            No flights available matching your criteria
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {flights.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              showPrice={canViewPrices}
              idTraveller={isIdTraveller(role)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
