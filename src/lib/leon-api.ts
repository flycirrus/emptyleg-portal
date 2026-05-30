import { prisma } from "./prisma";
import { calculatePrice, getPricingConfig, getActiveSurcharges } from "./pricing";

const LEON_API_URL = process.env.LEON_API_URL || "https://HYP.leon.aero";

interface LeonFlight {
  flightNid: string;
  flightNo: string;
  startTimeUTC: string;
  endTimeUTC: string;
  acft: {
    registration: string;
    acftType: { iCAO: string; name: string };
    paxCapacity: number;
  };
  startAirport: {
    code: { icao: string; iata: string };
    country: string;
    city: string;
  };
  endAirport: {
    code: { icao: string; iata: string };
    country: string;
    city: string;
  };
  dist: number;
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${LEON_API_URL}/access_token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `refresh_token=${refreshToken}`,
  });

  if (!response.ok) {
    throw new Error(`Leon auth failed: ${response.status}`);
  }

  const token = await response.text();
  return `Bearer ${token}`;
}

async function fetchEmptyLegs(authToken: string): Promise<LeonFlight[]> {
  const now = new Date();
  const end = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const startDate = now.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  const query = `
    query {
      aircraftAvailability {
        emptyLegList(
          startTime: "${startDate}"
          endTime: "${endDate}"
        ) {
          flightNo
          startTimeUTC
          endTimeUTC
          flightNid
          acft {
            registration
            acftType {
              iCAO
              name
            }
            paxCapacity
          }
          startAirport {
            code { icao iata }
            country
            city
          }
          endAirport {
            code { icao iata }
            country
            city
          }
          dist
        }
      }
    }
  `;

  const response = await fetch(`${LEON_API_URL}/api/graphql/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authToken,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Leon API error: ${response.status}`);
  }

  const json = await response.json();
  return json.data.aircraftAvailability.emptyLegList;
}

export async function syncFlights(): Promise<{
  synced: number;
  error?: string;
}> {
  const syncLog = await prisma.syncLog.create({
    data: { status: "RUNNING" },
  });

  try {
    const apiConfig = await prisma.apiConfig.findFirst();
    const refreshToken =
      apiConfig?.leonRefreshToken || process.env.LEON_REFRESH_TOKEN;

    if (!refreshToken) {
      throw new Error("No Leon refresh token configured");
    }

    const authToken = await getAccessToken(refreshToken);
    const flights = await fetchEmptyLegs(authToken);
    const pricingConfig = await getPricingConfig();
    const surcharges = await getActiveSurcharges();

    let synced = 0;
    for (const flight of flights) {
      const price = calculatePrice(
        flight.dist,
        pricingConfig,
        flight.startAirport.country,
        flight.endAirport.country,
        surcharges
      );

      await prisma.flight.upsert({
        where: { leonFlightId: String(flight.flightNid) },
        update: {
          flightNo: flight.flightNo,
          depDatetimeUtc: new Date(flight.startTimeUTC),
          aircraftType: flight.acft.acftType.iCAO,
          depAirportIata: flight.startAirport.code.iata,
          depAirportIcao: flight.startAirport.code.icao,
          depCity: flight.startAirport.city,
          depCountry: flight.startAirport.country,
          arrAirportIata: flight.endAirport.code.iata,
          arrAirportIcao: flight.endAirport.code.icao,
          arrCity: flight.endAirport.city,
          arrCountry: flight.endAirport.country,
          distanceNm: flight.dist,
          paxCapacity: flight.acft.paxCapacity,
          calculatedPrice: price,
          syncedAt: new Date(),
        },
        create: {
          leonFlightId: String(flight.flightNid),
          flightNo: flight.flightNo,
          depDatetimeUtc: new Date(flight.startTimeUTC),
          aircraftType: flight.acft.acftType.iCAO,
          depAirportIata: flight.startAirport.code.iata,
          depAirportIcao: flight.startAirport.code.icao,
          depCity: flight.startAirport.city,
          depCountry: flight.startAirport.country,
          arrAirportIata: flight.endAirport.code.iata,
          arrAirportIcao: flight.endAirport.code.icao,
          arrCity: flight.endAirport.city,
          arrCountry: flight.endAirport.country,
          distanceNm: flight.dist,
          paxCapacity: flight.acft.paxCapacity,
          calculatedPrice: price,
          syncedAt: new Date(),
        },
      });
      synced++;
    }

    // Remove flights that departed in the past
    await prisma.flight.deleteMany({
      where: { depDatetimeUtc: { lt: new Date() } },
    });

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "SUCCESS", flightsSynced: synced, completedAt: new Date() },
    });

    return { synced };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
    });
    return { synced: 0, error: message };
  }
}
