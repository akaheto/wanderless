# Story: Admin dashboard and user management

- **Epic**: Authentication, authorization & compliance
- **Status**: planned
- **Size**: L
- **Scope**: backend | frontend

## User story
As an admin, I want a comprehensive dashboard to manage users, view audit logs, and monitor system health.

## Acceptance criteria

**Admin Dashboard:**
- [ ] New `/admin` dashboard page (redirect non-admins to home)
- [ ] Navigation tabs: Users, Audit Logs, System Health, Analytics
- [ ] Clean, professional UI matching app design system

**User Management:**
- [ ] List all users with: email, role, signup date, last login
- [ ] Search users by email
- [ ] Promote/demote users between roles (owner only)
- [ ] View user's trips and audit logs
- [ ] Disable/enable user accounts (future: soft delete)
- [ ] Export user list to CSV

**Audit Logs Display:**
- [ ] Real-time audit log viewer (already built, integrated here)
- [ ] Filter by: user, action, date range, resource type
- [ ] Export filtered logs to CSV for compliance
- [ ] Pagination (50 logs per page)

**System Health:**
- [ ] Database stats: total users, total trips, total audit logs
- [ ] Recent errors and warnings from application logs
- [ ] Email sending status and recent failures
- [ ] Last migration run date

**Analytics:**
- [ ] Signup trend (last 30 days)
- [ ] Active users (last 7 days)
- [ ] Most used features
- [ ] Error rate over time

## Notes

**Database queries needed:**
- COUNT(users), COUNT(trips), COUNT(audit_logs)
- Aggregate audit logs by action type
- User signup trend by date
- Last login tracking (add to audit logs or separate table)

**Email delivery monitoring:**
- Track email send failures in audit logs with error details
- Display recent failures with retry option

**Access control:**
- `/admin` routes require `isAdmin()` check
- Only `owner` role can promote/demote other users
- Admin can see all users, but not other admin's sensitive data

## Dependencies
- STORY-audit-logs.md (audit log display foundation)
- STORY-access-levels.md (role-based access control)
- Database schema stable (users, audit_logs, trips tables)
