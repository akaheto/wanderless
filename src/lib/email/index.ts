/**
 * Email sending utility.
 *
 * For now, logs to console. Ready for integration with Resend or SendGrid:
 * - Resend: https://resend.com
 * - SendGrid: https://sendgrid.com
 */

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?token=${token}`;

  const emailBody = `
Hi there,

Welcome to Travel Intelligence Hub! Please verify your email address to get started.

Click the link below to verify your email:
${verifyUrl}

This link expires in 24 hours.

If you didn't create this account, you can safely ignore this email.

Best,
Travel Intelligence Hub
  `.trim();

  // Log email (ready to swap for real email service)
  console.log(`[EMAIL VERIFICATION]`);
  console.log(`To: ${email}`);
  console.log(`Subject: Verify your Travel Intelligence Hub email`);
  console.log(`Body:\n${emailBody}`);
  console.log(`---`);
}
