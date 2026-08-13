import 'server-only';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@travel-intelligence-hub.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://travel-intelligence-hub.vercel.app';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send email using Resend API (or log if not configured)
 */
export async function sendEmail({ to, subject, html, from = FROM_EMAIL }: SendEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn(`[EMAIL] Skipping email (no RESEND_API_KEY): to=${to}, subject=${subject}`);
    return true; // Don't fail silently
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[EMAIL] Failed to send: ${response.status} - ${error}`);
      return false;
    }

    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending:', error);
    return false;
  }
}

/**
 * Send account verification email
 */
export async function sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
  const verificationUrl = `${APP_URL}/verify?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
          .button { background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify your email</h1>
          </div>
          <p>Welcome to Travel Intelligence Hub! Click the link below to verify your email address and complete your registration.</p>
          <p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </p>
          <p>Or paste this link in your browser:<br><code>${verificationUrl}</code></p>
          <p>This link expires in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create this account, you can ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify your Travel Intelligence Hub account',
    html,
  });
}

/**
 * Send admin notification for new account signup
 */
export async function sendAdminNewAccountAlert(email: string, createdAt: string): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    console.warn('[EMAIL] Skipping admin alert (no ADMIN_EMAIL configured)');
    return true;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #f0f7ff; padding: 15px; border-left: 4px solid #0066cc; border-radius: 4px; margin-bottom: 20px; }
          .details { background: #f5f5f5; padding: 15px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <strong>New account signup</strong>
          </div>
          <div class="details">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Created:</strong> ${new Date(createdAt).toISOString()}</p>
          </div>
          <p>
            <a href="${APP_URL}/admin/users">View in admin dashboard</a>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New account signup: ${email}`,
    html,
  });
}
