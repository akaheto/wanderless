# Story: Email verification resend and retry mechanism

- **Epic**: Authentication, authorization & compliance
- **Status**: planned
- **Size**: M
- **Scope**: backend | frontend

## User story
As a user, I want to resend verification emails if I didn't receive the first one, so I can complete account verification.

## Acceptance criteria

**Resend Verification Email:**
- [ ] `/verify/resend` endpoint (POST) accepts email, returns confirmation
- [ ] Rate limiting: max 3 resend requests per hour per email
- [ ] Email must exist and not already be verified
- [ ] New verification token generated with fresh 24-hour expiration
- [ ] Success message: "Verification email sent. Check your inbox."
- [ ] Error messages: email not found, already verified, rate limited

**Login Page Integration:**
- [ ] "Resend verification email" button in error state when email not verified
- [ ] Pre-fills email field if user just signed up
- [ ] Shows countdown timer if rate limited (e.g., "Try again in 45 minutes")

**Email Retry Mechanism:**
- [ ] Track email send failures in audit logs
- [ ] Automatic retry for failed sends (exponential backoff: 5s, 30s, 2min)
- [ ] Max 3 retry attempts before marking as failed
- [ ] Manual retry button in admin dashboard for failed sends
- [ ] Notification to admin if critical service (verification email) failing

**Verification Completion:**
- [ ] `/verify?token=...` endpoint validates token and marks email as verified
- [ ] Token expiration check (24 hours)
- [ ] Redirect to login with success message after verification
- [ ] Token can only be used once (mark as used in database)
- [ ] Log EMAIL_VERIFIED event to audit trail

## Notes

**Rate limiting implementation:**
```typescript
// Track resend attempts in database or Redis
const attempts = await getResendAttempts(email);
if (attempts >= 3 && timeSinceFirstAttempt < 1 hour) {
  throw new Error('Too many resend attempts. Try again later.');
}
```

**Email retry strategy:**
- Use a background job queue (simple: check pending emails on server startup)
- Or use cron job to retry failed emails every 5 minutes
- Store failed email attempts with error details for debugging

**User experience:**
- Don't make verification blocking — users can still use app but with limited features
- Show banner: "Please verify your email to unlock full features"
- Verification token in URL so users can click and verify without re-entering credentials

## Dependencies
- STORY-email-notifications.md (email sending foundation)
- Database: users table with verification_token, verification_token_expires_at
- Email service configured (Resend API)
