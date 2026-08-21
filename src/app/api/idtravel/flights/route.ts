import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// PUBLIC endpoint for the "ID Traveller" landing page (idtravel.hypejets.com).
// No authentication required. It NEVER returns real broker prices — the client
// shows the fixed ID Traveller per-person price instead. This is the deliberate
// difference from /api/flights, which is login-gated and may expose real prices.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const aircraftType = searchParams.get("aircraftType");
  const minSeats = searchParams.get("minSeats");

  const AND: Prisma.FlightWhereInput[] = [{ isVisible: true }];

  // Only upcoming flights
  const dateFilter: Prisma.FlightWhereInput["depDatetimeUtc"] = { gte: new Date() };
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo + "T23:59:59Z");
  AND.push({ depDatetimeUtc: dateFilter });

  if (search) {
    AND.push({
      OR: [
        { depCity: { contains: search } },
        { arrCity: { contains: search } },
        { depAirportIata: { contains: search } },
        { arrAirportIata: { contains: search } },
        { depCountry: { contains: search } },
        { arrCountry: { contains: search } },
      ],
    });
  }

  if (aircraftType) {
    AND.push({ aircraftType });
  }

  if (minSeats) {
    AND.push({ paxCapacity: { gte: Number(minSeats) } });
  }

  const flights = await prisma.flight.findMany({
    where: { AND },
    orderBy: { depDatetimeUtc: "asc" },
  });

  // Deliberately omit calculatedPrice / manualPrice — ID Traveller sees only the
  // fixed per-person price rendered on the client, never the real charter price.
  const result = flights.map((f: typeof flights[number]) => ({
    id: f.id,
    flightNo: f.flightNo,
    depDatetimeUtc: f.depDatetimeUtc.toISOString(),
    aircraftType: f.aircraftType,
    depAirportIata: f.depAirportIata,
    depCity: f.depCity,
    depCountry: f.depCountry,
    arrAirportIata: f.arrAirportIata,
    arrCity: f.arrCity,
    arrCountry: f.arrCountry,
    distanceNm: f.distanceNm,
    paxCapacity: f.paxCapacity,
  }));

  return Response.json({ flights: result, canViewPrices: false, idTraveller: true });
}
