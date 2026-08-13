# Story: Enforce authentication and block unauthenticated access

- **Epic**: Authentication & authorization (new)
- **Status**: planned
- **Size**: M
- **Scope**: backend | frontend

## User story
As a product owner, I want the app to require authentication before access, so that only approved users can use the application and data remains private.

## Acceptance criteria
- [ ] Unauthenticated users are redirected to login page on any route except `/login` and `/signup`
- [ ] Login/signup pages are accessible without authentication
- [ ] Session tokens are validated on every request
- [ ] Expired sessions redirect to login with helpful message
- [ ] Protected routes return 401 Unauthorized for invalid/missing tokens
- [ ] API endpoints require valid authentication headers
- [ ] No data is exposed in error messages (no user enumeration)
- [ ] Middleware is applied to all protected routes
- [ ] Docs/demo credentials are available in README for testing

## Notes
**Current state:** App appears fully usable without login; auth system exists but isn't enforced
**Root cause:** No middleware redirecting unauthenticated users
**Related:** ADR 0006 (auth tier separation)

**Testing checklist:**
- Try accessing /trips without login → redirect to /login
- Try accessing /destinations without login → redirect to /login
- Try accessing /compare without login → redirect to /login
- Session cookie not present → redirect to /login
- Expired session token → redirect to /login with message
- API call without auth header → 401 response

## Dependencies
- Email service configured (for verification emails)
- Session/JWT implementation already in place
