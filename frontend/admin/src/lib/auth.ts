export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export const hasRole = (user: User | null, role: UserRole): boolean => {
  return user?.role === role;
};

export const hasAnyRole = (user: User | null, roles: UserRole[]): boolean => {
  return user ? roles.includes(user.role) : false;
};

export const hasPermission = (user: User | null, permission: string): boolean => {
  return user?.permissions.includes(permission) || false;
};

export const hasAnyPermission = (user: User | null, permissions: string[]): boolean => {
  return user ? permissions.some((p) => user.permissions.includes(p)) : false;
};

export const isAdmin = (user: User | null): boolean => {
  return hasAnyRole(user, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
};
