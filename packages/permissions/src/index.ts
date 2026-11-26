import type { SystemRole } from '@servicegrid/types';

export type Permission =
  | 'platform:manage'
  | 'org:manage'
  | 'users:manage'
  | 'customers:read'
  | 'customers:write'
  | 'work_orders:read'
  | 'work_orders:write'
  | 'work_orders:assign'
  | 'work_orders:execute'
  | 'inventory:read'
  | 'inventory:write'
  | 'finance:read'
  | 'finance:write'
  | 'amc:read'
  | 'amc:write'
  | 'analytics:read'
  | 'portal:access';

export const ROLE_PERMISSIONS: Record<SystemRole, readonly Permission[]> = {
  PLATFORM_SUPER_ADMIN: ['platform:manage', 'org:manage', 'analytics:read'],
  ORGANIZATION_OWNER: [
    'org:manage',
    'users:manage',
    'customers:read',
    'customers:write',
    'work_orders:read',
    'work_orders:write',
    'work_orders:assign',
    'inventory:read',
    'inventory:write',
    'finance:read',
    'finance:write',
    'amc:read',
    'amc:write',
    'analytics:read',
  ],
  ORGANIZATION_ADMIN: [
    'users:manage',
    'customers:read',
    'customers:write',
    'work_orders:read',
    'work_orders:write',
    'work_orders:assign',
    'inventory:read',
    'inventory:write',
    'finance:read',
    'finance:write',
    'amc:read',
    'amc:write',
    'analytics:read',
  ],
  OPERATIONS_MANAGER: [
    'customers:read',
    'customers:write',
    'work_orders:read',
    'work_orders:write',
    'work_orders:assign',
    'inventory:read',
    'amc:read',
    'amc:write',
    'analytics:read',
  ],
  DISPATCHER: ['customers:read', 'work_orders:read', 'work_orders:write', 'work_orders:assign'],
  TECHNICIAN: ['customers:read', 'work_orders:read', 'work_orders:execute', 'inventory:read'],
  ACCOUNTANT: ['customers:read', 'work_orders:read', 'finance:read', 'finance:write', 'amc:read'],
  INVENTORY_MANAGER: ['inventory:read', 'inventory:write', 'work_orders:read'],
  CUSTOMER: ['portal:access'],
};

export function hasPermission(roles: readonly SystemRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}
