# Story: Email notifications for account verification and admin alerts

- **Epic**: Authentication & authorization (new)
- **Status**: planned
- **Size**: M
- **Scope**: backend

## User story
As a user, I want to receive email notifications for account verification so I can confirm my identity.
As a product owner, I want to be notified when new accounts are created so I can monitor sign-ups.

## Acceptance criteria

**Account Verification Emails:**
- [ ] Verification email sent immediately after signup
- [ ] Email contains verification link with expiring token (24hr)
- [ ] Token is single-use (invalid after first use)
- [ ] Verification link marks account as verified
- [ ] Resend verification email available on login if unverified
- [ ] Verified status is displayed in account settings

**New Account Creation Alerts:**
- [ ] Admin email configured in environment variables
- [ ] Email sent to admin immediately after new account signup
- [ ] Email includes: username, email, signup timestamp, IP address
- [ ] Email includes action buttons: approve/reject (if approval required)
- [ ] Admin can view pending accounts in dashboard
- [ ] Rate limiting on verification email resends (max 3 per hour)

**Email Template & Delivery:**
- [ ] Professional HTML email templates (branded)
- [ ] Email service provider configured (SendGrid / AWS SES / Resend)
- [ ] Failed delivery logged and retried
- [ ] Unsubscribe link not required (transactional only)
- [ ] Plain text fallback for email clients

## Notes
**Email flow:**
1. User signs up → Account created with `email_verified = false`
2. Verification email queued → Worker sends async
3. User clicks link → Token validated → Account verified
4. Admin email sent → Admin notified of new account

**Email service decision:** Recommend Resend (simple, free tier, good for SaaS)
- Alternative: SendGrid (more features, higher complexity)
- Alternative: AWS SES (cost-effective at scale, requires setup)

**Resend integration:**
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: "noreply@travel-intelligence-hub.com",
  to: user.email,
  subject: "Verify your email",
  html: template,
});
```

**Environment variables needed:**
- `RESEND_API_KEY` (or SendGrid key)
- `ADMIN_EMAIL` (where to send new account alerts)
- `APP_URL` (for verification links)

## Dependencies
- Email service provider account created
- Verification token/JWT implementation
- Email template design (use existing brand)
