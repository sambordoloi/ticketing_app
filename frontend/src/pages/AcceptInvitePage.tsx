import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Mail, Users } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    project: { name: string; key: string };
    invitedBy: string;
  } | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!token) {
      setFetchError('Invalid invitation link');
      return;
    }
    api.auth.getInvite(token)
      .then((info) => setInviteInfo(info))
      .catch((err) => setFetchError(err.message));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token: jwt, project } = await api.auth.acceptInvite(token, name, password);
      setAuth(user, jwt);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="card p-8 max-w-md text-center">
          <div className="text-jira-red text-lg font-medium mb-2">Invalid Invitation</div>
          <p className="text-jira-gray-medium">{fetchError}</p>
        </div>
      </div>
    );
  }

  if (!inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jira-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-jira-gray">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-jira-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-jira-blue" />
          </div>
          <h2 className="text-2xl font-bold">You're invited!</h2>
          <p className="text-jira-gray-medium mt-2">
            <strong>{inviteInfo.invitedBy}</strong> invited you to join
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-jira-blue font-semibold">
            <Users className="w-4 h-4" />
            {inviteInfo.project.name} ({inviteInfo.project.key})
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-jira-red px-4 py-3 rounded mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={inviteInfo.email} className="input-field bg-gray-50" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Create password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              minLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Joining...' : 'Accept & Join Project'}
          </button>
        </form>
      </div>
    </div>
  );
}
