const BUILTIN_ADMINS = [
  { email: 'samyajyoti@datacultr.com', name: 'Samyajyoti' },
  { email: 'sujoy@datacultr.com', name: 'Sujoy' },
  { email: 'pushpender.singh@datacultr.com', name: 'Pushpender Singh' },
];

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || 'admin@ticketing.local';
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_DEFAULT_PASSWORD?.trim() || 'Admin@12345';
}

export function getAdminName(): string {
  return process.env.ADMIN_NAME?.trim() || 'Admin User';
}

export function getAdminList(): { email: string; name: string }[] {
  const raw = process.env.ADMIN_USERS?.trim();
  if (raw) {
    return raw.split(',').map((entry) => {
      const [email, name] = entry.trim().split(':').map((s) => s.trim());
      if (!email) throw new Error(`Invalid ADMIN_USERS entry: "${entry}"`);
      return { email, name: name || email.split('@')[0] };
    });
  }

  const primary = { email: getAdminEmail(), name: getAdminName() };

  // Custom ADMIN_EMAIL = only that admin. Default local email keeps built-in datacultr admins too.
  if (getAdminEmail() !== 'admin@ticketing.local') {
    return [primary];
  }

  const seen = new Set<string>();
  return [primary, ...BUILTIN_ADMINS].filter((admin) => {
    if (seen.has(admin.email)) return false;
    seen.add(admin.email);
    return true;
  });
}

export function shouldSyncAdminPassword(
  existing: { mustChangePassword: boolean } | null,
  isCreate: boolean
): boolean {
  if (isCreate) return true;
  if (process.env.SYNC_ADMIN_PASSWORD === 'true') return true;
  return existing?.mustChangePassword ?? false;
}
