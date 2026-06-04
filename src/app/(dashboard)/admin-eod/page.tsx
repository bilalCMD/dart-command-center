'use client';
import { useEffect, useState } from 'react';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export default function AdminEOD() {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [teamStatus, setTeamStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Load team + today's EOD submissions
    Promise.all([
      fetch('/api/clock/team').then(r => r.json()),
      fetch(`/api/eod?date=${today}&all=true`).then(r => r.json()),
    ]).then(([clockData, eodData]) => {
      const members = (clockData.team || []).filter((u: any) => u.role === 'MEMBER');
      setUsers(members);
      setTeamStatus(eodData.reports || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadUserReports = async (user: any) => {
    setSelected(user);
    setReportsLoading(true);
    const res = await fetch(`/api/eod/admin?userId=${user.userId}&from=2026-01-01&to=${today}`);
    const data = await res.json();
    setReports(data.reports || []);
    setReportsLoading(false);
  };

  const submittedIds = new Set(teamStatus.map((r: any) => r.userId));
  const submitted = users.filter(u => submittedIds.has(u.userId)).length;
  const pending = users.length - submitted;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-[var(--text)]">EOD Compliance</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">Today: {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Submitted Today', value: submitted, color: '#10b981' },
          { label: 'Pending', value: pending, color: '#ef4444' },
          { label: 'Team Size', value: users.length, color: '#B71CED' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-[11px] text-[var(--muted)] mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{loading ? '…' : s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-4">
        {/* Team list */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[var(--border)]">
            <span className="text-[10px] font-bold text-[var(--muted)] tracking-widest uppercase">Team</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {loading ? (
              <div className="p-6 text-center text-xs text-[var(--muted)]">Loading...</div>
            ) : users.map((u: any) => {
              const hasDone = submittedIds.has(u.userId);
              return (
                <button key={u.userId} onClick={() => loadUserReports(u)}
                  className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-all ${selected?.userId === u.userId ? 'bg-[var(--surface2)]' : 'hover:bg-[var(--surface2)]'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #ED671C, #B71CED)' }}>
                      {u.name?.[0]}
                    </div>
                    <span className="text-[12px] font-medium text-[var(--text)] truncate">{u.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hasDone ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {hasDone ? '✓' : '✗'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reports panel */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-[var(--muted)]">
              ← Select a team member to view EOD reports
            </div>
          ) : reportsLoading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-[var(--muted)]">Loading...</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <span className="text-sm font-bold text-[var(--text)]">{selected.name} — EOD History</span>
              </div>
              <div className="divide-y divide-[var(--border)] max-h-[480px] overflow-y-auto">
                {reports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[var(--muted)]">No EOD reports found</div>
                ) : reports.map((r: any) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[var(--orange)]">{fmtDate(r.date)}</span>
                      <span className="text-[10px] text-[var(--muted)]">{new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                    <p className="text-xs text-[var(--text)] mb-1"><span className="font-semibold">Tasks:</span> {r.content}</p>
                    {r.blockers && <p className="text-xs text-red-400"><span className="font-semibold">Blockers:</span> {r.blockers}</p>}
                    {r.tomorrowPlan && <p className="text-xs text-[var(--muted)]"><span className="font-semibold">Tomorrow:</span> {r.tomorrowPlan}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
