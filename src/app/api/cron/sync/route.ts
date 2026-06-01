import { syncFlights } from "@/lib/leon-api";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncFlights();

  return Response.json(result);
}

// Allow manual POST triggers as well
export async function POST(request: Request) {
  return GET(request);
}
