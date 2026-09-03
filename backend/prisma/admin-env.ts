export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || 'admin@ticketing.local';
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_DEFAULT_PASSWORD?.trim() || 'Admin@12345';
}

export function getAdminName(): string {
  return process.env.ADMIN_NAME?.trim() || 'Admin User';
}
