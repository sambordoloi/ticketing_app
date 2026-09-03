import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  api,
  Issue,
  IssueStatus,
  ProjectDetail,
  STATUS_LABELS,
  TYPE_ICONS,
  PRIORITY_COLORS,
} from '../lib/api';
import Layout from '../components/Layout';
import IssueModal from '../components/IssueModal';
import InviteModal from '../components/InviteModal';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, UserPlus, GripVertical } from 'lucide-react';

const COLUMNS: IssueStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const COLUMN_COLORS: Record<IssueStatus, string> = {
  TODO: 'bg-gray-100',
  IN_PROGRESS: 'bg-blue-50',
  IN_REVIEW: 'bg-yellow-50',
  DONE: 'bg-green-50',
};

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [createStatus, setCreateStatus] = useState<IssueStatus>('TODO');
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);

  const loadData = async () => {
    if (!projectId) return;
    const [proj, iss] = await Promise.all([
      api.projects.get(projectId),
      api.issues.list(projectId),
    ]);
    setProject(proj);
    setIssues(iss);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleStatusChange = async (issue: Issue, newStatus: IssueStatus) => {
    if (!projectId || issue.status === newStatus) return;
    const updated = await api.issues.update(projectId, issue.id, { status: newStatus });
    setIssues(issues.map((i) => (i.id === issue.id ? { ...i, ...updated } : i)));
  };

  const handleDragStart = (issue: Issue) => setDraggedIssue(issue);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (status: IssueStatus) => {
    if (draggedIssue) {
      handleStatusChange(draggedIssue, status);
      setDraggedIssue(null);
    }
  };

  const handleIssueUpdate = (updated: Issue) => {
    setIssues(issues.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedIssue(updated);
  };

  const handleIssueCreate = (issue: Issue) => {
    setIssues([issue, ...issues]);
    setShowCreate(false);
  };

  const handleIssueDelete = (issueId: string) => {
    setIssues(issues.filter((i) => i.id !== issueId));
    setSelectedIssue(null);
  };

  const isAdmin = project?.members.some(
    (m) => m.user.id === user?.id && m.role === 'ADMIN'
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jira-blue" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">Project not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-full">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/projects" className="text-jira-gray-medium hover:text-jira-gray-dark">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 bg-jira-blue rounded flex items-center justify-center text-white font-bold text-xs">
            {project.key.slice(0, 2)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-jira-gray-medium">{project.key} · {issues.length} issues</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowInvite(true)} className="btn-secondary flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Invite
            </button>
          )}
          <button
            onClick={() => { setCreateStatus('TODO'); setShowCreate(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Issue
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => {
            const columnIssues = issues.filter((i) => i.status === status);
            return (
              <div
                key={status}
                className={`flex-shrink-0 w-72 rounded-lg ${COLUMN_COLORS[status]}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status)}
              >
                <div className="p-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
                  <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">{columnIssues.length}</span>
                </div>
                <div className="px-2 pb-2 space-y-2 min-h-[200px]">
                  {columnIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={() => handleDragStart(issue)}
                      onClick={() => setSelectedIssue(issue)}
                      className="card p-3 cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">{TYPE_ICONS[issue.type]}</span>
                            <span className="text-xs text-jira-gray-medium">{issue.key}</span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{issue.title}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs font-medium ${PRIORITY_COLORS[issue.priority]}`}>
                              {issue.priority.replace('_', ' ')}
                            </span>
                            {issue.assignee && (
                              <div
                                className="w-6 h-6 bg-jira-blue rounded-full flex items-center justify-center text-white text-xs"
                                title={issue.assignee.name}
                              >
                                {issue.assignee.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => { setCreateStatus(status); setShowCreate(true); }}
                    className="w-full p-2 text-sm text-jira-gray-medium hover:bg-white/50 rounded transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add issue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedIssue && projectId && (
        <IssueModal
          projectId={projectId}
          issue={selectedIssue}
          members={project.members.map((m) => m.user)}
          onClose={() => setSelectedIssue(null)}
          onUpdate={handleIssueUpdate}
          onDelete={handleIssueDelete}
        />
      )}

      {showCreate && projectId && (
        <IssueModal
          projectId={projectId}
          defaultStatus={createStatus}
          members={project.members.map((m) => m.user)}
          reporterName={user?.name}
          onClose={() => setShowCreate(false)}
          onCreate={handleIssueCreate}
        />
      )}

      {showInvite && projectId && (
        <InviteModal projectId={projectId} onClose={() => setShowInvite(false)} />
      )}
    </Layout>
  );
}
