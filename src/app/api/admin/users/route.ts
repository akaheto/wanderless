import { requireAdmin } from '@/lib/auth/roles';
import { db } from '@/lib/db/client';
import type { UserRole } from '@/lib/db/users';

export async function GET() {
  try {
    await requireAdmin();

    const client = await db();
    const result = await client.execute({
      sql: `SELECT id, email, role, email_verified, created_at FROM users ORDER BY created_at DESC`,
    });

    const users = result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      emailVerified: row.email_verified === 1,
      createdAt: row.created_at,
    }));

    return Response.json({ users, total: users.length });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error fetching users:', error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
