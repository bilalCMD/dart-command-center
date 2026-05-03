'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, Clock, TrendingUp, Users, Zap } from 'lucide-react';

const IDLE_THRESHOLD = 3 * 60; // 3 minutes

export default function ActivityPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [teamData, setTeamData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myStatus, setMyStatus] = useState<'active' | 'idle'>('active');
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle'>('all');

  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<any>(null);
  const reportTimerRef = useRef<any>(null);

  // Employee: Track activity
  useEffect(() => {
    if (isAdmin) return;

    const resetIdle = () => {
      lastActivityRef.current = Date.now();
      if (myStatus === 'idle') setMyStatus('active');
      setIdleSeconds(0);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keypress', resetIdle);
    window.addEventListener('click', resetIdle);
    window.addEventListener('scroll', resetIdle);

    // Check idle status every 30 seconds
    idleTimerRef.current = setInterval(() => {
      const idle = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setIdleSeconds(idle);
      setMyStatus(idle >= IDLE_THRESHOLD ? 'idle' : 'active');
    }, 30000);

    // Report status every 2 minutes
    reportTimerRef.current = setInterval(async () => {
      const idle = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const status = idle >= IDLE_THRESHOLD ? 'idle' : 'active';
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, idleSeconds: idle }),
        });
      } catch (e) {
        console.error(e);
      }
    }, 2 * 60 * 1000);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keypress', resetIdle);
      window.removeEventListener('click', resetIdle);
      window.removeEventListener('scroll', resetIdle);
      clearInterval(idleTimerRef.current);
      clearInterval(reportTimerRef.current);
    };
  }, [isAdmin, myStatus]);

  // Admin: Fetch team data
  const fetchTeam = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/activity');
      const d = await res.json();
      setTeamData(d.team || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTeam();
      const interval = setInterval(fetchTeam, 60000); // Auto-refresh every 60s
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const formatLastSeen = (ts: string) => {
    if (!ts) return 'Never';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatIdleTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="animate-spin"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Loading activity data...</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEE VIEW
  // ═══════════════════════════════════════════════════════════
  if (!isAdmin) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <div className="mb-6">
          <h1 className="text-[24px] font-black text-[var(--text)] tracking-tight">
            My Activity
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Your activity is tracked automatically
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-card p-8 mb-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
            <div
              className={`absolute top-[-50%] right-[-20%] w-[400px] h-[400px] rounded-full blur-3xl ${
                myStatus === 'active' ? 'bg-green-500' : 'bg-orange-500'
              }`}
            />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-[var(--border)] bg-white shadow-lg mb-4">
              <Activity
                size={40}
                className={myStatus === 'active' ? 'text-green-500' : 'text-orange-500'}
              />
            </div>

            <div
              className={`text-[32px] font-black mb-2 ${
                myStatus === 'active' ? 'text-green-500' : 'text-orange-500'
              }`}
            >
              {myStatus === 'active' ? '🟢 Active' : '🟡 Idle'}
            </div>

            {myStatus === 'idle' && (
              <div className="text-sm text-[var(--muted)] mb-4">
                Idle for {formatIdleTime(idleSeconds)}
              </div>
            )}

            {myStatus === 'active' && (
              <div className="text-sm text-green-600 font-semibold mb-4">
                You're currently active
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-xs text-[var(--muted)]">
              <Clock size={12} />
              <span>Status updates every 2 minutes</span>
            </div>

            <div className="mt-4 text-[11px] text-[var(--muted)] max-w-md mx-auto">
              Move your mouse, type, click, or scroll to stay active. Idle after 3 minutes
              of inactivity.
            </div>
          </div>
        </div>

        {/* Bonus Info */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface2)] flex items-center gap-2">
            <Zap size={13} className="text-[var(--orange)]" />
            <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">
              Overtime Bonuses
            </span>
          </div>
          <div className="p-4 space-y-2.5">
            {[
              { time: '+30 min extra', points: '+3 pts' },
              { time: '+1 hour extra', points: '+6 pts' },
              { time: '+2 hours extra', points: '+10 pts' },
              { time: 'Weekend work', points: 'Bonus pts' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">{item.time}</span>
                <span className="font-bold text-green-500">{item.points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN VIEW
  // ═══════════════════════════════════════════════════════════
  const activeMembers = teamData.filter((m) => {
    const isActive = m.lastStatus === 'active';
    const isRecent =
      m.lastSeen && Date.now() - new Date(m.lastSeen).getTime() < 5 * 60 * 1000;
    return isActive && isRecent;
  });

  const idleMembers = teamData.filter((m) => {
    const isActive = m.lastStatus === 'active';
    const isRecent =
      m.lastSeen && Date.now() - new Date(m.lastSeen).getTime() < 5 * 60 * 1000;
    return !(isActive && isRecent);
  });

  const filteredData =
    statusFilter === 'all'
      ? teamData
      : statusFilter === 'active'
      ? activeMembers
      : idleMembers;

  const avgActivityRate =
    teamData.length > 0
      ? Math.round(
          teamData.reduce((sum, m) => sum + (m.activityPct || 0), 0) / teamData.length
        )
      : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-black text-[var(--text)] tracking-tight">
            Activity Monitor
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Real-time team activity tracking
          </p>
        </div>

        <button
          onClick={fetchTeam}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-xs font-semibold hover:border-[var(--orange)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-[var(--orange)] ${refreshing ? 'animate-spin' : ''}`}
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[var(--border)] rounded-xl p-3 shadow-soft flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
            <Activity size={16} className="text-green-500" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">
              Active Now
            </div>
            <div className="text-[18px] font-black text-[var(--text)] leading-tight">
              {activeMembers.length}
              <span className="text-[13px] text-[var(--muted)] font-semibold">
                /{teamData.length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-xl p-3 shadow-soft flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
            <Clock size={16} className="text-orange-500" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">
              Idle
            </div>
            <div className="text-[18px] font-black text-[var(--text)] leading-tight">
              {idleMembers.length}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-xl p-3 shadow-soft flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg dart-gradient-soft flex items-center justify-center">
            <TrendingUp size={16} className="text-[var(--orange)]" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">
              Avg Activity
            </div>
            <div className="text-[18px] font-black text-[var(--text)] leading-tight">
              {avgActivityRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-4 bg-white border border-[var(--border)] rounded-lg p-1 shadow-soft w-fit">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-[10px] font-semibold rounded transition-all ${
            statusFilter === 'all'
              ? 'bg-[var(--orange)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          All ({teamData.length})
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 text-[10px] font-semibold rounded transition-all ${
            statusFilter === 'active'
              ? 'bg-green-500 text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          🟢 Active ({activeMembers.length})
        </button>
        <button
          onClick={() => setStatusFilter('idle')}
          className={`px-3 py-1.5 text-[10px] font-semibold rounded transition-all ${
            statusFilter === 'idle'
              ? 'bg-orange-500 text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          🟡 Idle ({idleMembers.length})
        </button>
      </div>

      {/* Team Grid */}
      {filteredData.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {filteredData.map((member: any) => {
            const isActive = member.lastStatus === 'active';
            const isRecent =
              member.lastSeen &&
              Date.now() - new Date(member.lastSeen).getTime() < 5 * 60 * 1000;
            const statusActive = isActive && isRecent;

            return (
              <div
                key={member.id}
                className="bg-white rounded-xl p-4 border shadow-soft transition-all hover:shadow-card"
                style={{
                  borderColor: statusActive ? '#10b98144' : 'var(--border)',
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center text-xs font-bold border-2 border-[var(--border)]">
                    {member.avatar || member.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{member.name}</div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      {member.email}
                    </div>
                  </div>
                  <div
                    className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0"
                    style={{
                      background: statusActive ? '#10b98122' : '#f59e0b22',
                      color: statusActive ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {statusActive ? '🟢 Active' : '🟡 Idle'}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Last seen:</span>
                    <span className="font-semibold text-[var(--text)]">
                      {formatLastSeen(member.lastSeen)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Idle time:</span>
                    <span className="font-semibold text-[var(--text)]">
                      {member.idleMinutes || 0}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Activity rate:</span>
                    <span
                      className="font-bold"
                      style={{
                        color: member.activityPct >= 70 ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {member.activityPct || 0}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${member.activityPct || 0}%`,
                      background: member.activityPct >= 70 ? '#10b981' : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-[var(--border)] rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Users size={20} className="text-[var(--subtle)]" />
          </div>
          <div className="text-[13px] font-semibold text-[var(--text)]">
            No {statusFilter === 'all' ? '' : statusFilter} members
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            {statusFilter === 'all'
              ? 'Team members will appear here once they visit the Activity page'
              : `No team members are currently ${statusFilter}`}
          </div>
        </div>
      )}
    </div>
  );
}