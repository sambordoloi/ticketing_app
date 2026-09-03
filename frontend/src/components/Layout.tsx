import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, LogOut } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="bg-jira-blue text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/projects" className="flex items-center gap-2 font-semibold">
            <LayoutGrid className="w-6 h-6" />
            Ticketing App
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
