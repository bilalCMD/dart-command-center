'use client';
import { useEffect, useState } from 'react';

const fmtTime = (s: number) => {
  if (!s || s <= 0) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtClock = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function AdminClock() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/clock/team');
      const data = await res.json();
      setTeam(data.team || []);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
    const interval = setInterval(fetchTeam, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const members = team.filter(u => u.role === 'MEMBER');
  const present = members.filter(u => u.isClockedIn).length;
  const absent = members.filter(u => !u.isClockedIn).length;
  const avgSeconds = members.length ? members.reduce((s, u) => s + u.totalSeconds, 0) / members.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text)]">Attendance</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <button onClick={fetchTeam} className="px-3 py-1.5 text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-[var(--orange)] transition-all">
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Present', value: present, color: '#10b981' },
          { label: 'Absent', value: absent, color: '#ef4444' },
          { label: 'Total Members', value: members.length, color: '#B71CED' },
          { label: 'Avg Hours', value: fmtTime(avgSeconds), color: '#ED671C' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-[11px] text-[var(--muted)] mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Team List */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--muted)] tracking-widest uppercase">Team Status</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--muted)]">Loading...</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {team.filter(u => u.role === 'MEMBER').map((u: any) => (
              <div key={u.userId} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #ED671C, #B71CED)' }}>
                    {u.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text)]">{u.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {u.isClockedIn ? `Clocked in at ${fmtClock(u.clockInTime)}` : 'Not clocked in'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-[var(--muted)]">{fmtTime(u.totalSeconds)}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    u.isClockedIn ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {u.isClockedIn ? '● Active' : '○ Away'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
