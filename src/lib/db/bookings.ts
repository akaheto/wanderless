import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import { type Money, money } from "@/lib/money";

export type BookingStatus = "option" | "tentative" | "confirmed" | "cancelled";

export interface FlightBooking {
  id: number;
  tripId: number;
  direction: "outbound" | "return";
  origin: string;
  destination: string;
  airline: string;
  flightNumber: string;
  departAt: string | null;
  arriveAt: string | null;
  cabin: string;
  fareClass: string;
  connections: number;
  totalMinutes: number | null;
  status: BookingStatus;
  cost: Money | null;
  confirmation: string;
  notes: string;
  createdAt: string;
}

export interface HotelBooking {
  id: number;
  tripId: number;
  destinationId: string;
  name: string;
  checkIn: string | null;
  checkOut: string | null;
  nightly: Money | null;
  taxes: Money | null;
  resortFee: Money | null;
  refundable: boolean;
  cancelBy: string | null;
  breakfastIncluded: boolean;
  status: BookingStatus;
  confirmation: string;
  notes: string;
  createdAt: string;
}

function toFlightBooking(row: Row): FlightBooking {
  const currency = String(row.currency ?? "USD").toUpperCase();
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    direction: String(row.direction) as "outbound" | "return",
    origin: String(row.origin),
    destination: String(row.destination),
    airline: String(row.airline ?? ""),
    flightNumber: String(row.flight_number ?? ""),
    departAt: row.depart_at === null ? null : String(row.depart_at),
    arriveAt: row.arrive_at === null ? null : String(row.arrive_at),
    cabin: String(row.cabin ?? ""),
    fareClass: String(row.fare_class ?? ""),
    connections: Number(row.connections ?? 0),
    totalMinutes: row.total_minutes === null ? null : Number(row.total_minutes),
    status: String(row.status) as BookingStatus,
    cost: row.cost_minor === null ? null : money(Number(row.cost_minor), currency),
    confirmation: String(row.confirmation ?? ""),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
  };
}

function toHotelBooking(row: Row): HotelBooking {
  const currency = String(row.currency ?? "USD").toUpperCase();
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    destinationId: String(row.destination_id),
    name: String(row.name),
    checkIn: row.check_in === null ? null : String(row.check_in),
    checkOut: row.check_out === null ? null : String(row.check_out),
    nightly: row.nightly_minor === null ? null : money(Number(row.nightly_minor), currency),
    taxes: row.taxes_minor === null ? null : money(Number(row.taxes_minor), currency),
    resortFee: row.resort_fee_minor === null ? null : money(Number(row.resort_fee_minor), currency),
    refundable: Number(row.refundable) === 1,
    cancelBy: row.cancel_by === null ? null : String(row.cancel_by),
    breakfastIncluded: Number(row.breakfast_included) === 1,
    status: String(row.status) as BookingStatus,
    confirmation: String(row.confirmation ?? ""),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function createFlightBooking(
  tripId: number,
  direction: "outbound" | "return",
  origin: string,
  destination: string,
  airline: string,
  flightNumber: string,
  totalMinutes: number | null = null,
  connections: number = 0,
  cost: Money | null = null,
): Promise<FlightBooking> {
  const now = new Date().toISOString();
  const client = await db();
  const currency = cost?.currency ?? "USD";
  const row = await client.execute({
    sql: `INSERT INTO flights (trip_id, direction, origin, destination, airline, flight_number, connections, total_minutes, currency, cost_minor, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [tripId, direction, origin, destination, airline, flightNumber, connections, totalMinutes, currency, cost?.amount ?? null, now],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    direction,
    origin,
    destination,
    airline,
    flightNumber,
    departAt: null,
    arriveAt: null,
    cabin: "",
    fareClass: "",
    connections,
    totalMinutes,
    status: "option",
    cost: cost ?? null,
    confirmation: "",
    notes: "",
    createdAt: now,
  };
}

export async function createHotelBooking(
  tripId: number,
  destinationId: string,
  name: string,
  nightly: Money | null = null,
): Promise<HotelBooking> {
  const now = new Date().toISOString();
  const client = await db();
  const currency = nightly?.currency ?? "USD";
  const row = await client.execute({
    sql: `INSERT INTO hotels (trip_id, destination_id, name, currency, nightly_minor, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [tripId, destinationId, name, currency, nightly?.amount ?? null, now],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    destinationId,
    name,
    checkIn: null,
    checkOut: null,
    nightly: nightly ?? null,
    taxes: null,
    resortFee: null,
    refundable: true,
    cancelBy: null,
    breakfastIncluded: false,
    status: "option",
    confirmation: "",
    notes: "",
    createdAt: now,
  };
}

export async function listFlightBookings(tripId: number): Promise<FlightBooking[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM flights WHERE trip_id = ? ORDER BY direction, created_at DESC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => toFlightBooking(row));
}

export async function listHotelBookings(tripId: number): Promise<HotelBooking[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM hotels WHERE trip_id = ? ORDER BY created_at DESC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => toHotelBooking(row));
}

export async function updateFlightBookingStatus(id: number, status: BookingStatus): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `UPDATE flights SET status = ? WHERE id = ?`,
    args: [status, id],
  });
}

export async function updateHotelBookingStatus(id: number, status: BookingStatus): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `UPDATE hotels SET status = ? WHERE id = ?`,
    args: [status, id],
  });
}

export async function deleteFlightBooking(id: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM flights WHERE id = ?`,
    args: [id],
  });
}

export async function deleteHotelBooking(id: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM hotels WHERE id = ?`,
    args: [id],
  });
}

export async function updateFlightBooking(
  id: number,
  airline: string,
  flightNumber: string,
  cabin: string,
  confirmation: string,
  notes: string,
  cost: Money | null,
  status: BookingStatus,
): Promise<FlightBooking> {
  const client = await db();
  await client.execute({
    sql: `UPDATE flights
          SET airline = ?, flight_number = ?, cabin = ?, confirmation = ?, notes = ?, cost_minor = ?, status = ?
          WHERE id = ?`,
    args: [airline, flightNumber, cabin, confirmation, notes, cost?.amount ?? null, status, id],
  });

  const rows = await client.execute({
    sql: `SELECT * FROM flights WHERE id = ?`,
    args: [id],
  });

  if (rows.rows.length === 0) throw new Error(`Flight booking ${id} not found`);
  return toFlightBooking(rows.rows[0] as Row);
}

export async function updateHotelBooking(
  id: number,
  name: string,
  nightly: Money | null,
  taxes: Money | null,
  resortFee: Money | null,
  refundable: boolean,
  cancelBy: string | null,
  breakfastIncluded: boolean,
  confirmation: string,
  notes: string,
  status: BookingStatus,
): Promise<HotelBooking> {
  const client = await db();
  await client.execute({
    sql: `UPDATE hotels
          SET name = ?, nightly_minor = ?, taxes_minor = ?, resort_fee_minor = ?, refundable = ?, cancel_by = ?, breakfast_included = ?, confirmation = ?, notes = ?, status = ?
          WHERE id = ?`,
    args: [name, nightly?.amount ?? null, taxes?.amount ?? null, resortFee?.amount ?? null, refundable ? 1 : 0, cancelBy, breakfastIncluded ? 1 : 0, confirmation, notes, status, id],
  });

  const rows = await client.execute({
    sql: `SELECT * FROM hotels WHERE id = ?`,
    args: [id],
  });

  if (rows.rows.length === 0) throw new Error(`Hotel booking ${id} not found`);
  return toHotelBooking(rows.rows[0]);
}
