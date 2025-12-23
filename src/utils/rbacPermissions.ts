import rolesData from '../config/roles.config.js';

// Get permissions by role
export function getPermissionsByRole(roleName: string): string[] {
  const role = rolesData.roles.find(r => r.name === roleName);
  if (!role) {
    throw new Error(`Role "${roleName}" not found`);
  }
  return role.permissions;
}
