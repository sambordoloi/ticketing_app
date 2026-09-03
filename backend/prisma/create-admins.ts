import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getAdminPassword } from './admin-env';

const prisma = new PrismaClient();

const BUILTIN_ADMINS = [
  { email: 'samyajyoti@datacultr.com', name: 'Samyajyoti' },
  { email: 'sujoy@datacultr.com', name: 'Sujoy' },
  { email: 'pushpender.singh@datacultr.com', name: 'Pushpender Singh' },
];

function parseAdminsFromEnv(): { email: string; name: string }[] {
  const raw = process.env.ADMIN_USERS?.trim();
  if (!raw) return BUILTIN_ADMINS;

  return raw.split(',').map((entry) => {
    const [email, name] = entry.trim().split(':').map((s) => s.trim());
    if (!email) throw new Error(`Invalid ADMIN_USERS entry: "${entry}"`);
    return { email, name: name || email.split('@')[0] };
  });
}

async function main() {
  const admins = parseAdminsFromEnv();
  const password = getAdminPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const projects = await prisma.project.findMany();
  if (projects.length === 0) {
    console.log('No projects found. Create a project first or run db:seed.');
    return;
  }

  for (const admin of admins) {
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

    console.log(`✓ ${admin.email} — super admin + ADMIN on ${projects.length} project(s)`);
  }

  console.log(`\nAdmin password set via ADMIN_PASSWORD (or ADMIN_DEFAULT_PASSWORD).`);
  console.log('New admins must set their own password on first login.');
  if (process.env.REQUIRE_PASSWORD_CHANGE !== 'true') {
    console.log('To require password change for existing admins, run with REQUIRE_PASSWORD_CHANGE=true');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
