import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewPrices } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role || "PENDING";

  if (role === "PENDING") {
    return Response.json({ error: "Account pending approval" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const aircraftType = searchParams.get("aircraftType");
  const maxPrice = searchParams.get("maxPrice");
  const minSeats = searchParams.get("minSeats");

  const AND: Prisma.FlightWhereInput[] = [
    { isVisible: true },
  ];

  // Date range filter
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

  if (maxPrice && canViewPrices(role)) {
    AND.push({ calculatedPrice: { lte: Number(maxPrice) } });
  }

  if (minSeats) {
    AND.push({ paxCapacity: { gte: Number(minSeats) } });
  }

  const flights = await prisma.flight.findMany({
    where: { AND },
    orderBy: { depDatetimeUtc: "asc" },
  });

  const showPrices = canViewPrices(role);

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
    ...(showPrices
      ? {
          // manualPrice overrides calculatedPrice when set by admin
          calculatedPrice: f.manualPrice ?? f.calculatedPrice,
          estimatedTaxPerPax: f.manualPrice ? null : f.estimatedTaxPerPax,
        }
      : {}),
  }));

  return Response.json({ flights: result, canViewPrices: showPrices, role });
}
