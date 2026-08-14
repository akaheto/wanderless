import { requireOwner } from '@/lib/auth/roles';
import { db } from '@/lib/db/client';
import { logAudit } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth';
import type { UserRole } from '@/lib/db/users';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner();

    const { id } = await params;
    const { role } = await request.json();

    if (!['user', 'admin', 'owner'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    const client = await db();

    // Get current user for audit
    const currentUser = await getCurrentUser();

    // Update user role
    await client.execute({
      sql: 'UPDATE users SET role = ? WHERE id = ?',
      args: [role, id],
    });

    // Log audit event
    if (currentUser) {
      await logAudit(currentUser.id, 'ROLE_MODIFIED', 'user', {
        resourceId: id,
        changes: { role },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error updating user role:', error);
    return Response.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner();

    const { id } = await params;
    const currentUser = await getCurrentUser();
    const client = await db();

    // Get user email for audit log
    const userResult = await client.execute({
      sql: 'SELECT email FROM users WHERE id = ?',
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0] as any;

    // Delete user's sessions first
    await client.execute({
      sql: 'DELETE FROM sessions WHERE user_id = ?',
      args: [id],
    });

    // Delete user
    await client.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id],
    });

    // Log audit event
    if (currentUser) {
      await logAudit(currentUser.id, 'ADMIN_ACTION', 'user', {
        resourceId: id,
        changes: { action: 'delete', email: user.email },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error deleting user:', error);
    return Response.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
