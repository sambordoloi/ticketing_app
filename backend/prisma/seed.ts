import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getAdminEmail, getAdminName, getAdminPassword } from './admin-env';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = getAdminEmail();
  const passwordHash = await bcrypt.hash(getAdminPassword(), 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: getAdminName(),
      passwordHash,
      isSuperAdmin: true,
      mustChangePassword: false,
    },
    update: {
      name: getAdminName(),
      isSuperAdmin: true,
    },
  });

  const existingProject = await prisma.project.findUnique({ where: { key: 'DEMO' } });
  if (existingProject) {
    console.log(`Seed skipped — demo project already exists. Admin: ${adminEmail}`);
    return;
  }

  const project = await prisma.project.create({
    data: {
      key: 'DEMO',
      name: 'Demo Project',
      description: 'A sample project to get started with paysoc-jira',
      members: {
        create: { userId: admin.id, role: 'ADMIN' },
      },
    },
  });

  await prisma.issue.createMany({
    data: [
      {
        key: 'DEMO-1',
        title: 'Set up development environment',
        description: 'Clone the repo and run docker-compose up',
        gitCommitId: 'a1b2c3d4e5f6',
        status: 'DONE',
        priority: 'HIGH',
        type: 'TASK',
        projectId: project.id,
        reporterId: admin.id,
        assigneeId: admin.id,
      },
      {
        key: 'DEMO-2',
        title: 'Invite team members',
        description: 'Use the invite feature to add your team',
        gitCommitId: 'f6e5d4c3b2a1',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        type: 'STORY',
        projectId: project.id,
        reporterId: admin.id,
        assigneeId: admin.id,
      },
      {
        key: 'DEMO-3',
        title: 'Fix login redirect bug',
        description: 'Users are not redirected after login on mobile',
        gitCommitId: '1234567890ab',
        status: 'TODO',
        priority: 'HIGH',
        type: 'BUG',
        projectId: project.id,
        reporterId: admin.id,
        assigneeId: admin.id,
      },
      {
        key: 'DEMO-4',
        title: 'Design dashboard UI',
        description: 'Create mockups for the project dashboard',
        gitCommitId: 'abcdef123456',
        status: 'IN_REVIEW',
        priority: 'LOW',
        type: 'TASK',
        projectId: project.id,
        reporterId: admin.id,
        assigneeId: admin.id,
      },
    ],
  });

  console.log(`Seed complete. Admin: ${adminEmail}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
