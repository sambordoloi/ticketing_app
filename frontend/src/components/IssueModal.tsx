import { useState, useEffect } from 'react';
import {
  api,
  Issue,
  IssueStatus,
  IssuePriority,
  IssueType,
  User,
  Comment,
  STATUS_LABELS,
  TYPE_ICONS,
} from '../lib/api';
import { X, Trash2 } from 'lucide-react';

interface Props {
  projectId: string;
  issue?: Issue;
  defaultStatus?: IssueStatus;
  members: User[];
  onClose: () => void;
  onUpdate?: (issue: Issue) => void;
  onCreate?: (issue: Issue) => void;
  onDelete?: (issueId: string) => void;
}

export default function IssueModal({
  projectId,
  issue,
  defaultStatus = 'TODO',
  members,
  onClose,
  onUpdate,
  onCreate,
  onDelete,
}: Props) {
  const isCreate = !issue;
  const [title, setTitle] = useState(issue?.title || '');
  const [description, setDescription] = useState(issue?.description || '');
  const [status, setStatus] = useState<IssueStatus>(issue?.status || defaultStatus);
  const [priority, setPriority] = useState<IssuePriority>(issue?.priority || 'MEDIUM');
  const [type, setType] = useState<IssueType>(issue?.type || 'TASK');
  const [assigneeId, setAssigneeId] = useState(issue?.assignee?.id || '');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (issue && !isCreate) {
      api.issues.get(projectId, issue.id).then((detail) => {
        setComments(detail.comments);
      });
    }
  }, [issue?.id]);

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      if (isCreate) {
        const created = await api.issues.create(projectId, {
          title,
          description,
          status,
          priority,
          type,
          assigneeId: assigneeId || null,
        });
        onCreate?.(created);
      } else {
        const updated = await api.issues.update(projectId, issue!.id, {
          title,
          description,
          status,
          priority,
          type,
          assigneeId: assigneeId || null,
        });
        onUpdate?.(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !issue) return;
    const newComment = await api.issues.addComment(projectId, issue.id, comment);
    setComments([...comments, newComment]);
    setComment('');
  };

  const handleDelete = async () => {
    if (!issue || !confirm('Delete this issue?')) return;
    await api.issues.delete(projectId, issue.id);
    onDelete?.(issue.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {issue && (
              <>
                <span>{TYPE_ICONS[issue.type]}</span>
                <span className="text-jira-gray-medium">{issue.key}</span>
              </>
            )}
            {!issue && <span className="font-semibold">Create Issue</span>}
          </div>
          <div className="flex items-center gap-2">
            {issue && (
              <button onClick={handleDelete} className="p-2 text-jira-red hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-jira-red px-4 py-3 rounded text-sm">{error}</div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-semibold border-none focus:outline-none focus:ring-0 p-0"
            placeholder="Issue title"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-jira-gray-medium mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)} className="input-field text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-jira-gray-medium mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)} className="input-field text-sm">
                {['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'].map((p) => (
                  <option key={p} value={p}>{p.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-jira-gray-medium mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as IssueType)} className="input-field text-sm">
                {['TASK', 'BUG', 'STORY', 'EPIC'].map((t) => (
                  <option key={t} value={t}>{TYPE_ICONS[t as IssueType]} {t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-jira-gray-medium mb-1">Assignee</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input-field text-sm">
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-jira-gray-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="Add a description..."
            />
          </div>

          {issue && (
            <div>
              <label className="block text-xs font-medium text-jira-gray-medium mb-2">Comments</label>
              <div className="space-y-3 mb-3">
                {comments.map((c) => (
                  <div key={c.id} className="bg-jira-gray rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-jira-blue rounded-full flex items-center justify-center text-white text-xs">
                        {c.author.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{c.author.name}</span>
                      <span className="text-xs text-jira-gray-medium">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm ml-8">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment} className="btn-secondary">Add</button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={loading || !title.trim()} className="btn-primary">
              {loading ? 'Saving...' : isCreate ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
