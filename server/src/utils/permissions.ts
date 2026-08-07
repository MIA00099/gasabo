// Maps the SubAdministrator.permissions JSON array (e.g. ["PRODUCTS","SELLERS"])
// into the boolean permission map the frontend expects to render toggle matrices with.

const PERMISSION_KEYS = [
  'product_mgmt',
  'seller_mgmt',
  'category_mgmt',
  'banner_mgmt',
  'realestate_content',
  'reports',
  'user_mgmt',
  'system_settings',
] as const;

const MODULE_TO_KEY: Record<string, (typeof PERMISSION_KEYS)[number]> = {
  PRODUCTS: 'product_mgmt',
  SELLERS: 'seller_mgmt',
  CATEGORIES: 'category_mgmt',
  ADVERTISEMENTS: 'banner_mgmt',
  REAL_ESTATE_CONTENT: 'realestate_content',
  REPORTS: 'reports',
  USERS: 'user_mgmt',
  SYSTEM_SETTINGS: 'system_settings',
};

export function fullPermissions(): Record<string, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]));
}

export function permissionsFromModuleList(modules: string[]): Record<string, boolean> {
  const map = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false]));
  for (const mod of modules) {
    const key = MODULE_TO_KEY[mod];
    if (key) map[key] = true;
  }
  return map;
}
