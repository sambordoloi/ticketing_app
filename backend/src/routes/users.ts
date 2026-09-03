import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { canAdminProject, isAnyAdmin } from '../lib/admin';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  if (!(await isAnyAdmin(req.userId!))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      createdAt: true,
      memberships: {
        include: {
          project: { select: { id: true, name: true, key: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json(users);
});

const updateRoleSchema = z.object({
  projectId: z.string().uuid(),
  role: z.enum(['ADMIN', 'MEMBER']),
});

router.patch('/:userId/role', async (req: AuthRequest, res: Response) => {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { projectId, role } = parsed.data;
  if (!(await canAdminProject(req.userId!, projectId))) {
    return res.status(403).json({ error: 'Only project admins can change roles' });
  }

  if (req.params.userId === req.userId && role === 'MEMBER') {
    const adminCount = await prisma.projectMember.count({
      where: { projectId, role: 'ADMIN' },
    });
    const targetIsSuperAdmin = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { isSuperAdmin: true },
    });
    if (adminCount <= 1 && !targetIsSuperAdmin?.isSuperAdmin) {
      return res.status(400).json({ error: 'Cannot demote the last admin' });
    }
  }

  const updated = await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: req.params.userId, projectId } },
    create: { userId: req.params.userId, projectId, role },
    update: { role },
    include: {
      user: { select: { id: true, email: true, name: true } },
      project: { select: { id: true, name: true, key: true } },
    },
  });

  res.json(updated);
});

router.delete('/:userId/projects/:projectId', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  if (!(await canAdminProject(req.userId!, projectId))) {
    return res.status(403).json({ error: 'Only project admins can remove members' });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { isSuperAdmin: true },
  });
  if (targetUser?.isSuperAdmin) {
    return res.status(400).json({ error: 'Cannot remove a super admin from a project' });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: req.params.userId, projectId } },
  });
  if (!membership) {
    return res.status(404).json({ error: 'User is not a member of this project' });
  }

  if (membership.role === 'ADMIN') {
    const adminCount = await prisma.projectMember.count({
      where: { projectId, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin' });
    }
  }

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId: req.params.userId, projectId } },
  });

  res.status(204).send();
});

export default router;
