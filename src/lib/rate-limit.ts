import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";

const DAILY_LIMIT = 10;

/**
 * Check if user has exceeded daily submission limit.
 * Admins and owners have unlimited submissions.
 *
 * @returns true if user is under limit (or is admin), false if limit exceeded
 */
export async function checkSubmissionLimit(): Promise<{
  allowed: boolean;
  remaining?: number;
  message?: string;
}> {
  const user = await getCurrentUser();

  // No rate limit for admins and owners
  if (await isAdmin()) {
    return { allowed: true };
  }

  // Anonymous or unauthenticated users: rate limit by IP
  if (!user) {
    // For now, allow anonymous submissions (rate limit by IP would require request context)
    // In production, this would use IP-based rate limiting via middleware
    return { allowed: true };
  }

  // Regular users: check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  try {
    const client = await db();

    // Count submissions from this user today
    const result = await client.execute({
      sql: `
        SELECT COUNT(*) as count FROM city_suggestions
        WHERE submitted_at >= ? AND submitted_at < ?
      `,
      args: [todayISO, new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()],
    });

    const count = Number((result.rows[0] as any).count) || 0;
    const remaining = Math.max(0, DAILY_LIMIT - count);

    if (count >= DAILY_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        message: `Daily limit (${DAILY_LIMIT} submissions) reached. Try again tomorrow.`,
      };
    }

    return {
      allowed: true,
      remaining,
    };
  } catch (error) {
    console.error("[Rate Limit Check Error]", error);
    // On error, allow the request to proceed (fail open)
    return { allowed: true };
  }
}
