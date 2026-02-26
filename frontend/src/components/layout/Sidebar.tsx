import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  MessageSquare,
  Radio,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/personas', icon: Users, label: 'Personas' },
  { to: '/knowledge', icon: BookOpen, label: 'Base de Conhecimento' },
  { to: '/conversations', icon: MessageSquare, label: 'Conversas' },
  { to: '/channels', icon: Radio, label: 'Canais' },
  { to: '/settings', icon: Settings, label: 'Definicoes' },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex flex-col">
      {/* Logo com foto da Silvia */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img
          src="/silvia-avatar.jpg"
          alt="SilvIA"
          className="h-10 w-10 rounded-full object-cover border-2 border-purple-400/50"
        />
        <div>
          <h1 className="text-lg font-bold text-white">
            Silv<span className="text-purple-400">IA</span>
          </h1>
          <p className="text-[10px] text-purple-300/60 uppercase tracking-widest">Centro de Comando</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-purple-300">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">{user?.name}</p>
            <p className="text-xs text-white/40 truncate">{user?.orgName}</p>
          </div>
          <button onClick={logout} className="p-1.5 text-white/40 hover:text-white" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
