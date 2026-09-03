import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, ProjectSummary } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Plus, FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.projects.list().then(setProjects).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const project = await api.projects.create({ key: key.toUpperCase(), name, description });
      setProjects([...projects, { ...project, issueCount: 0, memberCount: 1, role: 'ADMIN' }]);
      setShowCreate(false);
      setKey('');
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-jira-gray-medium">Welcome back, {user?.name}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jira-blue" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card p-12 text-center">
            <FolderKanban className="w-12 h-12 text-jira-gray-medium mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-jira-gray-medium mb-4">Create your first project to get started</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create Project</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="card p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-jira-blue rounded flex items-center justify-center text-white font-bold text-sm">
                    {project.key.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <p className="text-sm text-jira-gray-medium">{project.key}</p>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-jira-gray-medium mt-3 line-clamp-2">{project.description}</p>
                )}
                <div className="flex gap-4 mt-4 text-xs text-jira-gray-medium">
                  <span>{project.issueCount} issues</span>
                  <span>{project.memberCount} members</span>
                  <span className="capitalize">{project.role?.toLowerCase()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Create Project</h2>
            {error && (
              <div className="bg-red-50 text-jira-red px-4 py-3 rounded mb-4 text-sm">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Key</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="e.g. PROJ"
                  pattern="[A-Z][A-Z0-9]*"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-jira-gray-medium mt-1">Uppercase letters and numbers only</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
