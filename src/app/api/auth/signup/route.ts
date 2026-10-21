// Self-registration is CLOSED. Accounts are created by an admin only
// (Admin -> Users, or the create_users.ts seed script). This endpoint used to
// create users and was abused by scanners (e.g. "pj-assessment"), so it now
// rejects every request outright. Keep it returning a clean 403 so any old
// client still gets a sensible message instead of a crash.
export async function POST() {
  return Response.json(
    { error: "Registration is closed. Please contact fly@hypejets.com." },
    { status: 403 }
  );
}
