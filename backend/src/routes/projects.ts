import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { sendInvitationEmail } from '../lib/email';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

const createProjectSchema = z.object({
  key: z.string().min(2).max(10).regex(/^[A-Z][A-Z0-9]*$/),
  name: z.string().min(1),
  description: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: req.userId! } } },
    include: {
      _count: { select: { issues: true, members: true } },
      members: {
        where: { userId: req.userId! },
        select: { role: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(
    projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      issueCount: p._count.issues,
      memberCount: p._count.members,
      role: p.members[0]?.role,
    }))
  );
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { key, name, description } = parsed.data;

  const existing = await prisma.project.findUnique({ where: { key } });
  if (existing) {
    return res.status(409).json({ error: 'Project key already exists' });
  }

  const project = await prisma.project.create({
    data: {
      key,
      name,
      description,
      members: { create: { userId: req.userId!, role: 'ADMIN' } },
    },
  });

  res.status(201).json(project);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: req.userId!, projectId: req.params.id } },
  });
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { issues: true } },
    },
  });

  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const projectId = req.params.id;
  const { email, role } = parsed.data;

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: req.userId!, projectId } },
  });
  if (!member || member.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can invite users' });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const existingMember = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { projectId } } },
  });
  if (existingMember?.memberships.length) {
    return res.status(409).json({ error: 'User is already a project member' });
  }

  const existingInvite = await prisma.invitation.findUnique({
    where: { projectId_email: { projectId, email } },
  });
  if (existingInvite && !existingInvite.acceptedAt && existingInvite.expiresAt > new Date()) {
    return res.status(409).json({ error: 'Invitation already sent' });
  }

  const inviter = await prisma.user.findUnique({ where: { id: req.userId! } });
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.upsert({
    where: { projectId_email: { projectId, email } },
    create: {
      email,
      token,
      role,
      expiresAt,
      projectId,
      invitedById: req.userId!,
    },
    update: {
      token,
      role,
      expiresAt,
      acceptedAt: null,
      invitedById: req.userId!,
    },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const inviteUrl = `${appUrl}/accept-invite?token=${token}`;

  await sendInvitationEmail({
    to: email,
    inviterName: inviter!.name,
    projectName: project.name,
    inviteUrl,
  });

  res.status(201).json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    message: 'Invitation email sent',
  });
});

router.get('/:id/invitations', async (req: AuthRequest, res: Response) => {
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: req.userId!, projectId: req.params.id } },
  });
  if (!member || member.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can view invitations' });
  }

  const invitations = await prisma.invitation.findMany({
    where: { projectId: req.params.id, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  res.json(invitations);
});

export default router;
