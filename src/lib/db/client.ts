import "server-only";

import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./schema";

/**
 * libSQL client.
 *
 * Local development writes to a file under ./data. Setting DATABASE_URL to a Turso URL
 * (plus DATABASE_AUTH_TOKEN) points the same code at a hosted database, which is what a
 * deploy needs — Vercel's filesystem is read-only.
 */

const DEFAULT_URL = "file:./data/tih.db";

declare global {
  // Reused across hot reloads in dev; without this every edit opens a new connection.
  var __tihDb: { client: Client; ready: Promise<void> } | undefined;
}

function create(): { client: Client; ready: Promise<void> } {
  const url = process.env.DATABASE_URL ?? DEFAULT_URL;

  if (url.startsWith("file:")) {
    // libSQL creates the file but not the directory above it.
    mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), { recursive: true });
  }

  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  return { client, ready: migrate(client) };
}

async function migrate(client: Client): Promise<void> {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`,
  );

  const applied = new Set(
    (await client.execute("SELECT name FROM _migrations")).rows.map((r) => String(r.name)),
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    // batch() is transactional — a migration either lands completely or not at all.
    await client.batch(
      [
        ...migration.statements,
        {
          sql: "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
          args: [migration.name, new Date().toISOString()],
        },
      ],
      "write",
    );
  }
}

/** The migrated client. Every query path goes through here, so migrations cannot be skipped. */
export async function db(): Promise<Client> {
  const instance = (globalThis.__tihDb ??= create());
  await instance.ready;
  return instance.client;
}
