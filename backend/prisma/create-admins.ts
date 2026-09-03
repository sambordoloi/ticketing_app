import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345';
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
      },
      update: {
        name: admin.name,
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

    console.log(`✓ ${admin.email} — ADMIN on ${projects.length} project(s)`);
  }

  console.log(`\nDefault password for new users: ${password}`);
  console.log('Set ADMIN_DEFAULT_PASSWORD to use a custom password.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
