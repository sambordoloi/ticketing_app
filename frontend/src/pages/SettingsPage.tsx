import { useAuth } from '../context/AuthContext';
import { Settings, User, Bell, Mail } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-jira-gray-medium">Account and application preferences</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-jira-blue" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-jira-gray-medium mb-1">Name</label>
            <input type="text" value={user?.name || ''} className="input-field bg-gray-50" disabled />
          </div>
          <div>
            <label className="block text-xs font-medium text-jira-gray-medium mb-1">Email</label>
            <input type="email" value={user?.email || ''} className="input-field bg-gray-50" disabled />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-jira-blue" />
          <h2 className="font-semibold">Notifications</h2>
        </div>
        <p className="text-sm text-jira-gray-medium mb-3">
          Slack alerts are configured on the server via <code className="bg-gray-100 px-1 rounded">SLACK_WEBHOOK_URL</code>.
        </p>
        <ul className="text-sm text-jira-gray-medium space-y-1 list-disc list-inside">
          <li>New ticket created</li>
          <li>User invited to project</li>
        </ul>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-jira-blue" />
          <h2 className="font-semibold">Email</h2>
        </div>
        <p className="text-sm text-jira-gray-medium">
          Invitation emails are sent via BillionMail API. Configure{' '}
          <code className="bg-gray-100 px-1 rounded">BILLIONMAIL_API_URL</code> and{' '}
          <code className="bg-gray-100 px-1 rounded">BILLIONMAIL_INVITE_API_KEY</code> on the server.
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-jira-blue" />
          <h2 className="font-semibold">Application</h2>
        </div>
        <div className="text-sm text-jira-gray-medium space-y-1">
          <p><strong>App:</strong> paysoc-jira</p>
          <p><strong>API:</strong> {import.meta.env.VITE_API_URL || 'Same origin (/api)'}</p>
        </div>
      </div>
    </div>
  );
}
