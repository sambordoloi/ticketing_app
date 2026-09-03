import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function projectMemberMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  projectId: string
) {
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: req.userId!, projectId } },
  });
  if (!member) {
    return res.status(403).json({ error: 'Not a project member' });
  }
  next();
}
