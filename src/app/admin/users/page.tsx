'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui';
import type { UserRole } from '@/lib/db/users';

interface User {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating user');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResendVerification = async (userId: string, email: string) => {
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }

      setError('');
      alert(`Verification email sent to ${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resending verification');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete ${email}? This cannot be undone.`)) {
      return;
    }

    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers();
      alert(`User ${email} has been deleted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting user');
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-critical/10 text-critical';
      case 'admin':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-surface-2 text-ink';
    }
  };

  return (
    <div className="space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="mt-2 text-ink-3">Manage user roles and permissions</p>
      </div>

      {error && (
        <div className="rounded-lg border border-critical bg-critical/10 px-4 py-3 text-critical">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-line bg-surface-1 px-6 py-12 text-center text-ink-3">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface-1 px-6 py-12 text-center text-ink-3">
          No users yet.
        </div>
      ) : (
        <Card>
          <CardHeader title={`Users (${users.length})`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-3 text-left font-semibold text-ink">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink">Verified</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink">Joined</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line hover:bg-surface-1">
                    <td className="px-4 py-3 text-ink-2">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={updatingId === user.id}
                        className={`rounded px-2 py-1 text-sm font-medium ${getRoleColor(user.role)}`}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-good">
                          ✓ Yes
                        </span>
                      ) : (
                        <span className="text-ink-3">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-3">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {!user.emailVerified && (
                        <button
                          onClick={() => handleResendVerification(user.id, user.email)}
                          disabled={updatingId === user.id}
                          className="text-accent hover:underline disabled:opacity-50 text-sm"
                        >
                          {updatingId === user.id ? '...' : 'Resend email'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={updatingId === user.id}
                        className="text-critical hover:underline disabled:opacity-50 text-sm"
                      >
                        {updatingId === user.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Role Hierarchy" />
        <div className="space-y-3 px-4 py-4 text-sm">
          <div>
            <p className="font-semibold text-ink">User</p>
            <p className="text-ink-3">Regular user - can create trips, suggest cities (10/day limit)</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Admin</p>
            <p className="text-ink-3">Can review city suggestions, view audit logs, unlimited submissions</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Owner</p>
            <p className="text-ink-3">Can manage users, change roles, full system access</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
