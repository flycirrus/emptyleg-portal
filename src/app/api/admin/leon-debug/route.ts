import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return session;
}

const LEON_API_URL = process.env.LEON_API_URL || "https://HYP.leon.aero";

async function getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${LEON_API_URL}/access_token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `refresh_token=${refreshToken}`,
  });
  const raw = await response.text();
  try {
    const json = JSON.parse(raw);
    const token = json.access_token || json.token || json.accessToken;
    if (token) return `Bearer ${token}`;
  } catch { /* not JSON */ }
  return `Bearer ${raw.trim()}`;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiConfig = await prisma.apiConfig.findFirst();
    const refreshToken = apiConfig?.leonRefreshToken || process.env.LEON_REFRESH_TOKEN;

    if (!refreshToken) {
      return Response.json({ error: "No Leon refresh token configured" }, { status: 500 });
    }

    const authToken = await getAccessToken(refreshToken);

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
            flightNid
            flightNo
            startTimeUTC
            endTimeUTC
            startAirport { code { iata icao } city country }
            endAirport { code { iata icao } city country }
            acft { registration acftType { iCAO } paxCapacity }
            dist
          }
        }
      }
    `;

    const response = await fetch(`${LEON_API_URL}/api/graphql/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authToken },
      body: JSON.stringify({ query }),
    });

    const json = await response.json();
    const leonFlights = json.data?.aircraftAvailability?.emptyLegList ?? [];

    // Also get what's currently in the DB (future, visible)
    const dbFlights = await prisma.flight.findMany({
      where: { depDatetimeUtc: { gte: new Date() } },
      select: {
        id: true,
        leonFlightId: true,
        flightNo: true,
        depDatetimeUtc: true,
        depAirportIata: true,
        arrAirportIata: true,
        depCity: true,
        arrCity: true,
        isVisible: true,
        syncedAt: true,
      },
      orderBy: { depDatetimeUtc: "asc" },
    });

    const leonIds = new Set(leonFlights.map((f: { flightNid: string }) => String(f.flightNid)));

    // Mark which DB flights are missing from Leon
    const dbWithStatus = dbFlights.map((f) => ({
      ...f,
      presentInLeon: leonIds.has(f.leonFlightId),
    }));

    return Response.json({
      leonFlightCount: leonFlights.length,
      dbFlightCount: dbFlights.length,
      leonFlights: leonFlights.map((f: {
        flightNid: string;
        flightNo: string;
        startTimeUTC: string;
        startAirport: { code: { iata: string }; city: string };
        endAirport: { code: { iata: string }; city: string };
      }) => ({
        flightNid: f.flightNid,
        flightNo: f.flightNo,
        startTimeUTC: f.startTimeUTC,
        route: `${f.startAirport.code.iata} → ${f.endAirport.code.iata}`,
        from: f.startAirport.city,
        to: f.endAirport.city,
      })),
      dbFlights: dbWithStatus,
      missingFromLeon: dbWithStatus.filter((f) => !f.presentInLeon),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
