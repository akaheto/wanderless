# Story: Compliance and data export tools

- **Epic**: Authentication, authorization & compliance
- **Status**: planned
- **Size**: M
- **Scope**: backend | frontend

## User story
As a user, I want to export my data and delete my account for GDPR compliance. As an admin, I want audit logs and compliance reports for SOC 2 audits.

## Acceptance criteria

**User Data Export (GDPR):**
- [ ] `/account/export` page accessible to authenticated users
- [ ] One-click "Export My Data" button
- [ ] Generates ZIP file containing:
  - User profile (email, role, signup date)
  - All trips (as JSON)
  - All personal notes, preferences, events
  - All audit logs related to user
  - All bookmarks/saved places
- [ ] Data in portable JSON format
- [ ] File ready for download within 60 seconds
- [ ] Log DATA_EXPORT audit event
- [ ] Email confirmation sent to user

**Account Deletion (Right to be Forgotten):**
- [ ] `/account/delete` page with confirmation
- [ ] Warning: "This action is permanent. All your data will be deleted."
- [ ] Require password confirmation to prevent accidental deletion
- [ ] 7-day grace period option: "Delete in 7 days" vs "Delete immediately"
- [ ] During grace period, account marked as "pending deletion"
- [ ] User can cancel deletion during grace period
- [ ] After deletion: anonymize audit logs (keep for legal, but remove PII)
- [ ] Log ACCOUNT_DELETED event with reason

**Compliance Reports (Admin):**
- [ ] `/admin/compliance` page (admin only)
- [ ] Generate SOC 2 Type II reports:
  - User access logs (last 90 days)
  - Admin actions and permission changes
  - System changes and migrations
  - Security events (failed logins, role changes)
- [ ] Export to PDF for auditors
- [ ] Date range picker for custom reports
- [ ] Pre-built reports: Last 30/90/180 days

**Data Retention Policy:**
- [ ] Audit logs: Kept for 90+ days, then archived
- [ ] Deleted user data: Completely removed (except anonymized audit trail)
- [ ] Trip data: Kept indefinitely unless user deletes
- [ ] Email logs: Kept for 7 days for bounce detection
- [ ] Failed login attempts: Kept for 30 days

**Privacy Policy & Terms:**
- [ ] Link to `/privacy` and `/terms` pages
- [ ] Clear data retention statement
- [ ] Opt-in tracking/analytics disclosure
- [ ] GDPR/CCPA compliance statement

## Notes

**Data export format:**
```json
{
  "user": { "id": "...", "email": "...", "role": "..." },
  "trips": [...],
  "events": [...],
  "audit_logs": [...]
}
```

**Anonymization for deleted users:**
```sql
UPDATE audit_logs 
SET user_id = 'deleted-' || id, changes = '{}' 
WHERE user_id = ?;
```

**Grace period cancellation:**
- Cron job runs daily to delete users with pending_deletion = true AND deletion_date < now()
- Or use soft delete: deleted_at timestamp, exclude from queries, hard delete after 90 days

**GDPR Article 17 (Right to Erasure):**
- Must honor deletion requests within 30 days
- Must delete all PII except for legal/compliance records
- Audit logs can be kept but must be anonymized

## Dependencies
- Authentication system (user accounts)
- Audit logging system (audit_logs table)
- Trip CRUD operations (all user data retrieval)
- Email service (confirmation emails)
- PDF generation library (for compliance reports)

## Out of Scope
- CCPA Right to Know (Phase 2)
- Data portability to third-party services (Phase 2)
- Automated compliance reporting to regulators (Phase 3)
