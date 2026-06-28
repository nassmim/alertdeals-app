// ============================================================================
// ADMIN ROLES (platform-level)
// ============================================================================
// Plateforme-level admin roles, distinct from any team membership role.
// A `null` admin_role on an account means a regular user with no admin rights.

export const ADMIN_ROLE_DEFINITIONS = [
  {
    key: 'ADMIN',
    value: 'admin',
    label: 'Admin',
    description: 'Peut inviter de nouveaux utilisateurs',
  },
  {
    key: 'SUPER_ADMIN',
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Peut inviter et valider les utilisateurs auto-inscrits',
  },
] as const;

// Enum-like constant access (e.g., EAdminRole.SUPER_ADMIN)
export const EAdminRole = Object.fromEntries(
  ADMIN_ROLE_DEFINITIONS.map((role) => [role.key, role.value]),
) as {
  [K in (typeof ADMIN_ROLE_DEFINITIONS)[number]['key']]: Extract<
    (typeof ADMIN_ROLE_DEFINITIONS)[number],
    { key: K }
  >['value'];
};

export type TAdminRole = (typeof ADMIN_ROLE_DEFINITIONS)[number]['value'];

export const ADMIN_ROLE_VALUES = ADMIN_ROLE_DEFINITIONS.map((r) => r.value) as [
  TAdminRole,
  ...TAdminRole[],
];
