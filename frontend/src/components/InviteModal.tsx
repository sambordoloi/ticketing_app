import { useState } from 'react';
import { api } from '../lib/api';
import { X, Mail, CheckCircle } from 'lucide-react';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function InviteModal({ projectId, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await api.projects.invite(projectId, email, role);
      setSuccess(result.message);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-jira-blue" />
            <h2 className="font-semibold">Invite Team Member</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-jira-gray-medium">
            Send an email invitation to add someone to this project. They'll receive a link to create their account and join.
          </p>

          {error && (
            <div className="bg-red-50 text-jira-red px-4 py-3 rounded text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-jira-green px-4 py-3 rounded text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="colleague@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="bg-jira-blue-light rounded p-3 text-sm">
            <p className="font-medium text-jira-blue mb-1">Development mode</p>
            <p className="text-jira-gray-medium">
              Emails are captured by MailHog. View them at{' '}
              <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" className="text-jira-blue underline">
                localhost:8025
              </a>
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Close</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
