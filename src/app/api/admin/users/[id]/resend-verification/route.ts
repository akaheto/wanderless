import { requireOwner } from '@/lib/auth/roles';
import { db } from '@/lib/db/client';
import { sendVerificationEmail } from '@/lib/email';
import { randomBytes } from 'node:crypto';
import { logAudit } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner();

    const { id } = await params;
    const currentUser = await getCurrentUser();
    const client = await db();

    // Get user
    const userResult = await client.execute({
      sql: 'SELECT email FROM users WHERE id = ?',
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0] as any;

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Update token
    await client.execute({
      sql: 'UPDATE users SET verification_token = ?, verification_token_expires_at = ? WHERE id = ?',
      args: [verificationToken, tokenExpiresAt, id],
    });

    // Send email
    await sendVerificationEmail(user.email, verificationToken);

    // Log audit
    if (currentUser) {
      await logAudit(currentUser.id, 'ADMIN_ACTION', 'user', {
        resourceId: id,
        changes: { action: 'resend_verification_email' },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error resending verification:', error);
    return Response.json({ error: 'Failed to resend verification' }, { status: 500 });
  }
}
