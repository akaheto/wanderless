import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import { DEFAULT_PREFERENCES } from "@/lib/scoring/engine";
import { ORIGINS } from "@/lib/domain/types";
import type {
  CandidateStatus,
  Origin,
  ComparisonPreferences,
  DateFlexibility,
  PlanningStatus,
  Trip,
  TripCandidate,
  TripLink,
} from "@/lib/domain/types";

const now = () => new Date().toISOString();

/**
 * Stored as an ordered CSV. Order is the traveller's preference, so it is preserved, and
 * anything unrecognised is dropped rather than passed through to the route table.
 */
function parseOrigins(raw: string): Origin[] {
  const parsed = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is Origin => (ORIGINS as readonly string[]).includes(s));
  return parsed.length > 0 ? [...new Set(parsed)] : [...ORIGINS];
}

function toTrip(row: Row): Trip {
  return {
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status) as PlanningStatus,
    startDate: row.start_date ? String(row.start_date) : null,
    endDate: row.end_date ? String(row.end_date) : null,
    flexibility: String(row.flexibility) as DateFlexibility,
    origins: parseOrigins(String(row.origins ?? "")),
    travelers: Number(row.travelers),
    purpose: String(row.purpose),
    priorities: String(row.priorities),
    notes: String(row.notes),
    archived: Number(row.archived) === 1,
    ownerId: String(row.owner_id ?? "0"),
    permission: String(row.permission ?? "private") as "private" | "shared",
    currency: String(row.currency ?? "USD"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toCandidate(row: Row): TripCandidate {
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    destinationId: String(row.destination_id),
    status: String(row.status) as CandidateStatus,
    note: String(row.note),
    createdAt: String(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export async function listTrips(includeArchived = false): Promise<Trip[]> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM trips
          WHERE (? = 1 OR archived = 0)
          ORDER BY
            CASE WHEN start_date IS NULL THEN 1 ELSE 0 END,
            start_date ASC,
            updated_at DESC`,
    args: [includeArchived ? 1 : 0],
  });
  return result.rows.map(toTrip);
}

export async function getTrip(id: number): Promise<Trip | null> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM trips WHERE id = ?", args: [id] });
  return result.rows[0] ? toTrip(result.rows[0]) : null;
}

export interface TripInput {
  name: string;
  status: PlanningStatus;
  startDate: string | null;
  endDate: string | null;
  flexibility: DateFlexibility;
  origins: Origin[];
  travelers: number;
  purpose: string;
  priorities: string;
  notes: string;
  currency?: string;
  ownerId?: string;
}

export async function createTrip(input: TripInput): Promise<number> {
  const client = await db();
  const ts = now();
  const ownerId = input.ownerId || "0";
  const currency = input.currency || "USD";
  const result = await client.execute({
    sql: `INSERT INTO trips
            (name, status, start_date, end_date, flexibility, origins,
             travelers, purpose, priorities, notes, currency, owner_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.name,
      input.status,
      input.startDate,
      input.endDate,
      input.flexibility,
      input.origins.join(","),
      input.travelers,
      input.purpose,
      input.priorities,
      input.notes,
      currency,
      ownerId,
      ts,
      ts,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function updateTrip(id: number, input: TripInput): Promise<void> {
  const client = await db();
  const currency = input.currency || "USD";
  await client.execute({
    sql: `UPDATE trips SET
            name = ?, status = ?, start_date = ?, end_date = ?, flexibility = ?,
            origins = ?, travelers = ?, purpose = ?, priorities = ?,
            notes = ?, currency = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      input.name,
      input.status,
      input.startDate,
      input.endDate,
      input.flexibility,
      input.origins.join(","),
      input.travelers,
      input.purpose,
      input.priorities,
      input.notes,
      currency,
      now(),
      id,
    ],
  });
}

export async function setTripStatus(id: number, status: PlanningStatus): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE trips SET status = ?, updated_at = ? WHERE id = ?",
    args: [status, now(), id],
  });
}

export async function setArchived(id: number, archived: boolean): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE trips SET archived = ?, updated_at = ? WHERE id = ?",
    args: [archived ? 1 : 0, now(), id],
  });
}

export async function deleteTrip(id: number): Promise<void> {
  const client = await db();
  // Cascades are only enforced when foreign keys are on, which is per-connection in
  // SQLite. Deleting children explicitly means correctness does not depend on a PRAGMA.
  await client.batch(
    [
      { sql: "DELETE FROM trip_candidates WHERE trip_id = ?", args: [id] },
      { sql: "DELETE FROM trip_links WHERE trip_id = ?", args: [id] },
      { sql: "DELETE FROM trip_preferences WHERE trip_id = ?", args: [id] },
      { sql: "DELETE FROM trip_stops WHERE trip_id = ?", args: [id] },
      { sql: "DELETE FROM trips WHERE id = ?", args: [id] },
    ],
    "write",
  );
}

/** Copy a trip and its shortlist. Useful for "the same trip, different dates". */
export async function duplicateTrip(id: number): Promise<number> {
  const trip = await getTrip(id);
  if (!trip) throw new Error(`Trip ${id} not found`);

  const newId = await createTrip({
    name: `${trip.name} (copy)`,
    status: "idea",
    startDate: trip.startDate,
    endDate: trip.endDate,
    flexibility: trip.flexibility,
    origins: trip.origins,
    travelers: trip.travelers,
    purpose: trip.purpose,
    priorities: trip.priorities,
    notes: trip.notes,
  });

  const candidates = await listCandidates(id);
  const client = await db();
  if (candidates.length > 0) {
    await client.batch(
      candidates.map((c) => ({
        sql: `INSERT INTO trip_candidates (trip_id, destination_id, status, note, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        // The copy starts fresh: a selection made for the original's dates is not a
        // selection for the copy's, but the note explaining why is worth keeping.
        args: [newId, c.destinationId, c.status === "selected" ? "shortlisted" : c.status, c.note, now()],
      })),
      "write",
    );
  }

  await savePreferences(newId, await getPreferences(id));
  return newId;
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export async function listCandidates(tripId: number): Promise<TripCandidate[]> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT * FROM trip_candidates WHERE trip_id = ? ORDER BY created_at ASC",
    args: [tripId],
  });
  return result.rows.map(toCandidate);
}

export async function addCandidate(tripId: number, destinationId: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `INSERT INTO trip_candidates (trip_id, destination_id, status, note, created_at)
          VALUES (?, ?, 'considering', '', ?)
          ON CONFLICT (trip_id, destination_id) DO NOTHING`,
    args: [tripId, destinationId, now()],
  });
}

export async function setCandidateStatus(
  tripId: number,
  destinationId: string,
  status: CandidateStatus,
): Promise<void> {
  const client = await db();
  const statements = [
    {
      sql: `INSERT INTO trip_candidates (trip_id, destination_id, status, note, created_at)
            VALUES (?, ?, ?, '', ?)
            ON CONFLICT (trip_id, destination_id) DO UPDATE SET status = excluded.status`,
      args: [tripId, destinationId, status, now()] as (string | number)[],
    },
  ];

  // Only one destination can be the selected one.
  if (status === "selected") {
    statements.push({
      sql: `UPDATE trip_candidates SET status = 'shortlisted'
            WHERE trip_id = ? AND destination_id != ? AND status = 'selected'`,
      args: [tripId, destinationId],
    });
  }

  await client.batch(statements, "write");
}

export async function setCandidateNote(
  tripId: number,
  destinationId: string,
  note: string,
): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE trip_candidates SET note = ? WHERE trip_id = ? AND destination_id = ?",
    args: [note, tripId, destinationId],
  });
}

export async function removeCandidate(tripId: number, destinationId: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "DELETE FROM trip_candidates WHERE trip_id = ? AND destination_id = ?",
    args: [tripId, destinationId],
  });
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export async function listLinks(tripId: number): Promise<TripLink[]> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT * FROM trip_links WHERE trip_id = ? ORDER BY created_at DESC",
    args: [tripId],
  });
  return result.rows.map((r) => ({
    id: Number(r.id),
    tripId: Number(r.trip_id),
    label: String(r.label),
    url: String(r.url),
    createdAt: String(r.created_at),
  }));
}

export async function addLink(tripId: number, label: string, url: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "INSERT INTO trip_links (trip_id, label, url, created_at) VALUES (?, ?, ?, ?)",
    args: [tripId, label, url, now()],
  });
}

export async function removeLink(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM trip_links WHERE id = ?", args: [id] });
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getPreferences(tripId: number): Promise<ComparisonPreferences> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT payload FROM trip_preferences WHERE trip_id = ?",
    args: [tripId],
  });
  if (!result.rows[0]) return { ...DEFAULT_PREFERENCES };

  // Merge over the defaults so a preference added in a later release does not leave
  // older trips with an undefined field.
  const stored = JSON.parse(String(result.rows[0].payload)) as Partial<ComparisonPreferences>;
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    weights: { ...DEFAULT_PREFERENCES.weights, ...stored.weights },
  };
}

export async function savePreferences(
  tripId: number,
  prefs: ComparisonPreferences,
): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `INSERT INTO trip_preferences (trip_id, payload, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT (trip_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    args: [tripId, JSON.stringify(prefs), now()],
  });
}
