import "server-only";

import type { Row } from "@libsql/client";
import { db } from "./client";
import { randomBytes } from "node:crypto";

export interface User {
  id: string;
  email: string;
  createdAt: string;
  emailVerified?: boolean;
}

export interface TripCollaborator {
  id: number;
  tripId: number;
  userId: string;
  role: "owner" | "editor" | "viewer";
  addedAt: string;
}

export interface TripShare {
  id: string;
  tripId: number;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  note: string;
}

function toUser(row: Row): User {
  return {
    id: String(row.id),
    email: String(row.email),
    createdAt: String(row.created_at),
    emailVerified: row.email_verified === 1 || Boolean(row.email_verified),
  };
}

function toCollaborator(row: Row): TripCollaborator {
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    userId: String(row.user_id),
    role: String(row.role) as "owner" | "editor" | "viewer",
    addedAt: String(row.added_at),
  };
}

function toShare(row: Row): TripShare {
  return {
    id: String(row.id),
    tripId: Number(row.trip_id),
    token: String(row.token),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    expiresAt: row.expires_at === null ? null : String(row.expires_at),
    note: String(row.note ?? ""),
  };
}

export async function getOrCreateUser(email: string): Promise<User> {
  const client = await db();

  // Try to find existing user
  const existing = await client.execute({
    sql: `SELECT * FROM users WHERE email = ?`,
    args: [email],
  });

  if (existing.rows.length > 0) {
    return toUser(existing.rows[0] as Row);
  }

  // Create new user with deterministic ID based on email
  const userId = randomBytes(12).toString("hex");
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)`,
    args: [userId, email, now],
  });

  return { id: userId, email, createdAt: now };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM users WHERE email = ?`,
    args: [email],
  });

  return result.rows.length > 0 ? toUser(result.rows[0] as Row) : null;
}

export async function addCollaborator(tripId: number, userId: string, role: "editor" | "viewer" = "editor"): Promise<TripCollaborator> {
  const now = new Date().toISOString();
  const client = await db();
  const row = await client.execute({
    sql: `INSERT INTO trip_collaborators (trip_id, user_id, role, added_at) VALUES (?, ?, ?, ?)`,
    args: [tripId, userId, role, now],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    userId,
    role,
    addedAt: now,
  };
}

export async function listCollaborators(tripId: number): Promise<TripCollaborator[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM trip_collaborators WHERE trip_id = ? ORDER BY added_at ASC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => toCollaborator(row));
}

export async function removeCollaborator(tripId: number, userId: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM trip_collaborators WHERE trip_id = ? AND user_id = ?`,
    args: [tripId, userId],
  });
}

export async function createShareLink(tripId: number, createdBy: string, expiresAt: string | null = null, note: string = ""): Promise<TripShare> {
  const now = new Date().toISOString();
  const token = randomBytes(16).toString("hex");
  const shareId = randomBytes(12).toString("hex");

  const client = await db();
  await client.execute({
    sql: `INSERT INTO trip_shares (id, trip_id, token, created_by, created_at, expires_at, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [shareId, tripId, token, createdBy, now, expiresAt, note],
  });

  return {
    id: shareId,
    tripId,
    token,
    createdBy,
    createdAt: now,
    expiresAt,
    note,
  };
}

export async function getShareByToken(token: string): Promise<TripShare | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM trip_shares WHERE token = ?`,
    args: [token],
  });

  if (result.rows.length === 0) return null;

  const share = toShare(result.rows[0] as Row);

  // Check expiration
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return null; // Expired
  }

  return share;
}

export async function listSharesForTrip(tripId: number): Promise<TripShare[]> {
  const client = await db();
  const rows = await client.execute({
    sql: `SELECT * FROM trip_shares WHERE trip_id = ? ORDER BY created_at DESC`,
    args: [tripId],
  });

  return rows.rows.map((row: Row) => toShare(row));
}

export async function deleteShare(shareId: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM trip_shares WHERE id = ?`,
    args: [shareId],
  });
}

/** Check if user can access trip (owner or collaborator). */
export async function canUserAccessTrip(tripId: number, userId: string): Promise<boolean> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT trip_id FROM trip_collaborators WHERE trip_id = ? AND user_id = ?
          UNION
          SELECT id FROM trips WHERE id = ? AND owner_id = ?`,
    args: [tripId, userId, tripId, userId],
  });

  return result.rows.length > 0;
}

/** Check if user can edit trip (owner or editor collaborator). */
export async function canUserEditTrip(tripId: number, userId: string): Promise<boolean> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT trip_id FROM trip_collaborators WHERE trip_id = ? AND user_id = ? AND role = 'editor'
          UNION
          SELECT id FROM trips WHERE id = ? AND owner_id = ?`,
    args: [tripId, userId, tripId, userId],
  });

  return result.rows.length > 0;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

function toSession(row: Row): Session {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    token: String(row.token),
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM users WHERE id = ?`,
    args: [id],
  });

  return result.rows.length > 0 ? toUser(result.rows[0] as Row) : null;
}

export async function getSessionByToken(token: string): Promise<Session | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM sessions WHERE token = ? AND expires_at > ?`,
    args: [token, new Date().toISOString()],
  });

  return result.rows.length > 0 ? toSession(result.rows[0] as Row) : null;
}

export async function deleteSession(token: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM sessions WHERE token = ?`,
    args: [token],
  });
}

export async function getShareByUser(tripId: number, userId: string): Promise<TripShare | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM trip_shares WHERE trip_id = ? AND created_by = ?`,
    args: [tripId, userId],
  });

  if (result.rows.length === 0) return null;
  return toShare(result.rows[0] as Row);
}

// ---------------------------------------------------------------------------
// Trip Invites
// ---------------------------------------------------------------------------

export interface TripInvite {
  id: number;
  tripId: number;
  invitedEmail: string;
  token: string;
  role: "editor" | "viewer";
  createdAt: string;
  expiresAt: string;
}

function toInvite(row: Row): TripInvite {
  return {
    id: Number(row.id),
    tripId: Number(row.trip_id),
    invitedEmail: String(row.invited_email),
    token: String(row.token),
    role: String(row.role) as "editor" | "viewer",
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
  };
}

export async function createInvite(
  tripId: number,
  invitedEmail: string,
  role: "editor" | "viewer" = "editor"
): Promise<TripInvite> {
  const token = randomBytes(16).toString("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const client = await db();
  const row = await client.execute({
    sql: `INSERT INTO trip_invites (trip_id, invited_email, token, role, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [tripId, invitedEmail, token, role, now, expiresAt],
  });

  return {
    id: Number(row.lastInsertRowid),
    tripId,
    invitedEmail,
    token,
    role,
    createdAt: now,
    expiresAt,
  };
}

export async function getInviteByToken(token: string): Promise<TripInvite | null> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM trip_invites WHERE token = ?`,
    args: [token],
  });

  if (result.rows.length === 0) return null;

  const invite = toInvite(result.rows[0] as Row);

  // Check expiration
  if (new Date(invite.expiresAt) < new Date()) {
    return null; // Expired
  }

  return invite;
}

export async function acceptInvite(token: string, userId: string): Promise<void> {
  const client = await db();

  // Get the invite
  const inviteResult = await client.execute({
    sql: `SELECT * FROM trip_invites WHERE token = ?`,
    args: [token],
  });

  if (inviteResult.rows.length === 0) {
    throw new Error("Invite not found");
  }

  const invite = toInvite(inviteResult.rows[0] as Row);

  // Check expiration
  if (new Date(invite.expiresAt) < new Date()) {
    throw new Error("Invite has expired");
  }

  // Add as collaborator
  await addCollaborator(invite.tripId, userId, invite.role);

  // Delete the invite
  await client.execute({
    sql: `DELETE FROM trip_invites WHERE token = ?`,
    args: [token],
  });
}

export async function listInvitesForTrip(tripId: number): Promise<TripInvite[]> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM trip_invites WHERE trip_id = ? ORDER BY created_at DESC`,
    args: [tripId],
  });

  // Filter out expired invites
  const now = new Date();
  return result.rows
    .map((row: Row) => toInvite(row))
    .filter((invite) => new Date(invite.expiresAt) >= now);
}

export async function deleteInvite(token: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `DELETE FROM trip_invites WHERE token = ?`,
    args: [token],
  });
}

// ---------------------------------------------------------------------------
// Email Verification
// ---------------------------------------------------------------------------

/**
 * Create a verification token for a user.
 * Token expires after 24 hours.
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const client = await db();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  await client.execute({
    sql: `UPDATE users SET verification_token = ?, verification_token_expires_at = ? WHERE id = ?`,
    args: [token, expiresAt, userId],
  });

  return token;
}

/**
 * Verify a user's email using their verification token.
 * Clears the token after successful verification.
 * Returns true if verification succeeded, false if token is invalid/expired.
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const client = await db();

  // Find user with valid token
  const result = await client.execute({
    sql: `SELECT id, verification_token_expires_at FROM users WHERE verification_token = ?`,
    args: [token],
  });

  if (result.rows.length === 0) {
    return false; // Token not found
  }

  const userRow = result.rows[0] as Row;
  const expiresAt = userRow.verification_token_expires_at
    ? new Date(String(userRow.verification_token_expires_at))
    : null;

  // Check if token is expired
  if (!expiresAt || expiresAt < new Date()) {
    return false; // Token expired
  }

  // Mark user as verified and clear token
  const userId = String(userRow.id);
  await client.execute({
    sql: `UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?`,
    args: [userId],
  });

  return true;
}

/**
 * Check if a user has verified their email.
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT email_verified FROM users WHERE id = ?`,
    args: [userId],
  });

  if (result.rows.length === 0) {
    return false;
  }

  const row = result.rows[0] as Row;
  return row.email_verified === 1 || Boolean(row.email_verified);
}
