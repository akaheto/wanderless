# Story: Audit logging for app activity tracking and compliance

- **Epic**: Authentication & authorization (new)
- **Status**: planned
- **Size**: M
- **Scope**: backend | frontend

## User story
As a product owner, I want to audit log all app activity so that I can track user actions, debug issues, and maintain compliance records.

## Acceptance criteria

**Audit Log Table:**
- [ ] Database table `audit_logs` with schema: id, user_id, action, resource_type, resource_id, changes, ip_address, user_agent, timestamp
- [ ] Automatic indexing on user_id, action, timestamp
- [ ] Retention policy: logs kept for 90 days minimum
- [ ] Soft deletes: no logs are deleted, marked as archived after retention

**Events Logged:**
- [ ] User login (success and failure)
- [ ] User logout
- [ ] Account created / deleted
- [ ] Password changed
- [ ] Email changed
- [ ] Role modified
- [ ] Trip created / updated / deleted
- [ ] Destination downloaded (offline)
- [ ] Sync queue replayed
- [ ] Admin actions (user promotion, content moderation)

**Log Entry Format:**
```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE_TRIP' | 'DELETE_TRIP' | etc;
  resourceType: 'user' | 'trip' | 'destination' | etc;
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

**Admin Dashboard:**
- [ ] New "/admin/audit-logs" page accessible to admin+ users
- [ ] Filterable by: user, action, resource type, date range
- [ ] Sortable by timestamp (newest first)
- [ ] Pagination (50 logs per page)
- [ ] Export to CSV for compliance
- [ ] Search by user email or resource ID
- [ ] Real-time log streaming (optional)

**Security & Privacy:**
- [ ] Logs do NOT contain passwords or sensitive data
- [ ] Logs do NOT expose other users' information (filter by current user if not admin)
- [ ] Admin logs are themselves logged (admin creating/deleting accounts is audited)
- [ ] Timestamps use UTC
- [ ] No logs deleted, only archived

**API Endpoints:**
- [ ] `GET /admin/audit-logs?action=LOGIN&user_id=X&limit=50` - list logs
- [ ] `GET /admin/audit-logs/export` - export as CSV
- [ ] `GET /admin/audit-logs/stats` - summary stats (logins today, errors, etc)

## Notes
**Logging implementation:**
```typescript
// Utility function
async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  req: Request,
  changes?: any
) {
  await db.insert(auditLogs).values({
    userId,
    action,
    resourceType,
    changes,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date(),
  });
}

// Usage in server action
export async function createTrip(data: TripData) {
  const trip = await db.insert(trips).values(data).returning();
  await logAudit(user.id, 'CREATE_TRIP', 'trip', req, {
    after: trip,
  });
  return trip;
}
```

**Compliance use cases:**
- GDPR: User can request export of their own audit logs
- SOC 2: Admin can export logs for compliance audits
- Debugging: Trace user actions that led to issue
- Security: Detect suspicious activity patterns

## Dependencies
- STORY-access-levels.md (need admin role to view logs)
- Database migration for audit_logs table
- Dashboard/UI components
