import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

async function checkMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

async function generateIssueKey(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  const count = await prisma.issue.count({ where: { projectId } });
  return `${project!.key}-${count + 1}`;
}

const createIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']).optional(),
  type: z.enum(['TASK', 'BUG', 'STORY', 'EPIC']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const issues = await prisma.issue.findMany({
    where: { projectId },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(issues);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const parsed = createIssueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const key = await generateIssueKey(projectId);
  const issue = await prisma.issue.create({
    data: {
      ...parsed.data,
      key,
      projectId,
      reporterId: req.userId!,
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(issue);
});

router.get('/:issueId', async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const issue = await prisma.issue.findFirst({
    where: { id: req.params.issueId, projectId },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  res.json(issue);
});

const updateIssueSchema = createIssueSchema.partial();

router.patch('/:issueId', async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const parsed = updateIssueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.issue.findFirst({
    where: { id: req.params.issueId, projectId },
  });
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const issue = await prisma.issue.update({
    where: { id: req.params.issueId },
    data: parsed.data,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(issue);
});

router.delete('/:issueId', async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const existing = await prisma.issue.findFirst({
    where: { id: req.params.issueId, projectId },
  });
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  await prisma.issue.delete({ where: { id: req.params.issueId } });
  res.status(204).send();
});

const commentSchema = z.object({ body: z.string().min(1) });

router.post('/:issueId/comments', async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const issue = await prisma.issue.findFirst({
    where: { id: req.params.issueId, projectId },
  });
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  const comment = await prisma.comment.create({
    data: {
      body: parsed.data.body,
      issueId: req.params.issueId,
      authorId: req.userId!,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  res.status(201).json(comment);
});

export default router;
