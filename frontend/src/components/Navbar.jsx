// src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStudent } from '../hooks/useStudent';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '' },
  { to: '/tasks', label: 'Deadlines', icon: '' },
  { to: '/attendance', label: 'Attendance', icon: '' },
];

export default function Navbar() {
  const { student, logout } = useStudent();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <span className="text-xl font-extrabold text-brand-400">CF</span>
          <span className="font-bold text-lg">
            <span className="gradient-text">Campus</span>
            <span className="text-slate-100">Flow</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="flex items-center gap-3">
          {student && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                {student.name?.[0]?.toUpperCase() ?? 'S'}
              </div>
              <span className="text-sm text-slate-300 font-medium max-w-[120px] truncate">
                {student.name}
              </span>
            </div>
          )}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="btn-secondary text-sm !px-3 !py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden border-t border-slate-800/60 bg-slate-950/90">
        {NAV_LINKS.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors duration-200 ${
                active ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
