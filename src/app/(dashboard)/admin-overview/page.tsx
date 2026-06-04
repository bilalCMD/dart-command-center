'use client';
import { useEffect, useState } from 'react';

const fmtTime = (s: number) => {
  if (!s || s <= 0) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const LATEST_VERSION = '1.0.9';

export default function AdminOverview() {
  const [team, setTeam] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [eodToday, setEodToday] = useState(0);
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/clock/team').then(r => r.json()),
      fetch('/api/leaves/pending').then(r => r.json()),
      fetch('/api/eod?date=' + new Date().toISOString().split('T')[0]).then(r => r.json()),
      fetch('/api/app-version').then(r => r.json()),
    ]).then(([clockData, leavesData, eodData, versionData]) => {
      setTeam(clockData.team || []);
      setPendingLeaves(leavesData.count || 0);
      setEodToday((eodData.reports || []).length);
      const vMap: Record<string, string> = {};
      for (const u of (versionData.users || [])) vMap[u.id] = u.appVersion || '';
      setVersions(vMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const members = team.filter((u: any) => u.role === 'MEMBER');
  const present = members.filter((u: any) => u.isClockedIn).length;
  const avgHours = members.length
    ? members.reduce((s: number, u: any) => s + u.totalSeconds, 0) / members.length
    : 0;

  const stats = [
    { label: 'Team Size', value: loading ? '…' : members.length, color: '#B71CED', icon: '👥' },
    { label: 'Present Today', value: loading ? '…' : `${present}/${members.length}`, color: '#10b981', icon: '✅' },
    { label: 'Avg Hours', value: loading ? '…' : fmtTime(avgHours), color: '#ED671C', icon: '⏱️' },
    { label: 'Pending Leaves', value: loading ? '…' : pendingLeaves, color: '#ef4444', icon: '📋' },
    { label: 'EOD Submitted', value: loading ? '…' : eodToday, color: '#6366f1', icon: '📝' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-[var(--text)]">Team Overview</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">Today's snapshot</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-[11px] text-[var(--muted)] mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Who's In / Who's Out */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: '● Clocked In', members: members.filter((u: any) => u.isClockedIn), color: 'text-green-500', bg: 'bg-green-500/10' },
          { title: '○ Not Clocked In', members: members.filter((u: any) => !u.isClockedIn), color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map(group => (
          <div key={group.title} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className={`text-xs font-bold ${group.color}`}>{group.title}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${group.bg} ${group.color}`}>{group.members.length}</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {loading ? (
                <div className="px-4 py-6 text-center text-xs text-[var(--muted)]">Loading...</div>
              ) : group.members.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-[var(--muted)]">—</div>
              ) : group.members.map((u: any) => (
                <div key={u.userId} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #ED671C, #B71CED)' }}>
                      {u.name?.[0]}
                    </div>
                    <span className="text-[12px] font-medium text-[var(--text)]">{u.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--muted)]">{fmtTime(u.totalSeconds)}</span>
                    {versions[u.userId] === LATEST_VERSION
                      ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">✓ Updated</span>
                      : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">↑ Update Now</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
