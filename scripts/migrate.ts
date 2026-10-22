import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Client } from "pg";

/**
 * Versioned database migration runner.
 *
 * Migrations live in `migrations/` as ordered, numbered SQL files
 * (e.g. `0001_create_users.sql`, `0002_add_orders.sql`). Each applied
 * migration is recorded in the `schema_migrations` tracking table so that
 * runs are idempotent and repeatable across dev, test, and production.
 *
 * Migrations are NEVER run automatically at application startup. They must
 * be invoked explicitly via this script (e.g. `npm run migrate`).
 */

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

interface MigrationFile {
  version: string;
  name: string;
  path: string;
}

interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
}

function loadMigrationFiles(): MigrationFile[] {
  let entries: string[];
  try {
    entries = readdirSync(MIGRATIONS_DIR);
  } catch {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const files = entries
    .filter((file) => file.endsWith(".sql"))
    .map((file) => {
      const match = /^(\d+)[_-](.+)\.sql$/.exec(file);
      if (!match) {
        throw new Error(
          `Invalid migration filename "${file}". Expected <version>_<name>.sql`,
        );
      }
      return {
        version: match[1],
        name: match[2],
        path: join(MIGRATIONS_DIR, file),
      };
    })
    .sort((a, b) => a.version.localeCompare(b.version));

  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.version)) {
      throw new Error(`Duplicate migration version: ${file.version}`);
    }
    seen.add(file.version);
  }

  return files;
}

function checksum(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

async function ensureTrackingTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(
  client: Client,
): Promise<Map<string, AppliedMigration>> {
  const result = await client.query<AppliedMigration>(
    "SELECT version, name, checksum FROM schema_migrations ORDER BY version",
  );
  return new Map(result.rows.map((row) => [row.version, row]));
}

async function runMigrations(client: Client): Promise<void> {
  await ensureTrackingTable(client);
  const applied = await getAppliedMigrations(client);
  const files = loadMigrationFiles();

  for (const file of files) {
    const sql = readFileSync(file.path, "utf8");
    const sum = checksum(sql);
    const existing = applied.get(file.version);

    if (existing) {
      if (existing.checksum !== sum) {
        throw new Error(
          `Migration ${file.version}_${file.name} has changed since it was applied. ` +
            "Create a new migration instead of editing an applied one.",
        );
      }
      continue;
    }

    console.log(`Applying migration ${file.version}_${file.name}...`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
        [file.version, file.name, sum],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("Migrations up to date.");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required to run migrations.");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await runMigrations(client);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
