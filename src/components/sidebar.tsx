'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Clock,
  Plane,
  FileText,
  Target,
  CheckSquare,
  Star,
  Users,
  Activity,
  Award,
  LogOut,
  TrendingUp,
  CalendarFold,
  Settings2,
} from 'lucide-react';

const EMPLOYEE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clock', label: 'Time Tracker', icon: Clock },
  { href: '/leaves', label: 'Leaves', icon: Plane },
  { href: '/eod', label: 'EOD Reports', icon: FileText },
  { href: '/kpis', label: 'KPIs & OKRs', icon: Target },
  { href: '/tasks', label: 'Notion Tasks', icon: CheckSquare },
  { href: '/score', label: 'My Score', icon: Star },
  { href: '/calendar', label: 'Calendar', icon: CalendarFold },
];

const ADMIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clock', label: 'Attendance', icon: Users },
  { href: '/leaves', label: 'Leave Requests', icon: Plane },
  { href: '/eod', label: 'EOD Reports', icon: FileText },
  { href: '/kpis', label: 'KPIs & OKRs', icon: Target },
  { href: '/score', label: 'Performance', icon: TrendingUp },
  { href: '/admin-activity', label: 'Activity Monitor', icon: Activity },
  { href: '/admin-leave', label: 'Leave Management', icon: Plane },
  { href: '/tasks', label: 'Notion Tasks', icon: CheckSquare },
  { href: '/admin-badges', label: 'Manage Badges', icon: Award },
  { href: '/admin-calendar', label: 'Company Calendar', icon: CalendarFold },
  { href: '/admin-settings', label: 'Settings', icon: Settings2 },
];

interface SidebarProps {
  user: {
    name: string;
    role: string;
    avatar: string;
    isAdmin: boolean;
    email?: string;
  };
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
}

export default function Sidebar({ user, isAdmin, setIsAdmin }: SidebarProps) {
  const pathname = usePathname();
  const nav = user.isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  return (
    <div className="w-[230px] bg-white border-r border-[var(--border)] flex flex-col sticky top-0 h-screen shrink-0">
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 flex items-center justify-center">
  <img
    src="/dart-logo.png"
    alt="Dart"
    className="h-full w-full object-contain"
  />
</div>
          </div>
          <div className="flex flex-col">
            <div className="text-[13px] font-bold text-[var(--text)] tracking-tight leading-tight">Dart</div>
            <div className="text-[9px] text-[var(--muted)] tracking-[0.14em] font-bold uppercase leading-tight">Command Center</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        <div className="px-2 pb-1.5">
          <span className="text-[9px] font-bold text-[var(--subtle)] tracking-[0.14em] uppercase">
            {user.isAdmin ? 'Admin Menu' : 'Menu'}
          </span>
        </div>
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium no-underline transition-all relative ${
                active
                  ? 'bg-[var(--surface2)] text-[var(--orange)]'
                  : 'text-[var(--text-soft)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full dart-gradient" />
              )}
              <Icon
                size={16}
                strokeWidth={2}
                className={`shrink-0 transition-colors ${
                  active ? 'text-[var(--orange)]' : 'text-[var(--muted)] group-hover:text-[var(--text)]'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[var(--border)] bg-[var(--surface2)]">
        <div className="flex items-center gap-2.5 mb-2.5 px-1">
          <div className="w-9 h-9 rounded-lg dart-gradient flex items-center justify-center text-[11px] font-bold text-white shadow-soft shrink-0">
            {user.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-[var(--text)] truncate">{user.name}</div>
            <div className="text-[10.5px] text-[var(--muted)] truncate">{user.email || user.role}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--text-soft)] py-2 bg-white border border-[var(--border)] rounded-lg cursor-pointer hover:text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all"
        >
          <LogOut size={13} strokeWidth={2.5} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}