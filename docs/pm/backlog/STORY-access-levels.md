# Story: Role-based access control (RBAC) with user and admin levels

- **Epic**: Authentication & authorization (new)
- **Status**: planned
- **Size**: L
- **Scope**: backend | frontend

## User story
As a product owner, I want to implement role-based access control so that I can have admin-level privileges while regular users have restricted access.

## Acceptance criteria

**User Roles:**
- [ ] Three user roles implemented: `user`, `admin`, `owner`
- [ ] Roles stored in database and JWT tokens
- [ ] Role defaults to `user` on signup
- [ ] Role can only be changed by `owner` or `admin`

**User Role (standard):**
- [ ] Can create and manage own trips
- [ ] Can search destinations
- [ ] Can view own account settings
- [ ] Cannot access other users' data
- [ ] Cannot access audit logs
- [ ] Cannot modify destination catalog

**Admin Role:**
- [ ] All `user` permissions
- [ ] Can view audit logs of all activity
- [ ] Can view list of all users
- [ ] Can moderate user-submitted content (destination suggestions)
- [ ] Can view system health/status
- [ ] Can trigger data backups
- [ ] Cannot delete accounts (only `owner`)

**Owner Role:**
- [ ] All `admin` permissions
- [ ] Can promote/demote users to admin
- [ ] Can delete user accounts
- [ ] Can modify system settings
- [ ] Can view billing/usage metrics
- [ ] Can export/download audit logs

**Role-Based Middleware:**
- [ ] Route protection middleware: `requireAuth`, `requireAdmin`, `requireOwner`
- [ ] API endpoints validate role on request
- [ ] Error responses don't leak role information
- [ ] Role checks logged to audit trail

**Frontend UI Adjustments:**
- [ ] Admin panel link visible only for admin+ users
- [ ] Settings menu shows role badge
- [ ] Admin-only actions hidden from regular users
- [ ] Error message for permission denied: "You don't have access to this feature"

## Notes
**Database schema:**
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
-- Index for role queries
CREATE INDEX idx_users_role ON users(role);
```

**JWT payload includes role:**
```typescript
const token = jwt.sign({
  id: user.id,
  email: user.email,
  role: user.role,  // NEW
}, SECRET);
```

**Middleware example:**
```typescript
export const requireAdmin = (req: Request) => {
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    throw new Error('Unauthorized');
  }
};
```

**Initial setup:**
- First account created should be promoted to `owner` manually
- Instructions in README for CLI command: `pnpm db:promote-owner <email>`

## Dependencies
- STORY-authentication-enforcement.md (auth must be enforced first)
- STORY-audit-logs.md (audit system needed for logging)
- User table must have `role` column
