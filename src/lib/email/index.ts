import 'server-only';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@wanderless.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wanderless.vercel.app';

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
          <p>Welcome to Wanderless! Click the link below to verify your email address and complete your registration.</p>
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
    subject: 'Verify your Wanderless account',
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

/**
 * Send user notification when their suggested city is researched and approved
 */
export async function sendCityApprovedNotification(
  userEmail: string,
  city: string,
  country: string,
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .success { background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; border-radius: 4px; margin-bottom: 20px; }
          .city-info { background: #f9fafb; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .cta { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <strong>✓ Your city suggestion was approved!</strong>
          </div>
          <p>Great news! Your suggestion for <strong>${city}, ${country}</strong> has been researched and is now available in the Wanderless destination catalog.</p>
          <div class="city-info">
            <p><strong>What's included:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Hotel pricing data from verified sources</li>
              <li>Flight availability and travel times</li>
              <li>Visa requirements and travel documents</li>
              <li>Climate data and best times to visit</li>
            </ul>
          </div>
          <p>You can now compare <strong>${city}</strong> with other destinations and use it in your trip planning.</p>
          <a href="${APP_URL}/destinations" class="cta">View Destination Catalog</a>
          <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            Thank you for helping expand the Wanderless catalog! Have another city in mind? You can submit up to 10 suggestions per day.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `${city}, ${country} is now in Wanderless!`,
    html,
  });
}

/**
 * Send user notification when their suggested city is rejected
 */
export async function sendCityRejectedNotification(
  userEmail: string,
  city: string,
  country: string,
  reason: string,
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .notice { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 20px; }
          .reason { background: #f9fafb; padding: 15px; border-radius: 4px; margin: 15px 0; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="notice">
            <strong>City suggestion status update</strong>
          </div>
          <p>Thank you for suggesting <strong>${city}, ${country}</strong> for Wanderless!</p>
          <p>After review, we've decided not to add it to our catalog at this time.</p>
          <div class="reason">
            <strong>Reason:</strong> ${reason}
          </div>
          <p>We appreciate your input and encourage you to suggest other destinations you'd like to explore. You can submit up to 10 suggestions per day.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            If you believe this was rejected in error, please reply to this email or contact support@wanderless.app.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Update on your ${city} suggestion`,
    html,
  });
}
