import prisma from './prisma';

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin ?? false;
}

export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  if (await isSuperAdmin(userId)) return true;
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return !!member;
}

export async function canAdminProject(userId: string, projectId: string): Promise<boolean> {
  if (await isSuperAdmin(userId)) return true;
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return member?.role === 'ADMIN';
}

export async function isAnyAdmin(userId: string): Promise<boolean> {
  if (await isSuperAdmin(userId)) return true;
  const member = await prisma.projectMember.findFirst({
    where: { userId, role: 'ADMIN' },
  });
  return !!member;
}

export async function syncSuperAdminsToProject(projectId: string) {
  const superAdmins = await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: { id: true },
  });

  for (const admin of superAdmins) {
    await prisma.projectMember.upsert({
      where: { userId_projectId: { userId: admin.id, projectId } },
      create: { userId: admin.id, projectId, role: 'ADMIN' },
      update: { role: 'ADMIN' },
    });
  }
}

export const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  isSuperAdmin: true,
  mustChangePassword: true,
} as const;
