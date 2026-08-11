import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import type { TripStop } from "@/lib/domain/types";

/*
 * Trip stops. Ordering is by `position`, which is always a dense 0-based sequence — every
 * mutation renumbers, so no code downstream has to cope with gaps in the ordering.
 */

function toStop(row: Row): TripStop {
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    destinationId: String(row.destination_id),
    position: Number(row.position),
    nights: Number(row.nights),
    note: String(row.note),
  };
}

export async function listStops(tripId: number): Promise<TripStop[]> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY position ASC",
    args: [tripId],
  });
  return result.rows.map(toStop);
}

/** Append a stop. Nights default to whatever is unallocated, or 1 if the trip is full. */
export async function addStop(
  tripId: number,
  destinationId: string,
  nights: number,
): Promise<void> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT COALESCE(MAX(position) + 1, 0) AS next FROM trip_stops WHERE trip_id = ?",
    args: [tripId],
  });
  const position = Number(result.rows[0].next);

  await client.execute({
    sql: `INSERT INTO trip_stops (trip_id, destination_id, position, nights, note)
          VALUES (?, ?, ?, ?, '')`,
    args: [tripId, destinationId, position, Math.max(0, Math.round(nights))],
  });
}

export async function setStopNights(stopId: number, nights: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE trip_stops SET nights = ? WHERE id = ?",
    args: [Math.max(0, Math.round(nights)), stopId],
  });
}

export async function setStopNote(stopId: number, note: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE trip_stops SET note = ? WHERE id = ?",
    args: [note, stopId],
  });
}

export async function removeStop(tripId: number, stopId: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM trip_stops WHERE id = ?", args: [stopId] });
  await renumber(tripId);
}

/**
 * Move a stop one place earlier or later.
 *
 * Swapping positions with a neighbour would need two updates that briefly collide on the
 * same value. Reading the order, reordering in memory and renumbering avoids that entirely
 * and stays correct however the positions arrived.
 */
export async function moveStop(
  tripId: number,
  stopId: number,
  direction: "up" | "down",
): Promise<void> {
  const stops = await listStops(tripId);
  const index = stops.findIndex((s) => s.id === stopId);
  if (index === -1) return;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= stops.length) return;

  [stops[index], stops[target]] = [stops[target], stops[index]];
  await writeOrder(stops.map((s) => s.id));
}

async function renumber(tripId: number): Promise<void> {
  const stops = await listStops(tripId);
  await writeOrder(stops.map((s) => s.id));
}

async function writeOrder(idsInOrder: number[]): Promise<void> {
  if (idsInOrder.length === 0) return;
  const client = await db();
  await client.batch(
    idsInOrder.map((id, position) => ({
      sql: "UPDATE trip_stops SET position = ? WHERE id = ?",
      args: [position, id],
    })),
    "write",
  );
}

/**
 * Seed the itinerary from the destination the trip has already chosen, giving it the whole
 * trip. Saves the common single-stop case from being assembled by hand.
 */
export async function seedStopsFromSelection(
  tripId: number,
  destinationId: string,
  nights: number,
): Promise<void> {
  const existing = await listStops(tripId);
  if (existing.length > 0) return;
  await addStop(tripId, destinationId, nights);
}
