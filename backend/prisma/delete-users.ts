import { PrismaClient } from '@prisma/client';
import { getAdminEmail } from './admin-env';

const prisma = new PrismaClient();

function parseEmails(): string[] {
  const raw = process.env.DELETE_USERS?.trim();
  if (!raw) {
    console.error('Set DELETE_USERS=email1@company.com,email2@company.com');
    process.exit(1);
  }
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

async function findFallbackUser(excludeId: string) {
  const adminEmail = getAdminEmail();
  const byEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (byEmail && byEmail.id !== excludeId) return byEmail;

  const superAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true, id: { not: excludeId } },
  });
  if (superAdmin) return superAdmin;

  return prisma.user.findFirst({ where: { id: { not: excludeId } } });
}

async function main() {
  const emails = parseEmails();

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`⊘ ${email} — not found, skipping`);
      continue;
    }

    const fallback = await findFallbackUser(user.id);
    if (!fallback) {
      console.error(`✗ ${email} — cannot delete, no other user to reassign data to`);
      continue;
    }

    const [reporterIssues, assigneeIssues, comments, invites, memberships] = await Promise.all([
      prisma.issue.count({ where: { reporterId: user.id } }),
      prisma.issue.count({ where: { assigneeId: user.id } }),
      prisma.comment.count({ where: { authorId: user.id } }),
      prisma.invitation.count({ where: { invitedById: user.id } }),
      prisma.projectMember.count({ where: { userId: user.id } }),
    ]);

    await prisma.issue.updateMany({
      where: { reporterId: user.id },
      data: { reporterId: fallback.id },
    });
    await prisma.issue.updateMany({
      where: { assigneeId: user.id },
      data: { assigneeId: fallback.id },
    });
    await prisma.comment.deleteMany({ where: { authorId: user.id } });
    await prisma.invitation.deleteMany({ where: { invitedById: user.id } });
    await prisma.projectMember.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log(
      `✓ Deleted ${email} — reassigned ${reporterIssues + assigneeIssues} issue(s) to ${fallback.email}, ` +
        `removed ${comments} comment(s), ${invites} invite(s), ${memberships} membership(s)`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
