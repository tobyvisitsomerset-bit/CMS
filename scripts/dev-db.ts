// Starts a local Postgres instance for development when no system Postgres
// (or Docker) is available. Data persists in .dev-postgres-data/ (gitignored)
// across restarts. Run with `npm run dev:db`, leave it running, then use
// DATABASE_URL="postgresql://postgres:password@localhost:5433/visitsomerset"
// in .env for `npm run dev` / prisma commands in another terminal.

import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import { existsSync } from "fs";

const dataDir = path.join(process.cwd(), ".dev-postgres-data");
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "password",
  port: 5433,
  persistent: true,
  // Windows initdb defaults to the OS codepage (WIN1252) if not told otherwise,
  // which then rejects 4-byte UTF-8 chars (emoji) present in real Kentico content.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

async function main() {
  // initialise() runs initdb, which requires an empty directory — only needed
  // the very first time. On later restarts the cluster already exists.
  const alreadyInitialised = existsSync(path.join(dataDir, "PG_VERSION"));
  if (!alreadyInitialised) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("visitsomerset");
  } catch {
    // already exists
  }
  console.log("Local Postgres ready at postgresql://postgres:password@localhost:5433/visitsomerset");
  console.log("Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
