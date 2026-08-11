import "server-only";

import type { FlightSearchResult } from "@/lib/flights";
import type { Row } from "@libsql/client";
import { db } from "./client";

export interface StoredFlightSearch {
  id: number;
  tripId: number;
  origin: string;
  destinationAirport: string;
  departDate: string;
  returnDate: string | null;
  result: FlightSearchResult;
  provider: string;
  retrievedAt: string;
  createdAt: string;
}

export interface StoredHotelSearch {
  id: number;
  tripId: number;
  destinationId: string;
  checkIn: string;
  checkOut: string;
  payload: Record<string, unknown>;
  provider: string;
  retrievedAt: string;
  createdAt: string;
}

export async function storeFlightSearch(
  tripId: number,
  result: FlightSearchResult,
): Promise<StoredFlightSearch> {
  const now = new Date().toISOString();
  const client = await db();
  const row = await client.execute({
    sql: `INSERT INTO flight_searches (trip_id, origin, destination_airport, depart_date, return_date, payload, provider, retrieved_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tripId,
      result.origin,
      result.destinationAirport,
      result.departDate,
      result.returnDate,
      JSON.stringify(result),
      result.provider,
      result.retrievedAt,
      now,
    ],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    origin: result.origin,
    destinationAirport: result.destinationAirport,
    departDate: result.departDate,
    returnDate: result.returnDate,
    result,
    provider: result.provider,
    retrievedAt: result.retrievedAt,
    createdAt: now,
  };
}

export async function listFlightSearches(tripId: number): Promise<StoredFlightSearch[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM flight_searches WHERE trip_id = ? ORDER BY retrieved_at DESC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => ({
    id: Number(row.id),
    tripId: Number(row.trip_id),
    origin: String(row.origin),
    destinationAirport: String(row.destination_airport),
    departDate: String(row.depart_date),
    returnDate: row.return_date === null ? null : String(row.return_date),
    result: JSON.parse(String(row.payload)),
    provider: String(row.provider),
    retrievedAt: String(row.retrieved_at),
    createdAt: String(row.created_at),
  }));
}

export async function deleteFlightSearch(id: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM flight_searches WHERE id = ?`,
    args: [id],
  });
}

export async function storeHotelSearch(
  tripId: number,
  destinationId: string,
  checkIn: string,
  checkOut: string,
  payload: Record<string, unknown>,
  provider: string,
  retrievedAt: string,
): Promise<StoredHotelSearch> {
  const now = new Date().toISOString();
  const client = await db();
  const row = await client.execute({
    sql: `INSERT INTO hotel_searches (trip_id, destination_id, check_in, check_out, payload, provider, retrieved_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [tripId, destinationId, checkIn, checkOut, JSON.stringify(payload), provider, retrievedAt, now],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    destinationId,
    checkIn,
    checkOut,
    payload,
    provider,
    retrievedAt,
    createdAt: now,
  };
}

export async function listHotelSearches(tripId: number): Promise<StoredHotelSearch[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM hotel_searches WHERE trip_id = ? ORDER BY retrieved_at DESC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => ({
    id: Number(row.id),
    tripId: Number(row.trip_id),
    destinationId: String(row.destination_id),
    checkIn: String(row.check_in),
    checkOut: String(row.check_out),
    payload: JSON.parse(String(row.payload)),
    provider: String(row.provider),
    retrievedAt: String(row.retrieved_at),
    createdAt: String(row.created_at),
  }));
}

export async function deleteHotelSearch(id: number): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM hotel_searches WHERE id = ?`,
    args: [id],
  });
}
