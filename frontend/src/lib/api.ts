const API_URL = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function requestForm<T>(path: string, method: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: formData });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
  }

  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, name: string) =>
      request<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    me: () => request<User>('/api/auth/me'),
    getInvite: (token: string) =>
      request<InviteInfo>(`/api/auth/invite/${token}`),
    acceptInvite: (token: string, name: string, password: string) =>
      request<{ user: User; token: string; project: Project }>('/api/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, name, password }),
      }),
  },
  projects: {
    list: () => request<ProjectSummary[]>('/api/projects'),
    get: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),
    create: (data: { key: string; name: string; description?: string }) =>
      request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    invite: (id: string, email: string, role: string) =>
      request<{ message: string }>(`/api/projects/${id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
    invitations: (id: string) => request<Invitation[]>(`/api/projects/${id}/invitations`),
  },
  users: {
    list: () => request<UserWithMemberships[]>('/api/users'),
    updateRole: (userId: string, projectId: string, role: string) =>
      request(`/api/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ projectId, role }),
      }),
    removeFromProject: (userId: string, projectId: string) =>
      request<void>(`/api/users/${userId}/projects/${projectId}`, { method: 'DELETE' }),
  },
  issues: {
    list: (projectId: string) => request<Issue[]>(`/api/projects/${projectId}/issues`),
    get: (projectId: string, issueId: string) =>
      request<IssueDetail>(`/api/projects/${projectId}/issues/${issueId}`),
    create: (projectId: string, data: CreateIssueInput, crfFile?: File | null) => {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          form.append(key, String(value));
        }
      });
      if (crfFile) form.append('crfFile', crfFile);
      return requestForm<Issue>(`/api/projects/${projectId}/issues`, 'POST', form);
    },
    update: (projectId: string, issueId: string, data: Partial<CreateIssueInput>, crfFile?: File | null) => {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          form.append(key, String(value));
        }
      });
      if (crfFile) form.append('crfFile', crfFile);
      return requestForm<Issue>(`/api/projects/${projectId}/issues/${issueId}`, 'PATCH', form);
    },
    delete: (projectId: string, issueId: string) =>
      request<void>(`/api/projects/${projectId}/issues/${issueId}`, { method: 'DELETE' }),
    addComment: (projectId: string, issueId: string, body: string) =>
      request<Comment>(`/api/projects/${projectId}/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
  },
};

export interface User {
  id: string;
  email: string;
  name: string;
  isSuperAdmin?: boolean;
}

export interface UserMembership {
  role: string;
  project: { id: string; name: string; key: string };
}

export interface UserWithMemberships extends User {
  createdAt: string;
  isSuperAdmin?: boolean;
  memberships: UserMembership[];
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
}

export interface ProjectSummary extends Project {
  issueCount: number;
  memberCount: number;
  role: string;
}

export interface ProjectDetail extends Project {
  members: { id: string; role: string; user: User }[];
  _count: { issues: number };
}

export interface Issue {
  id: string;
  key: string;
  title: string;
  description?: string;
  gitCommitId: string;
  crfFileName?: string;
  crfFilePath?: string;
  crfDeploymentAt?: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  reporter: User;
  assignee: User;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  gitCommitId: string;
  crfDeploymentAt?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  type?: IssueType;
  assigneeId: string;
}

export interface IssueDetail extends Issue {
  comments: Comment[];
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

export interface InviteInfo {
  email: string;
  role: string;
  project: Project;
  invitedBy: string;
}

export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type IssuePriority = 'LOWEST' | 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
export type IssueType = 'TASK' | 'BUG' | 'STORY' | 'EPIC';

export const STATUS_LABELS: Record<IssueStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const PRIORITY_COLORS: Record<IssuePriority, string> = {
  LOWEST: 'text-gray-400',
  LOW: 'text-blue-400',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-orange-500',
  HIGHEST: 'text-red-500',
};

export const TYPE_ICONS: Record<IssueType, string> = {
  TASK: '✓',
  BUG: '🐛',
  STORY: '📖',
  EPIC: '⚡',
};
