'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, SectionTitle, StatCard } from '@/components/ui';

const KPI_COLORS: Record<string, string> = {
  'Client Satisfaction': '#10b981',
  'On-Time Delivery': '#B71CED',
  'Revenue Growth': '#ED671C',
  'Content Output': '#3b82f6',
  'Revision Rate': '#f59e0b',
  'EOD Compliance': '#6366f1',
};

const ALL_KPIS = [
  { name: 'Client Satisfaction', desc: 'Client feedback & satisfaction score' },
  { name: 'On-Time Delivery', desc: 'Deliverables submitted before deadline' },
  { name: 'Revenue Growth', desc: 'Monthly revenue contribution' },
  { name: 'Content Output', desc: 'Volume of content produced' },
  { name: 'Revision Rate', desc: 'Revisions requested by clients' },
  { name: 'EOD Compliance', desc: 'EOD reports submitted on time' },
];

export default function KPIsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [eodReports, setEodReports] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch('/api/eod');
      const data = await res.json();
      setEodReports(data.reports || []);

      // Admin: Fetch team data for total members
      if (isAdmin) {
        const teamRes = await fetch('/api/clock/team');
        const teamData = await teamRes.json();
        setTeamStats(teamData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const kpiCounts: Record<string, number> = {};
  eodReports.forEach((r) => {
    if (r.kpiFocus) kpiCounts[r.kpiFocus] = (kpiCounts[r.kpiFocus] || 0) + 1;
  });

  const totalReports = eodReports.length;

  // Calculate compliance
  const now = new Date();
  const daysThisMonth = now.getDate();
  
  let compliancePct = 0;
  let complianceSub = '';

  if (isAdmin) {
    // Admin: Team compliance (unique users who submitted today / total members)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayReports = eodReports.filter((r) => {
      const d = new Date(r.date);
      return d >= todayStart && d <= todayEnd;
    });

    const uniqueUsersToday = new Set(todayReports.map(r => r.userId)).size;
    const totalMembers = teamStats?.team?.length || 0;

    compliancePct = totalMembers > 0 ? Math.round((uniqueUsersToday / totalMembers) * 100) : 0;
    complianceSub = `${uniqueUsersToday}/${totalMembers} submitted today`;
  } else {
    // Employee: Personal compliance (days submitted / days this month)
    const eodThisMonth = eodReports.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    compliancePct = daysThisMonth > 0 ? Math.round((eodThisMonth / daysThisMonth) * 100) : 0;
    complianceSub = `${eodThisMonth}/${daysThisMonth} days this month`;
  }

  // Calculate today's submissions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaySubmissions = eodReports.filter((r) => {
    const d = new Date(r.date);
    return d >= todayStart && d <= todayEnd;
  }).length;

  const topKpi = Object.keys(kpiCounts).sort((a, b) => kpiCounts[b] - kpiCounts[a])[0] || '—';

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div>
      {/* Header with Refresh */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold">
          {isAdmin ? 'KPIs & OKRs — Team' : 'My KPIs & OKRs'}
        </h1>
        <button
          onClick={fetchData}
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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 mb-4">
        <StatCard
          label="EOD Compliance"
          value={`${compliancePct}%`}
          sub={complianceSub}
          accent="#10b981"
        />
        <StatCard
          label="Today's Submissions"
          value={`${todaySubmissions}`}
          sub={`${totalReports} total reports`}
          accent="#B71CED"
        />
        <StatCard
          label="Top KPI"
          value={topKpi}
          sub="Most worked on"
          accent="#ED671C"
        />
      </div>

      <SectionTitle>KPI Focus Areas</SectionTitle>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 mb-4">
        {ALL_KPIS.map((kpi) => {
          const count = kpiCounts[kpi.name] || 0;
          const pct = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0;
          const color = KPI_COLORS[kpi.name] || '#888';
          return (
            <div
              key={kpi.name}
              className="bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)]"
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="text-[11px] font-bold">{kpi.name}</div>
                <div
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: color + '22', color }}
                >
                  {count}x
                </div>
              </div>
              <div className="text-[9px] text-[var(--muted)] mb-2">{kpi.desc}</div>
              <div className="h-1 bg-[var(--bg)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="text-[9px] text-[var(--muted)] mt-0.5">{pct}% of EODs</div>
            </div>
          );
        })}
      </div>

      {!loading && eodReports.length > 0 && (
        <>
          <SectionTitle>Recent Activity</SectionTitle>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="divide-y divide-[var(--border)]">
              {eodReports.slice(0, 10).map((r) => {
                const color = KPI_COLORS[r.kpiFocus] || '#888';
                return (
                  <div
                    key={r.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--surface2)] transition-colors cursor-pointer"
                    onClick={() => setSelectedReport(r)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isAdmin && r.user && (
                        <div className="w-6 h-6 rounded-full bg-[var(--bg)] flex items-center justify-center text-[9px] font-bold border border-[var(--border)] shrink-0">
                          {r.user.avatar || r.user.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        {isAdmin && r.user && (
                          <div className="text-[10px] font-semibold">{r.user.name}</div>
                        )}
                        <div className="text-xs text-[var(--muted)] truncate">
                          {r.tasksCompleted}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: color + '22', color }}
                      >
                        {r.kpiFocus}
                      </span>
                      <span className="text-[9px] text-[var(--muted)]">
                        {new Date(r.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="text-xs text-[var(--muted)] py-8 text-center">Loading...</div>
      )}

      {!loading && eodReports.length === 0 && (
        <div className="text-xs text-[var(--muted)] py-8 text-center bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          No data yet — submit EOD reports to see KPI breakdown
        </div>
      )}

      {/* EOD Detail Popup */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                {isAdmin && selectedReport.user && (
                  <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex items-center justify-center text-xs font-bold border-2 border-[var(--border)]">
                    {selectedReport.user.avatar ||
                      selectedReport.user.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-[var(--text)]">
                    {isAdmin && selectedReport.user
                      ? selectedReport.user.name
                      : 'EOD Report'}
                  </div>
                  {isAdmin && selectedReport.user && (
                    <div className="text-xs text-[var(--muted)]">
                      {selectedReport.user.email}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Date & KPI */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-1">
                    DATE
                  </div>
                  <div className="text-sm font-bold text-[var(--text)]">
                    {formatDate(selectedReport.date)}
                  </div>
                </div>
                {selectedReport.kpiFocus && (
                  <div>
                    <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-1 text-right">
                      KPI FOCUS
                    </div>
                    <span
                      className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{
                        background: KPI_COLORS[selectedReport.kpiFocus] + '22',
                        color: KPI_COLORS[selectedReport.kpiFocus],
                      }}
                    >
                      {selectedReport.kpiFocus}
                    </span>
                  </div>
                )}
              </div>

              {/* Tasks Completed */}
              <div>
                <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-2">
                  TASKS COMPLETED
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)] text-sm text-[var(--text)] leading-relaxed">
                  {selectedReport.tasksCompleted}
                </div>
              </div>

              {/* Blockers */}
              {selectedReport.blockers && (
                <div>
                  <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-2">
                    BLOCKERS
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-sm text-[var(--text)] leading-relaxed">
                    {selectedReport.blockers}
                  </div>
                </div>
              )}

              {/* Tomorrow's Plan */}
              {selectedReport.tomorrowPlan && (
                <div>
                  <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-2">
                    TOMORROW'S PLAN
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-sm text-[var(--text)] leading-relaxed">
                    {selectedReport.tomorrowPlan}
                  </div>
                </div>
              )}

              {/* Submitted Date */}
              <div className="text-xs text-[var(--muted)] text-center pt-2 border-t border-[var(--border)]">
                Submitted on {formatDate(selectedReport.submittedAt || selectedReport.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}