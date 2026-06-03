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

// All scalar/simple fields known from Leon's EmptyLeg schema
// (object fields like acft, startAirport etc. are queried with sub-selections)
const ALL_SCALAR_FIELDS = [
  "flightNid",
  "quoteRealizationLegNid",
  "isSimulator",
  "isCommercial",
  "dispatchOperator",
  "ownerLogin",
  "flightNo",
  "arcid",
  "dist",
  "distGcd",
  "cmt",
  "isWbOutsideLeon",
  "isWbOk",
  "isStandardPaxWeights",
  "isActualCrewWeights",
  "rotationTime",
  "sentForBilling",
  "taxiIn",
  "taxiOut",
  "blockFuel",
  "tripNid",
  "isConfirmed",
  "isAoc",
  "oprNid",
  "isActive",
  "isCnl",
  "startTime",
  "endTime",
  "duration",
  "acftNid",
  "acftTypeId",
  "dbStartNid",
  "dbEndNid",
  "flightType",
  "flightRules",
  "icaoType",
  "status",
  "planCargoWeightUnit",
  "planCargo",
  "iconType",
  "isFerry",
  "passengerListCount",
  "passengerListInfantCount",
  "acftVirtual",
  "acftVirtualNid",
  "startTimeUTC",
  "endTimeUTC",
  "startTimeBase",
  "endTimeBase",
  "startTimeLocal",
  "endTimeLocal",
  "isTimesToBeConfirmed",
  "salesDotColor",
  "flightLastModificationTime",
  "crewLastModificationTime",
  "flightConfirmationTime",
  "passengerListLastModificationTime",
  "isJourneyLogClosed",
  "foreFlightId",
  "externalId",
  "iataServiceType",
  "legNumber",
  "activeLegNumber",
];

// Build a query that tries ALL scalar fields, plus known object fields with sub-selections
function buildFullQuery(startDate: string, endDate: string): string {
  return `
    query {
      aircraftAvailability {
        emptyLegList(
          startTime: "${startDate}"
          endTime: "${endDate}"
        ) {
          ${ALL_SCALAR_FIELDS.join("\n          ")}
          acft { registration acftType { iCAO name } paxCapacity }
          startAirport { code { iata icao } city country }
          endAirport { code { iata icao } city country }
          altAirport { code { iata icao } city country }
          operator { name code }
          aoc { name }
          trip { nid name }
          colors { background text border }
          ops { nid name }
        }
      }
    }
  `;
}

// Build a query for a single specific flight by flightNid
// Leon's emptyLegList doesn't support filtering by ID directly, but we can
// request a very wide window and filter client-side — OR use the leg query if available.
// We'll also try the `leg` query type directly.
function buildSingleLegQuery(flightNid: string): string {
  return `
    query {
      leg(nid: ${flightNid}) {
        ${ALL_SCALAR_FIELDS.join("\n        ")}
        acft { registration acftType { iCAO name } paxCapacity }
        startAirport { code { iata icao } city country }
        endAirport { code { iata icao } city country }
        operator { name code }
        aoc { name }
        trip { nid name }
        ops { nid name }
        passengerList { firstName lastName paxType }
        crewMemberList { firstName lastName }
        notes { ops sales crew pax }
      }
    }
  `;
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

    // ── 1. GraphQL Introspection ──────────────────────────────────────────────
    let schemaFields: string[] = [];
    try {
      const introResp = await fetch(`${LEON_API_URL}/api/graphql/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({
          query: `query { __type(name: "EmptyLeg") { name fields { name type { name kind ofType { name kind } } } } }`,
        }),
      });
      const introJson = await introResp.json();
      schemaFields = (introJson.data?.__type?.fields ?? []).map((f: { name: string }) => f.name);
    } catch { /* introspection disabled */ }

    // ── 2. Specific flight lookup: ID 70435186 (BROKLAO→MADRID) ──────────────
    let specificFlight: Record<string, unknown> | null = null;
    let specificFlightError: string | null = null;
    let specificFlightRawResponse: unknown = null;

    // Try the `leg` query type first (direct by NID)
    const singleQuery = buildSingleLegQuery("70435186");
    try {
      const singleResp = await fetch(`${LEON_API_URL}/api/graphql/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ query: singleQuery }),
      });
      const singleJson = await singleResp.json();
      specificFlightRawResponse = singleJson;

      if (singleJson.errors) {
        specificFlightError = `leg query errors: ${singleJson.errors.map((e: { message: string }) => e.message).join("; ")}`;
      } else {
        specificFlight = singleJson.data?.leg ?? null;
      }
    } catch (err) {
      specificFlightError = err instanceof Error ? err.message : "Unknown error on leg query";
    }

    // ── 3. Full emptyLegList with ALL fields ──────────────────────────────────
    let leonFlights: Record<string, unknown>[] = [];
    let queryErrors: string[] = [];

    const fullQuery = buildFullQuery(startDate, endDate);
    const fullResp = await fetch(`${LEON_API_URL}/api/graphql/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authToken },
      body: JSON.stringify({ query: fullQuery }),
    });
    const fullJson = await fullResp.json();

    if (!fullJson.errors) {
      leonFlights = fullJson.data?.aircraftAvailability?.emptyLegList ?? [];
    } else {
      // Some fields caused errors — collect them and retry with only safe base fields
      queryErrors = fullJson.errors.map((e: { message: string }) => e.message);

      // Fallback: try ONE field at a time to discover which ones work
      // For now, fall back to a minimal safe query
      const safeFields = ["flightNid", "flightNo", "startTimeUTC", "endTimeUTC",
        "dist", "isActive", "isCnl", "isConfirmed", "isCommercial", "isFerry",
        "status", "flightType", "startTime", "endTime", "duration", "legNumber"];
      const safeQuery = `
        query {
          aircraftAvailability {
            emptyLegList(startTime: "${startDate}" endTime: "${endDate}") {
              ${safeFields.join("\n              ")}
              acft { registration acftType { iCAO } paxCapacity }
              startAirport { code { iata icao } city country }
              endAirport { code { iata icao } city country }
            }
          }
        }
      `;
      const safeResp = await fetch(`${LEON_API_URL}/api/graphql/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ query: safeQuery }),
      });
      const safeJson = await safeResp.json();
      leonFlights = safeJson.data?.aircraftAvailability?.emptyLegList ?? [];
    }

    // ── 4. Also find the specific flight in the emptyLegList response ─────────
    const targetInList = leonFlights.find((f) => String(f.flightNid) === "70435186") ?? null;

    // ── 5. DB comparison ──────────────────────────────────────────────────────
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
    const dbWithStatus = dbFlights.map((f) => ({
      ...f,
      presentInLeon: leonIds.has(f.leonFlightId),
    }));
    const missingFromLeon = dbWithStatus.filter((f) => !f.presentInLeon);

    return Response.json({
      leonFlightCount: leonFlights.length,
      dbFlightCount: dbFlights.length,
      missingFromLeonCount: missingFromLeon.length,
      schemaFields,
      queryErrors,

      // ── Target flight 70435186 ──
      targetFlightId: "70435186",
      // From direct `leg` query (full properties)
      specificFlight,
      specificFlightError,
      specificFlightRawResponse,
      // Whether it appears in the emptyLegList
      targetInEmptyLegList: targetInList,
      targetFoundInEmptyLegList: targetInList !== null,

      // ── Full list ──
      leonFlightsRaw: leonFlights,
      leonFlights: leonFlights.map((f) => ({
        flightNid: f.flightNid,
        flightNo: f.flightNo,
        startTimeUTC: f.startTimeUTC,
        isActive: f.isActive ?? null,
        isCnl: f.isCnl ?? null,
        isConfirmed: f.isConfirmed ?? null,
        status: f.status ?? null,
        flightType: f.flightType ?? null,
        route: `${(f.startAirport as { code: { iata: string } })?.code?.iata ?? "?"} → ${(f.endAirport as { code: { iata: string } })?.code?.iata ?? "?"}`,
        from: (f.startAirport as { city: string })?.city ?? "",
        to: (f.endAirport as { city: string })?.city ?? "",
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
          emptyLegList(startTime: "${startDate}" endTime: "${endDate}") {
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

    const staleFlights = dbFlights.filter((f) => !activeLeonIds.has(f.leonFlightId));

    if (staleFlights.length === 0) {
      return Response.json({ purged: 0, message: "No stale flights found — all DB flights are present in Leon." });
    }

    const staleIds = staleFlights.map((f) => f.id);

    await prisma.flight.updateMany({
      where: { id: { in: staleIds }, isVisible: true },
      data: { isVisible: false },
    });

    const staleNoInquiries = staleFlights
      .filter((f) => f.inquiries.length === 0)
      .map((f) => f.id);

    if (staleNoInquiries.length > 0) {
      await prisma.flight.deleteMany({ where: { id: { in: staleNoInquiries } } });
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
