import "server-only";

import { db } from "@/lib/db/client";

export type AuditAction =
  | "trip_created"
  | "trip_updated"
  | "trip_archived"
  | "trip_deleted"
  | "trip_shared"
  | "trip_accessed"
  | "destination_selected"
  | "destination_rejected"
  | "collaborator_added"
  | "collaborator_removed"
  | "user_signed_up"
  | "user_signed_in"
  | "user_signed_out"
  | "flight_booked"
  | "hotel_booked"
  | "place_added"
  | "place_updated"
  | "place_deleted"
  | "stop_added"
  | "stop_updated"
  | "stop_removed"
  | "event_added"
  | "event_deleted"
  | "preferences_updated"
  | "search_executed";

export interface AuditDetails {
  [key: string]: unknown;
}

/**
 * Log an audit event. Fire-and-forget: errors do not block the calling action.
 *
 * Never use await on this in a server action unless you specifically need the result.
 * Audit is append-only and never deleted. Every significant user action gets logged
 * so the audit trail is a searchable history of what happened, when, and by whom.
 *
 * @param userId - The ID of the user performing the action (null = anonymous/system)
 * @param tripId - The ID of the affected trip, if any (null = account-level actions)
 * @param action - The action being performed (e.g. 'trip_created')
 * @param details - Optional object with extra context (what changed, who was involved, etc.)
 */
export async function logAudit(
  userId: string | null,
  tripId: number | null,
  action: AuditAction,
  details?: AuditDetails,
): Promise<void> {
  try {
    const client = await db();
    const detailsJson = details ? JSON.stringify(details) : null;
    const createdAt = new Date().toISOString();

    await client.execute(
      `INSERT INTO audit_log (user_id, trip_id, action, details, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, tripId, action, detailsJson, createdAt],
    );
  } catch (error) {
    // Log to stderr but do not throw. Audit failure should not break the user action.
    console.error("[audit] Failed to log action:", { error, action, userId, tripId });
  }
}

/**
 * Retrieve audit logs for a trip. Used by the admin audit viewer.
 * Returns the most recent logs first.
 */
export async function getAuditLogForTrip(tripId: number, limit = 100): Promise<AuditEntry[]> {
  const client = await db();
  const rows = await client.execute(
    `SELECT id, user_id, trip_id, action, details, created_at
     FROM audit_log
     WHERE trip_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [tripId, limit],
  );

  return rows.rows.map((row) => ({
    id: Number(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    tripId: row.trip_id ? Number(row.trip_id) : null,
    action: String(row.action) as AuditAction,
    details: row.details ? JSON.parse(String(row.details)) : null,
    createdAt: String(row.created_at),
  }));
}

/**
 * Retrieve audit logs for a user. Returns the most recent logs first.
 */
export async function getAuditLogForUser(userId: string, limit = 100): Promise<AuditEntry[]> {
  const client = await db();
  const rows = await client.execute(
    `SELECT id, user_id, trip_id, action, details, created_at
     FROM audit_log
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit],
  );

  return rows.rows.map((row) => ({
    id: Number(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    tripId: row.trip_id ? Number(row.trip_id) : null,
    action: String(row.action) as AuditAction,
    details: row.details ? JSON.parse(String(row.details)) : null,
    createdAt: String(row.createdAt),
  }));
}

/**
 * Retrieve recent audit logs (all users). Used by the admin dashboard.
 * Returns the most recent logs first.
 */
export async function getRecentAuditLogs(limit = 100): Promise<AuditEntry[]> {
  const client = await db();
  const rows = await client.execute(
    `SELECT id, user_id, trip_id, action, details, created_at
     FROM audit_log
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
  );

  return rows.rows.map((row) => ({
    id: Number(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    tripId: row.trip_id ? Number(row.trip_id) : null,
    action: String(row.action) as AuditAction,
    details: row.details ? JSON.parse(String(row.details)) : null,
    createdAt: String(row.created_at),
  }));
}

export interface AuditEntry {
  id: number;
  userId: string | null;
  tripId: number | null;
  action: AuditAction;
  details: AuditDetails | null;
  createdAt: string;
}
