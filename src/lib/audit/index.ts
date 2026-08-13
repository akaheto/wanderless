import 'server-only';

import { db } from '@/lib/db/client';
import type { Row } from '@libsql/client';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_CHANGED'
  | 'ROLE_MODIFIED'
  | 'TRIP_CREATED'
  | 'TRIP_UPDATED'
  | 'TRIP_DELETED'
  | 'DESTINATION_DOWNLOADED'
  | 'SYNC_QUEUE_REPLAYED'
  | 'ADMIN_ACTION';

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

function toAuditLog(row: Row): AuditLog {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    action: String(row.action) as AuditAction,
    resourceType: String(row.resource_type),
    resourceId: row.resource_id ? String(row.resource_id) : undefined,
    changes: row.changes ? JSON.parse(String(row.changes)) : undefined,
    ipAddress: row.ip_address ? String(row.ip_address) : undefined,
    userAgent: row.user_agent ? String(row.user_agent) : undefined,
    timestamp: String(row.timestamp),
  };
}

/**
 * Log an audit event
 */
export async function logAudit(
  userId: string,
  action: AuditAction,
  resourceType: string,
  options?: {
    resourceId?: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  const client = await db();
  const { randomBytes } = await import('crypto');
  const id = randomBytes(12).toString('hex');
  const timestamp = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, changes, ip_address, user_agent, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      action,
      resourceType,
      options?.resourceId ?? null,
      options?.changes ? JSON.stringify(options.changes) : null,
      options?.ipAddress ?? null,
      options?.userAgent ?? null,
      timestamp,
    ],
  });
}

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(options?: {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLog[]> {
  const client = await db();
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const args: (string | number)[] = [];

  if (options?.userId) {
    sql += ' AND user_id = ?';
    args.push(options.userId);
  }

  if (options?.action) {
    sql += ' AND action = ?';
    args.push(options.action);
  }

  if (options?.resourceType) {
    sql += ' AND resource_type = ?';
    args.push(options.resourceType);
  }

  sql += ' ORDER BY timestamp DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    args.push(options.limit);
    if (options?.offset) {
      sql += ' OFFSET ?';
      args.push(options.offset);
    }
  }

  const result = await client.execute({
    sql,
    args: args as (string | number | null)[],
  });
  return result.rows.map((row: Row) => toAuditLog(row));
}

/**
 * Get total count of audit logs (for pagination)
 */
export async function countAuditLogs(options?: {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
}): Promise<number> {
  const client = await db();
  let sql = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
  const args: (string | number)[] = [];

  if (options?.userId) {
    sql += ' AND user_id = ?';
    args.push(options.userId);
  }

  if (options?.action) {
    sql += ' AND action = ?';
    args.push(options.action);
  }

  if (options?.resourceType) {
    sql += ' AND resource_type = ?';
    args.push(options.resourceType);
  }

  const result = await client.execute({
    sql,
    args: args as (string | number | null)[],
  });
  return Number(result.rows[0]?.count || 0);
}

/**
 * Archive old audit logs (keep last N days)
 */
export async function archiveOldAuditLogs(retentionDays: number = 90): Promise<number> {
  const client = await db();
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const result = await client.execute({
    sql: 'DELETE FROM audit_logs WHERE timestamp < ?',
    args: [cutoffDate],
  });

  return result.rowsAffected;
}

/**
 * Get recent audit logs (convenience function)
 */
export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  return getAuditLogs({ limit });
}
