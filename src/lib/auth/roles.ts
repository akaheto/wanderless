import "server-only";

import { getCurrentUser } from "@/lib/auth";
import type { UserRole } from "@/lib/db/users";

/**
 * Check if the current user has a specific role
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Role hierarchy: owner > admin > user
  const roleHierarchy: Record<UserRole, number> = { user: 1, admin: 2, owner: 3 };
  const userRoleLevel = roleHierarchy[user.role];
  const requiredRoleLevel = roleHierarchy[requiredRole];

  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if the current user is an admin or owner
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? user.role === 'admin' || user.role === 'owner' : false;
}

/**
 * Check if the current user is the owner
 */
export async function isOwner(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'owner';
}

/**
 * Require a specific role, throw if not authorized
 */
export async function requireRole(requiredRole: UserRole): Promise<void> {
  if (!(await hasRole(requiredRole))) {
    throw new Error(`Unauthorized: requires ${requiredRole} role`);
  }
}

/**
 * Require admin access, throw if not authorized
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized: requires admin access');
  }
}

/**
 * Require owner access, throw if not authorized
 */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error('Unauthorized: requires owner access');
  }
}
