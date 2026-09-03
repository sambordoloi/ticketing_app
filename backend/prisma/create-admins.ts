import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  getAdminList,
  getAdminPassword,
  shouldSyncAdminPassword,
} from './admin-env';

const prisma = new PrismaClient();

async function main() {
  const admins = getAdminList();
  const password = getAdminPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const projects = await prisma.project.findMany();
  if (projects.length === 0) {
    console.log('No projects found. Create a project first or run db:seed.');
    return;
  }

  for (const admin of admins) {
    const existing = await prisma.user.findUnique({ where: { email: admin.email } });
    const syncPassword = shouldSyncAdminPassword(existing, !existing);

    const user = await prisma.user.upsert({
      where: { email: admin.email },
      create: {
        email: admin.email,
        name: admin.name,
        passwordHash,
        isSuperAdmin: true,
        mustChangePassword: true,
      },
      update: {
        name: admin.name,
        isSuperAdmin: true,
        ...(syncPassword ? { passwordHash, mustChangePassword: true } : {}),
        ...(process.env.REQUIRE_PASSWORD_CHANGE === 'true' ? { mustChangePassword: true } : {}),
      },
    });

    for (const project of projects) {
      await prisma.projectMember.upsert({
        where: {
          userId_projectId: { userId: user.id, projectId: project.id },
        },
        create: {
          userId: user.id,
          projectId: project.id,
          role: 'ADMIN',
        },
        update: {
          role: 'ADMIN',
        },
      });
    }

    const passwordNote = syncPassword ? `password synced from ADMIN_PASSWORD` : 'password unchanged';
    console.log(`✓ ${admin.email} — super admin + ADMIN on ${projects.length} project(s) (${passwordNote})`);
  }

  console.log(`\nAdmin credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in .env`);
  console.log('Set SYNC_ADMIN_PASSWORD=true to reset passwords for admins who already changed theirs.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
