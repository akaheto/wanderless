import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import { isValidDate } from "@/lib/dates";

export type EventKind = "constraint" | "opportunity";

export interface TripEvent {
  id: number;
  tripId: number;
  label: string;
  startDate: string;
  endDate: string;
  kind: EventKind;
  notes: string;
  createdAt: string;
}

function toEvent(row: Row): TripEvent {
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    label: String(row.label),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    kind: String(row.kind) as EventKind,
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function createEvent(
  tripId: number,
  label: string,
  startDate: string,
  endDate: string,
  kind: EventKind = "constraint",
  notes: string = "",
): Promise<TripEvent> {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error("Invalid date format");
  }
  if (startDate > endDate) {
    throw new Error("Start date must be before or equal to end date");
  }

  const now = new Date().toISOString();
  const client = await db();
  const row = await client.execute({
    sql: `INSERT INTO trip_events (trip_id, label, start_date, end_date, kind, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [tripId, label, startDate, endDate, kind, notes, now],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    label,
    startDate,
    endDate,
    kind,
    notes,
    createdAt: now,
  };
}

export async function listEvents(tripId: number): Promise<TripEvent[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM trip_events WHERE trip_id = ? ORDER BY start_date ASC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => toEvent(row));
}

export async function getEvent(id: number): Promise<TripEvent | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM trip_events WHERE id = ?`,
    args: [id],
  });

  return result.rows.length > 0 ? toEvent(result.rows[0] as Row) : null;
}

export async function updateEvent(
  id: number,
  updates: Partial<Omit<TripEvent, "id" | "tripId" | "createdAt">>,
): Promise<TripEvent> {
  const event = await getEvent(id);
  if (!event) throw new Error("Event not found");

  if (updates.startDate && updates.endDate && updates.startDate > updates.endDate) {
    throw new Error("Start date must be before or equal to end date");
  }

  const fields = [];
  const args = [];

  if (updates.label !== undefined) {
    fields.push("label = ?");
    args.push(updates.label);
  }
  if (updates.startDate !== undefined) {
    if (!isValidDate(updates.startDate)) throw new Error("Invalid start date");
    fields.push("start_date = ?");
    args.push(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    if (!isValidDate(updates.endDate)) throw new Error("Invalid end date");
    fields.push("end_date = ?");
    args.push(updates.endDate);
  }
  if (updates.kind !== undefined) {
    fields.push("kind = ?");
    args.push(updates.kind);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    args.push(updates.notes);
  }

  if (fields.length === 0) return event;

  args.push(id);
  const client = await db();
  await client.execute({
    sql: `UPDATE trip_events SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  return getEvent(id) as Promise<TripEvent>;
}

export async function deleteEvent(id: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM trip_events WHERE id = ?`,
    args: [id],
  });
}
