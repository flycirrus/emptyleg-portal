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

    // ── 1. GraphQL Introspection: find ALL available fields on emptyLegList ───
    const introspectionQuery = `
      query {
        __type(name: "EmptyLeg") {
          name
          fields {
            name
            type { name kind ofType { name kind } }
          }
        }
      }
    `;

    let schemaFields: string[] = [];
    try {
      const introResp = await fetch(`${LEON_API_URL}/api/graphql/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ query: introspectionQuery }),
      });
      const introJson = await introResp.json();
      schemaFields = (introJson.data?.__type?.fields ?? []).map(
        (f: { name: string }) => f.name
      );
    } catch {
      // Introspection might be disabled — continue without it
    }

    // ── 2. Main query: include all known potential status/cancellation fields ──
    // We try to include any field that might indicate the flight was cancelled.
    // Unknown fields will cause a GraphQL error — we catch and retry without them.
    const tryQuery = (extraFields: string) => `
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
            endAirport   { code { iata icao } city country }
            acft { registration acftType { iCAO } paxCapacity }
            dist
            ${extraFields}
          }
        }
      }
    `;

    // Common status/cancellation fields used by Leon and similar aviation systems
    const candidateFields = [
      "status",
      "isCancelled",
      "cancelled",
      "isConfirmed",
      "isOption",
      "flightStatus",
      "statusCode",
      "isActive",
      "isDeleted",
      "type",
      "legType",
    ];

    let leonFlights: Record<string, unknown>[] = [];
    let usedFields: string[] = [];

    // Try with all candidate fields first
    const fullResp = await fetch(`${LEON_API_URL}/api/graphql/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authToken },
      body: JSON.stringify({ query: tryQuery(candidateFields.join("\n            ")) }),
    });
    const fullJson = await fullResp.json();

    if (!fullJson.errors) {
      // All fields worked
      leonFlights = fullJson.data?.aircraftAvailability?.emptyLegList ?? [];
      usedFields = candidateFields;
    } else {
      // Some fields are unknown — fall back to base query and note which worked
      const baseResp = await fetch(`${LEON_API_URL}/api/graphql/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ query: tryQuery("") }),
      });
      const baseJson = await baseResp.json();
      leonFlights = baseJson.data?.aircraftAvailability?.emptyLegList ?? [];
      usedFields = [];
    }

    // Get all future flights from the DB
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

    const leonIds = new Set(leonFlights.map((f) => String(f.flightNid)));

    // Mark which DB flights are missing from Leon
    const dbWithStatus = dbFlights.map((f) => ({
      ...f,
      presentInLeon: leonIds.has(f.leonFlightId),
    }));

    const missingFromLeon = dbWithStatus.filter((f) => !f.presentInLeon);

    return Response.json({
      leonFlightCount: leonFlights.length,
      dbFlightCount: dbFlights.length,
      missingFromLeonCount: missingFromLeon.length,
      // What fields Leon's schema exposes (from introspection)
      schemaFields,
      // Which extra fields we successfully queried
      usedFields,
      // Full raw Leon data per flight — look here for status/cancelled fields!
      leonFlightsRaw: leonFlights,
      // Spotlight: raw data for any NCE→GVA flight found in Leon
      nceGvaInLeon: leonFlights.filter((f) => {
        const dep = (f.startAirport as {code:{iata:string}})?.code?.iata?.toUpperCase();
        const arr = (f.endAirport as {code:{iata:string}})?.code?.iata?.toUpperCase();
        return dep === "NCE" && arr === "GVA";
      }),
      // Simplified view for the UI
      leonFlights: leonFlights.map((f) => ({
        flightNid: f.flightNid,
        flightNo: f.flightNo,
        startTimeUTC: f.startTimeUTC,
        route: `${(f.startAirport as {code:{iata:string}}).code.iata} → ${(f.endAirport as {code:{iata:string}}).code.iata}`,
        from: (f.startAirport as {city:string}).city,
        to: (f.endAirport as {city:string}).city,
        // Include any extra fields we found
        ...(usedFields.length > 0
          ? Object.fromEntries(usedFields.map((field) => [field, f[field] ?? null]))
          : {}),
      })),

      dbFlights: dbWithStatus,
      missingFromLeon,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Force-purge all flights that are NOT in Leon's current response
export async function POST() {
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
    const leonFlights: { flightNid: string }[] = json.data?.aircraftAvailability?.emptyLegList ?? [];
    const activeLeonIds = new Set(leonFlights.map((f) => String(f.flightNid)));

    // Find all future flights in DB
    const dbFlights = await prisma.flight.findMany({
      where: { depDatetimeUtc: { gte: new Date() } },
      select: {
        id: true,
        leonFlightId: true,
        flightNo: true,
        depAirportIata: true,
        arrAirportIata: true,
        depCity: true,
        arrCity: true,
        isVisible: true,
        inquiries: { select: { id: true } },
      },
    });

    // Find flights in DB that are NOT in Leon's current response
    const staleFlights = dbFlights.filter((f) => !activeLeonIds.has(f.leonFlightId));

    if (staleFlights.length === 0) {
      return Response.json({ purged: 0, message: "No stale flights found — all DB flights are present in Leon." });
    }

    const staleIds = staleFlights.map((f) => f.id);

    // Hide all stale flights
    await prisma.flight.updateMany({
      where: { id: { in: staleIds }, isVisible: true },
      data: { isVisible: false },
    });

    // Hard-delete stale flights with no inquiries
    const staleNoInquiries = staleFlights
      .filter((f) => f.inquiries.length === 0)
      .map((f) => f.id);

    if (staleNoInquiries.length > 0) {
      await prisma.flight.deleteMany({
        where: { id: { in: staleNoInquiries } },
      });
    }

    return Response.json({
      purged: staleFlights.length,
      deleted: staleNoInquiries.length,
      hidden: staleIds.length - staleNoInquiries.length,
      removedFlights: staleFlights.map((f) => ({
        leonFlightId: f.leonFlightId,
        route: `${f.depAirportIata} → ${f.arrAirportIata}`,
        from: f.depCity,
        to: f.arrCity,
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
