import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@ticketing.local' } });
  if (existing) {
    console.log('Seed data already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ticketing.local',
      name: 'Admin User',
      passwordHash,
    },
  });

  const project = await prisma.project.create({
    data: {
      key: 'DEMO',
      name: 'Demo Project',
      description: 'A sample project to get started with Ticketing App',
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
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        type: 'STORY',
        projectId: project.id,
        reporterId: admin.id,
      },
      {
        key: 'DEMO-3',
        title: 'Fix login redirect bug',
        description: 'Users are not redirected after login on mobile',
        status: 'TODO',
        priority: 'HIGH',
        type: 'BUG',
        projectId: project.id,
        reporterId: admin.id,
      },
      {
        key: 'DEMO-4',
        title: 'Design dashboard UI',
        description: 'Create mockups for the project dashboard',
        status: 'IN_REVIEW',
        priority: 'LOW',
        type: 'TASK',
        projectId: project.id,
        reporterId: admin.id,
        assigneeId: admin.id,
      },
    ],
  });

  console.log('Seed complete. Login: admin@ticketing.local / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
