/**
 * Promote a user to admin role
 * Usage: npx ts-node scripts/make-admin.ts <email>
 */

import { createClient } from '@libsql/client';

async function makeAdmin(email: string) {
  const dbUrl = process.env.TURSO_DB_URL;
  const dbToken = process.env.TURSO_DB_AUTH_TOKEN;

  if (!dbUrl || !dbToken) {
    console.error('Error: TURSO_DB_URL and TURSO_DB_AUTH_TOKEN env vars required');
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken: dbToken });

  try {
    // Get user info before update
    const getUserResult = await client.execute({
      sql: 'SELECT id, email, role FROM users WHERE email = ?',
      args: [email],
    });

    if (getUserResult.rows.length === 0) {
      console.error(`Error: User with email "${email}" not found`);
      process.exit(1);
    }

    const user = getUserResult.rows[0];
    console.log(`Found user: ${user.email} (ID: ${user.id}), current role: ${user.role}`);

    // Update role to admin
    await client.execute({
      sql: 'UPDATE users SET role = ? WHERE email = ?',
      args: ['admin', email],
    });

    // Verify update
    const updateResult = await client.execute({
      sql: 'SELECT id, email, role FROM users WHERE email = ?',
      args: [email],
    });

    const updatedUser = updateResult.rows[0];
    console.log(`✓ Updated ${updatedUser.email} to role: ${updatedUser.role}`);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx ts-node scripts/make-admin.ts <email>');
  process.exit(1);
}

makeAdmin(email);
