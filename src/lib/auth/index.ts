import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import type { User, UserRole } from "@/lib/db/users";
import { hashPassword, verifyPassword } from "./password";
import { sendVerificationEmail, sendAdminNewAccountAlert } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import type { Row } from "@libsql/client";

const SESSION_COOKIE_NAME = "wanderless-session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface Session {
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

function toUser(row: Row): User {
  return {
    id: String(row.id),
    email: String(row.email),
    role: String(row.role || 'user') as 'user' | 'admin' | 'owner',
    createdAt: String(row.created_at),
    emailVerified: row.email_verified === 1 || Boolean(row.email_verified),
  };
}

/**
 * Sign up a new user with email and password.
 * Creates a verification token and returns it so the caller can send verification email.
 * Throws if email already exists or password is invalid.
 */
export async function signUp(email: string, password: string): Promise<{ user: User; verificationToken: string }> {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const client = await db();

  // Check if user already exists
  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length > 0) {
    throw new Error("Email already in use");
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const userId = randomBytes(12).toString("hex");
  const now = new Date().toISOString();

  // Create verification token
  const verificationToken = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  // Auto-verify emails on signup so users can immediately login
  // (This is a public demo — no email backend available)
  const autoVerifyEmail = true;

  await client.execute({
    sql: "INSERT INTO users (id, email, password_hash, created_at, email_verified, verification_token, verification_token_expires_at, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [userId, email, passwordHash, now, autoVerifyEmail ? 1 : 0, verificationToken, tokenExpiresAt, 'user'],
  });

  const user = { id: userId, email, role: 'user' as UserRole, createdAt: now, emailVerified: autoVerifyEmail };

  // Send verification email (if not auto-verified)
  if (!autoVerifyEmail) {
    await sendVerificationEmail(email, verificationToken);
  }

  // Send admin alert
  await sendAdminNewAccountAlert(email, now);

  // Log signup event
  await logAudit(userId, 'SIGNUP', 'user', { resourceId: userId });

  return {
    user,
    verificationToken
  };
}

/**
 * Sign in a user with email and password.
 * Creates a session and returns the user.
 * Throws if credentials are invalid or email is not verified.
 */
export async function signIn(email: string, password: string): Promise<User> {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const client = await db();

  // Find user by email
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const userRow = result.rows[0] as Row;
  const passwordHash = userRow.password_hash ? String(userRow.password_hash) : null;

  // Verify password
  if (!passwordHash || !(await verifyPassword(password, passwordHash))) {
    throw new Error("Invalid email or password");
  }

  // Check if email is verified
  const emailVerified = userRow.email_verified === 1 || Boolean(userRow.email_verified);
  if (!emailVerified) {
    throw new Error("email_not_verified");
  }

  const user = toUser(userRow);

  // Create session
  const sessionId = randomBytes(12).toString("hex");
  const sessionToken = randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

  await client.execute({
    sql: "INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    args: [sessionId, user.id, sessionToken, now, expiresAt],
  });

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: "/",
  });

  // Log login event
  await logAudit(user.id, 'LOGIN', 'user', { resourceId: user.id });

  return user;
}

/**
 * Get the current user from the session cookie.
 * Returns null if no valid session exists.
 * TEMP: Returns default admin user for testing when no session.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    // TEMP: Return default admin user for testing (no auth required)
    return {
      id: 'test-admin-user',
      email: 'admin@wanderless.test',
      role: 'owner' as const,
      createdAt: new Date().toISOString(),
      emailVerified: true,
    };
  }

  const client = await db();

  // Find session and check expiration
  const result = await client.execute({
    sql: `SELECT s.user_id, u.* FROM sessions s 
          JOIN users u ON s.user_id = u.id 
          WHERE s.token = ? AND s.expires_at > ?`,
    args: [sessionToken, new Date().toISOString()],
  });

  if (result.rows.length === 0) {
    // Clear invalid session cookie
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return toUser(result.rows[0] as Row);
}

/**
 * Sign out the current user by clearing the session cookie.
 */
export async function signOut(): Promise<void> {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const client = await db();
    await client.execute({
      sql: "DELETE FROM sessions WHERE token = ?",
      args: [sessionToken],
    });
  }

  // Log logout event if user was authenticated
  if (user) {
    await logAudit(user.id, 'LOGOUT', 'user', { resourceId: user.id });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Clean up expired sessions (called periodically).
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "DELETE FROM sessions WHERE expires_at < ?",
    args: [new Date().toISOString()],
  });
}
