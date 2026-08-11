import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import type { Place, PlaceCategory, PlacePriority, Source } from "@/lib/domain/types";
import { today } from "@/lib/dates";

const now = () => new Date().toISOString();

function toPlace(row: Row): Place {
  return {
    id: Number(row.id),
    destinationId: String(row.destination_id),
    tripId: row.trip_id === null ? null : Number(row.trip_id),
    category: String(row.category) as PlaceCategory,

    name: String(row.name),
    address: String(row.address ?? ""),
    neighborhood: String(row.neighborhood ?? ""),
    lat: row.lat === null ? null : Number(row.lat),
    lon: row.lon === null ? null : Number(row.lon),
    hours: String(row.hours ?? ""),
    priceLevel: row.price_level === null ? null : Number(row.price_level),
    url: String(row.url ?? ""),
    providerPlaceId: row.provider_place_id === null ? null : String(row.provider_place_id),

    whyItMatters: String(row.why_it_matters ?? ""),
    notes: String(row.notes ?? ""),
    priority: String(row.priority) as PlacePriority,
    reservationRequired: Number(row.reservation_required) === 1,

    sourceId: row.source_id === null ? null : Number(row.source_id),
    verifiedOn: row.verified_on === null ? null : String(row.verified_on),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toSource(row: Row): Source {
  return {
    id: Number(row.id),
    label: String(row.label),
    url: String(row.url ?? ""),
    kind: String(row.kind) as Source["kind"],
    retrievedOn: String(row.retrieved_on),
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Places for a trip, plus standing destination notes for the destinations it visits. */
export async function listPlacesForTrip(
  tripId: number,
  destinationIds: string[],
): Promise<{ attached: Place[]; standing: Place[] }> {
  const client = await db();

  const attached = await client.execute({
    sql: "SELECT * FROM places WHERE trip_id = ? ORDER BY name ASC",
    args: [tripId],
  });

  if (destinationIds.length === 0) {
    return { attached: attached.rows.map(toPlace), standing: [] };
  }

  // Standing notes: saved against a destination but not attached to any trip. These are
  // how the catalog improves — a good restaurant found once is offered on every later trip.
  const placeholders = destinationIds.map(() => "?").join(", ");
  const standing = await client.execute({
    sql: `SELECT * FROM places
          WHERE trip_id IS NULL AND destination_id IN (${placeholders})
          ORDER BY name ASC`,
    args: destinationIds,
  });

  return { attached: attached.rows.map(toPlace), standing: standing.rows.map(toPlace) };
}

/** Everything saved for a destination, across every trip. */
export async function listPlacesForDestination(destinationId: string): Promise<Place[]> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT * FROM places WHERE destination_id = ? ORDER BY name ASC",
    args: [destinationId],
  });
  return result.rows.map(toPlace);
}

export async function getPlace(id: number): Promise<Place | null> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM places WHERE id = ?", args: [id] });
  return result.rows.length > 0 ? toPlace(result.rows[0]) : null;
}

export async function getSource(id: number): Promise<Source | null> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM sources WHERE id = ?", args: [id] });
  return result.rows.length > 0 ? toSource(result.rows[0]) : null;
}

export async function listSources(ids: number[]): Promise<Map<number, Source>> {
  if (ids.length === 0) return new Map();
  const client = await db();
  const placeholders = ids.map(() => "?").join(", ");
  const result = await client.execute({
    sql: `SELECT * FROM sources WHERE id IN (${placeholders})`,
    args: ids,
  });
  return new Map(result.rows.map((row) => [Number(row.id), toSource(row)]));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createSource(input: {
  label: string;
  url?: string;
  kind?: Source["kind"];
  retrievedOn?: string;
}): Promise<number> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO sources (label, url, kind, retrieved_on, created_at)
          VALUES (?, ?, ?, ?, ?) RETURNING id`,
    args: [
      input.label,
      input.url ?? "",
      input.kind ?? "web",
      input.retrievedOn ?? today(),
      now(),
    ],
  });
  return Number(result.rows[0].id);
}

/** Fields a provider or a re-verification may write. Mirrors group A in the spec. */
export interface FetchedFields {
  name: string;
  address: string;
  neighborhood: string;
  lat: number | null;
  lon: number | null;
  hours: string;
  priceLevel: number | null;
  url: string;
  providerPlaceId: string | null;
}

/** Fields only the user writes. Nothing automated ever touches these. */
export interface PersonalFields {
  whyItMatters: string;
  notes: string;
  priority: PlacePriority;
  reservationRequired: boolean;
}

export async function createPlace(input: {
  destinationId: string;
  tripId: number | null;
  category: PlaceCategory;
  fetched: FetchedFields;
  personal: PersonalFields;
  sourceId: number | null;
  /** Null when nothing has actually been checked — an honest default, not a convenience. */
  verifiedOn: string | null;
}): Promise<number> {
  const client = await db();
  const timestamp = now();

  const result = await client.execute({
    sql: `INSERT INTO places (
            destination_id, trip_id, name, category, neighborhood, lat, lon,
            description, why_it_matters, price_level, hours, reservation_required,
            priority, notes, source_id, verified_on, address, url, provider_place_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [
      input.destinationId,
      input.tripId,
      input.fetched.name,
      input.category,
      input.fetched.neighborhood,
      input.fetched.lat,
      input.fetched.lon,
      input.personal.whyItMatters,
      input.fetched.priceLevel,
      input.fetched.hours,
      input.personal.reservationRequired ? 1 : 0,
      input.personal.priority,
      input.personal.notes,
      input.sourceId,
      input.verifiedOn,
      input.fetched.address,
      input.fetched.url,
      input.fetched.providerPlaceId,
      timestamp,
      timestamp,
    ],
  });
  return Number(result.rows[0].id);
}

/**
 * Re-verify: refresh the fetched fields and the date, leave personal fields alone.
 *
 * The SQL is the enforcement point for the ADR 0001 guarantee. There is deliberately no
 * general-purpose `updatePlace` that could write both groups at once — a caller that wants
 * to change a note calls `updatePersonalFields`, and the two paths cannot be confused.
 */
export async function reverifyPlace(
  id: number,
  fetched: FetchedFields,
  sourceId: number | null,
  verifiedOn: string,
): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `UPDATE places SET
            name = ?, address = ?, neighborhood = ?, lat = ?, lon = ?,
            hours = ?, price_level = ?, url = ?, provider_place_id = ?,
            source_id = ?, verified_on = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      fetched.name,
      fetched.address,
      fetched.neighborhood,
      fetched.lat,
      fetched.lon,
      fetched.hours,
      fetched.priceLevel,
      fetched.url,
      fetched.providerPlaceId,
      sourceId,
      verifiedOn,
      now(),
      id,
    ],
  });
}

export async function updatePersonalFields(id: number, personal: PersonalFields): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `UPDATE places SET why_it_matters = ?, notes = ?, priority = ?,
            reservation_required = ?, updated_at = ? WHERE id = ?`,
    args: [
      personal.whyItMatters,
      personal.notes,
      personal.priority,
      personal.reservationRequired ? 1 : 0,
      now(),
      id,
    ],
  });
}

export async function setPlacePriority(id: number, priority: PlacePriority): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE places SET priority = ?, updated_at = ? WHERE id = ?",
    args: [priority, now(), id],
  });
}

/** Attach a standing destination note to a trip, or detach it back to standing. */
export async function setPlaceTrip(id: number, tripId: number | null): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE places SET trip_id = ?, updated_at = ? WHERE id = ?",
    args: [tripId, now(), id],
  });
}

/**
 * Copy a standing note onto a trip, leaving the original in place.
 *
 * Used when the same place is wanted on a trip without losing it as a standing note for
 * future ones. The copy carries the original's verification date — copying does not
 * constitute checking.
 */
export async function copyPlaceToTrip(id: number, tripId: number): Promise<number | null> {
  const place = await getPlace(id);
  if (!place) return null;

  return createPlace({
    destinationId: place.destinationId,
    tripId,
    category: place.category,
    fetched: {
      name: place.name,
      address: place.address,
      neighborhood: place.neighborhood,
      lat: place.lat,
      lon: place.lon,
      hours: place.hours,
      priceLevel: place.priceLevel,
      url: place.url,
      providerPlaceId: place.providerPlaceId,
    },
    personal: {
      whyItMatters: place.whyItMatters,
      notes: place.notes,
      priority: place.priority,
      reservationRequired: place.reservationRequired,
    },
    sourceId: place.sourceId,
    verifiedOn: place.verifiedOn,
  });
}

export async function deletePlace(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM places WHERE id = ?", args: [id] });
}
