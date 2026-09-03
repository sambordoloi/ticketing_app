import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { sendTicketCreatedNotification } from '../lib/slack';
import { crfUpload } from '../lib/upload';
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
  gitCommitId: z.string().min(1),
  crfDeploymentAt: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']).optional(),
  type: z.enum(['TASK', 'BUG', 'STORY', 'EPIC']).optional(),
  assigneeId: z.string().uuid(),
});

const updateIssueSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  gitCommitId: z.string().min(1).optional(),
  crfDeploymentAt: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']).optional(),
  type: z.enum(['TASK', 'BUG', 'STORY', 'EPIC']).optional(),
  assigneeId: z.string().uuid().optional(),
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

router.post('/', crfUpload.single('crfFile'), async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const parsed = createIssueSchema.safeParse({
    title: req.body.title,
    description: req.body.description || undefined,
    gitCommitId: req.body.gitCommitId,
    crfDeploymentAt: req.body.crfDeploymentAt || undefined,
    status: req.body.status || undefined,
    priority: req.body.priority || undefined,
    type: req.body.type || undefined,
    assigneeId: req.body.assigneeId,
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const assigneeMember = await prisma.projectMember.findFirst({
    where: { projectId, userId: parsed.data.assigneeId },
  });
  if (!assigneeMember) {
    return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const key = await generateIssueKey(projectId);
  const issue = await prisma.issue.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      gitCommitId: parsed.data.gitCommitId,
      crfDeploymentAt: parsed.data.crfDeploymentAt ? new Date(parsed.data.crfDeploymentAt) : null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      type: parsed.data.type,
      assigneeId: parsed.data.assigneeId,
      crfFileName: req.file?.originalname,
      crfFilePath: req.file ? `/uploads/${req.file.filename}` : null,
      key,
      projectId,
      reporterId: req.userId!,
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, key: true },
  });

  if (project) {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    sendTicketCreatedNotification({
      key: issue.key,
      title: issue.title,
      type: issue.type,
      priority: issue.priority,
      status: issue.status,
      projectName: project.name,
      projectKey: project.key,
      reporterName: issue.reporter.name,
      assigneeName: issue.assignee.name,
      gitCommitId: issue.gitCommitId,
      description: issue.description ?? undefined,
      projectUrl: `${appUrl}/projects/${projectId}`,
    }).catch(console.error);
  }

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

router.patch('/:issueId', crfUpload.single('crfFile'), async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId as string;
  const member = await checkMembership(req.userId!, projectId);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const parsed = updateIssueSchema.safeParse({
    title: req.body.title,
    description: req.body.description,
    gitCommitId: req.body.gitCommitId,
    crfDeploymentAt: req.body.crfDeploymentAt || undefined,
    status: req.body.status,
    priority: req.body.priority,
    type: req.body.type,
    assigneeId: req.body.assigneeId,
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.issue.findFirst({
    where: { id: req.params.issueId, projectId },
  });
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  if (parsed.data.assigneeId) {
    const assigneeMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: parsed.data.assigneeId },
    });
    if (!assigneeMember) {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.crfDeploymentAt) {
    updateData.crfDeploymentAt = new Date(parsed.data.crfDeploymentAt);
  }
  if (req.file) {
    updateData.crfFileName = req.file.originalname;
    updateData.crfFilePath = `/uploads/${req.file.filename}`;
  }

  const issue = await prisma.issue.update({
    where: { id: req.params.issueId },
    data: updateData,
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
