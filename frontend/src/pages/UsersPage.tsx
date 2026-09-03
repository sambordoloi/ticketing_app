import { useState, useEffect } from 'react';
import { api, UserWithMemberships, ProjectSummary } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, User as UserIcon, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithMemberships[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteProjectId, setInviteProjectId] = useState('');

  const isAdmin = projects.some((p) => p.role === 'ADMIN');

  useEffect(() => {
    Promise.all([api.users.list().catch(() => []), api.projects.list()])
      .then(([u, p]) => {
        setUsers(u);
        setProjects(p);
        if (p.length > 0) setInviteProjectId(p[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const adminProjects = projects.filter((p) => p.role === 'ADMIN');

  const handleRoleChange = async (userId: string, projectId: string, role: string) => {
    setError('');
    try {
      await api.users.updateRole(userId, projectId, role);
      const refreshed = await api.users.list();
      setUsers(refreshed);
      setSuccess('Role updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemove = async (userId: string, projectId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from this project?`)) return;
    setError('');
    try {
      await api.users.removeFromProject(userId, projectId);
      const refreshed = await api.users.list();
      setUsers(refreshed);
      setSuccess('User removed from project');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.projects.invite(inviteProjectId, inviteEmail, inviteRole);
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInvite(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jira-blue" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <Shield className="w-12 h-12 text-jira-gray-medium mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Admin access required</h2>
        <p className="text-jira-gray-medium">Only project admins can manage users.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-jira-gray-medium">Manage team members and roles</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Invite User
        </button>
      </div>

      {error && <div className="bg-red-50 text-jira-red px-4 py-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-jira-green px-4 py-3 rounded mb-4 text-sm">{success}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-jira-gray border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">User</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Projects & Roles</th>
              <th className="text-left px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-jira-blue rounded-full flex items-center justify-center text-white text-xs">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="text-jira-gray-medium font-normal ml-1">(you)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-jira-gray-medium">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    {u.memberships.map((m) => {
                      const canManage = adminProjects.some((p) => p.id === m.project.id);
                      return (
                        <div key={m.project.id} className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-jira-blue-light text-jira-blue px-2 py-0.5 rounded">
                            {m.project.key}
                          </span>
                          {canManage ? (
                            <>
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(u.id, m.project.id, e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="MEMBER">Member</option>
                              </select>
                              <button
                                onClick={() => handleRemove(u.id, m.project.id, u.name)}
                                className="p-1 text-jira-red hover:bg-red-50 rounded"
                                title="Remove from project"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs capitalize text-jira-gray-medium">{m.role.toLowerCase()}</span>
                          )}
                        </div>
                      );
                    })}
                    {u.memberships.length === 0 && (
                      <span className="text-jira-gray-medium text-xs">No projects</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-jira-gray-medium text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-jira-gray-medium">
            <UserIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No users found
          </div>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Invite User</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project</label>
                <select
                  value={inviteProjectId}
                  onChange={(e) => setInviteProjectId(e.target.value)}
                  className="input-field"
                  required
                >
                  {adminProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input-field">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
