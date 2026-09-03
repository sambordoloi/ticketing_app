import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { sendWelcomeEmail } from '../lib/email';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });

  res.status(201).json({ user, token });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const acceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().min(1),
  password: z.string().min(6),
});

router.post('/accept-invite', async (req, res) => {
  const parsed = acceptInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { token, name, password } = parsed.data;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { project: true },
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }
  if (invitation.acceptedAt) {
    return res.status(400).json({ error: 'Invitation already accepted' });
  }
  if (invitation.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invitation expired' });
  }

  let user = await prisma.user.findUnique({ where: { email: invitation.email } });

  if (user) {
    const existingMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: invitation.projectId } },
    });
    if (existingMember) {
      return res.status(400).json({ error: 'Already a project member' });
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: { email: invitation.email, name, passwordHash },
    });
    await sendWelcomeEmail({ to: user.email, name: user.name });
  }

  await prisma.$transaction([
    prisma.projectMember.create({
      data: { userId: user.id, projectId: invitation.projectId, role: invitation.role },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token: jwtToken,
    project: invitation.project,
  });
});

router.get('/invite/:token', async (req, res) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: {
      project: { select: { id: true, name: true, key: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' });
  }
  if (invitation.acceptedAt) {
    return res.status(400).json({ error: 'Invitation already accepted' });
  }
  if (invitation.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invitation expired' });
  }

  res.json({
    email: invitation.email,
    role: invitation.role,
    project: invitation.project,
    invitedBy: invitation.invitedBy.name,
  });
});

export default router;
