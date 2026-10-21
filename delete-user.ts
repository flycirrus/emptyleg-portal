/**
 * One-off cleanup: remove every user whose email OR name contains a term.
 *
 * Usage (run against PRODUCTION):
 *   DATABASE_URL="postgres://<prod-connection-string>" npx tsx delete-user.ts
 *   DATABASE_URL="postgres://..." npx tsx delete-user.ts some-other-term
 *
 * Default term: pj-assessment
 * Safe to run more than once — if nothing matches it just reports that.
 */
import { Pool } from "pg";

const term = (process.argv[2] ?? "pj-assessment").toLowerCase();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL ist nicht gesetzt. Beispiel:");
    console.error('   DATABASE_URL="postgres://..." npx tsx delete-user.ts');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const like = `%${term}%`;

  const found = await pool.query(
    `SELECT id, email, name, role
       FROM "User"
      WHERE lower(email) LIKE $1
         OR lower(coalesce(name, '')) LIKE $1`,
    [like]
  );

  if (found.rows.length === 0) {
    console.log(`✅ Kein User gefunden, der "${term}" enthält. Nichts zu löschen.`);
    await pool.end();
    return;
  }

  console.log(`Gefundene User (${found.rows.length}):`);
  for (const r of found.rows) {
    console.log(
      `  - ${r.email}  (name: ${r.name ?? "–"}, role: ${r.role}, id: ${r.id})`
    );
  }

  const ids = found.rows.map((r) => r.id);

  // Verknüpfte Anfragen lösen (handledById -> NULL), damit das Löschen nicht
  // an einer Foreign-Key-Verknüpfung scheitert.
  await pool.query(
    `UPDATE "Inquiry" SET "handledById" = NULL WHERE "handledById" = ANY($1::text[])`,
    [ids]
  );

  const del = await pool.query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [
    ids,
  ]);

  console.log(`🗑️  ${del.rowCount} User gelöscht.`);
  await pool.end();
}

main().catch((e) => {
  console.error("Fehler:", e);
  process.exit(1);
});
