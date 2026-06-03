import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LEON_API_URL = process.env.LEON_API_URL || "https://HYP.leon.aero";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return session;
}

async function getLeonFlightIds(): Promise<{ ids: Set<string>; error?: string }> {
  try {
    const apiConfig = await prisma.apiConfig.findFirst();
    const refreshToken = apiConfig?.leonRefreshToken || process.env.LEON_REFRESH_TOKEN;
    if (!refreshToken) return { ids: new Set(), error: "No Leon refresh token configured" };

    // Get access token
    const tokenRes = await fetch(`${LEON_API_URL}/access_token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `refresh_token=${refreshToken}`,
    });
    if (!tokenRes.ok) return { ids: new Set(), error: `Leon auth failed: HTTP ${tokenRes.status}` };

    const raw = await tokenRes.text();
    let authToken = "";
    try {
      const json = JSON.parse(raw);
      const t = json.access_token || json.token || json.accessToken;
      authToken = t ? `Bearer ${t}` : `Bearer ${raw.trim()}`;
    } catch {
      authToken = `Bearer ${raw.trim()}`;
    }

    // Fetch empty legs from Leon (120-day window)
    const now = new Date();
    const end = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
    const query = `
      query {
        aircraftAvailability {
          emptyLegList(
            startTime: "${now.toISOString().split("T")[0]}"
            endTime: "${end.toISOString().split("T")[0]}"
          ) {
            flightNid
          }
        }
      }
    `;

    const res = await fetch(`${LEON_API_URL}/api/graphql/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authToken },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return { ids: new Set(), error: `Leon API error: HTTP ${res.status}` };

    const json = await res.json();
    if (json.errors?.length > 0) {
      return { ids: new Set(), error: `Leon GraphQL error: ${json.errors.map((e: { message: string }) => e.message).join("; ")}` };
    }

    const list = json.data?.aircraftAvailability?.emptyLegList ?? [];
    const ids = new Set<string>(list.map((f: { flightNid: string }) => String(f.flightNid)));
    return { ids };
  } catch (err) {
    return { ids: new Set(), error: err instanceof Error ? err.message : "Unknown error fetching Leon data" };
  }
}

// GET — returns orphan flights (in DB but not in Leon)
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all future flights from DB
  const dbFlights = await prisma.flight.findMany({
    where: { depDatetimeUtc: { gte: new Date() } },
    orderBy: { depDatetimeUtc: "asc" },
    select: {
      id: true,
      leonFlightId: true,
      flightNo: true,
      depDatetimeUtc: true,
      depAirportIata: true,
      depCity: true,
      arrAirportIata: true,
      arrCity: true,
      aircraftType: true,
      isVisible: true,
      syncedAt: true,
      _count: { select: { inquiries: true } },
    },
  });

  const { ids: leonIds, error: leonError } = await getLeonFlightIds();

  const orphans = dbFlights.filter((f) => !leonIds.has(f.leonFlightId));

  return Response.json({
    totalInDb: dbFlights.length,
    totalInLeon: leonIds.size,
    orphanCount: orphans.length,
    orphans,
    leonError: leonError ?? null,
  });
}

// DELETE — removes a specific orphan flight (must have no inquiries, or force=true)
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { flightId, force } = await request.json();
  if (!flightId) return Response.json({ error: "flightId required" }, { status: 400 });

  const flight = await prisma.flight.findUnique({
    where: { id: flightId },
    include: { _count: { select: { inquiries: true } } },
  });
  if (!flight) return Response.json({ error: "Flight not found" }, { status: 404 });

  if (flight._count.inquiries > 0 && !force) {
    // Hide it instead of deleting if it has inquiries and force is not set
    await prisma.flight.update({ where: { id: flightId }, data: { isVisible: false } });
    return Response.json({ action: "hidden", message: "Flight hidden (has inquiries). Use force=true to delete." });
  }

  await prisma.flight.delete({ where: { id: flightId } });
  return Response.json({ action: "deleted" });
}

// POST — bulk remove all orphans
export async function POST() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbFlights = await prisma.flight.findMany({
    where: { depDatetimeUtc: { gte: new Date() } },
    select: {
      id: true,
      leonFlightId: true,
      _count: { select: { inquiries: true } },
    },
  });

  const { ids: leonIds, error: leonError } = await getLeonFlightIds();
  if (leonError) return Response.json({ error: leonError }, { status: 502 });

  const orphans = dbFlights.filter((f) => !leonIds.has(f.leonFlightId));
  const withInquiries = orphans.filter((f) => f._count.inquiries > 0).map((f) => f.id);
  const withoutInquiries = orphans.filter((f) => f._count.inquiries === 0).map((f) => f.id);

  // Hide those with inquiries, delete those without
  if (withInquiries.length > 0) {
    await prisma.flight.updateMany({ where: { id: { in: withInquiries } }, data: { isVisible: false } });
  }
  if (withoutInquiries.length > 0) {
    await prisma.flight.deleteMany({ where: { id: { in: withoutInquiries } } });
  }

  return Response.json({
    hidden: withInquiries.length,
    deleted: withoutInquiries.length,
    total: orphans.length,
  });
}
