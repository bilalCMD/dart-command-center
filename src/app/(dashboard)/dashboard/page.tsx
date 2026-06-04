'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { StatCard, SectionTitle, PageHeader, Pill } from '@/components/ui';

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const firstName = user?.name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const [clockData,           setClockData]           = useState<any>(null);
  const [leaveBalance,        setLeaveBalance]        = useState<any[]>([]);
  const [eodData,             setEodData]             = useState<any>(null);
  const [earnedBadges,        setEarnedBadges]        = useState<any[]>([]);
  const [teamStats,           setTeamStats]           = useState<any>(null);
  const [appVersions,         setAppVersions]         = useState<Record<string,string>>({});
  const [pendingLeavesCount,  setPendingLeavesCount]  = useState(0);
  const [todayEodCount,       setTodayEodCount]       = useState(0);
  const [teamView,            setTeamView]            = useState<'in' | 'out'>('in');
  const [loading,             setLoading]             = useState(true);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const fmtTime = (s: number) => {
    if (!s || s <= 0) return '0m';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtClock = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const fmtDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  };

  useEffect(() => {
    if (!user) return;

    fetch('/api/clock/today')
      .then(r => r.json())
      .then(setClockData)
      .catch(console.error);

    if (!isAdmin) {
      fetch('/api/leaves/balance')
        .then(r => r.json())
        .then(d => setLeaveBalance(d.balances || []))
        .catch(console.error);

      fetch('/api/badges/my')
        .then(r => r.json())
        .then(d => setEarnedBadges(d.earnedBadges || []))
        .catch(console.error);
    }

    fetch('/api/eod')
      .then(r => r.json())
      .then(data => {
        setEodData(data);
        if (isAdmin && data.reports) {
          const start = new Date(); start.setHours(0, 0, 0, 0);
          const end   = new Date(); end.setHours(23, 59, 59, 999);
          setTodayEodCount(
            data.reports.filter((rep: any) => {
              const d = new Date(rep.date);
              return d >= start && d <= end;
            }).length
          );
        }
      })
      .catch(console.error);

    if (isAdmin) {
      fetch('/api/clock/team')
        .then(r => r.json())
        .then(setTeamStats)
        .catch(console.error);

      fetch('/api/leaves/pending')
        .then(r => r.json())
        .then(d => setPendingLeavesCount(d.count || 0))
        .catch(console.error);

      fetch('/api/app-version')
        .then(r => r.json())
        .then(d => {
          const map: Record<string,string> = {};
          for (const u of (d.users||[])) map[u.id] = u.appVersion || '';
          setAppVersions(map);
        }).catch(console.error);
    }

    setLoading(false);
  }, [isAdmin, user]);

  const filteredTeam = teamStats?.team?.filter((m: any) =>
    teamView === 'in' ? m.isClockedIn : !m.isClockedIn
  ) || [];

  const annualBalance = leaveBalance.find(b => b.type === 'ANNUAL');
  const sickBalance   = leaveBalance.find(b => b.type === 'SICK');
  const leaveText     = annualBalance && sickBalance
    ? `Annual: ${annualBalance.remaining} · Sick: ${sickBalance.remaining}`
    : '—';
  const totalLeaveRemaining = leaveBalance
  .filter(b => b.type !== 'UNPAID')
  .reduce((sum, b) => sum + (b.remaining || 0), 0);

  const eodStreak      = eodData?.reports?.length || 0;
  const submittedToday = eodData?.submittedToday || false;

  const clockedInCount = teamStats?.team?.filter((m: any) => m.isClockedIn).length || 0;
  const totalMembers   = teamStats?.team?.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted)] text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={isAdmin ? 'Admin Dashboard' : 'Dashboard'}>
        <Pill>{today}</Pill>
      </PageHeader>

      {/* ── ADMIN SECTION ── */}
      {isAdmin && (
        <>
          <SectionTitle>Team Overview</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2 mb-4">
            <StatCard
              label="Clocked In Now"
              value={`${clockedInCount}/${totalMembers}`}
              sub="Team members active"
              accent="#10b981"
            />
            <StatCard
              label="Avg Hours Today"
              value={fmtTime(teamStats?.team?.length ? Math.round(teamStats.team.filter((m:any)=>m.isClockedIn).reduce((s:number,m:any)=>s+m.totalSeconds,0) / Math.max(teamStats.team.filter((m:any)=>m.isClockedIn).length,1)) : 0)}
              sub={`${teamStats?.team?.filter((m:any)=>m.isClockedIn).length||0} members active`}
              accent="#B71CED"
            />
            <a href="/leaves" className="no-underline">
              <StatCard
                label="Pending Leaves"
                value={pendingLeavesCount > 0 ? `${pendingLeavesCount}` : '—'}
                sub={pendingLeavesCount > 0 ? 'Needs review' : 'All clear'}
                accent="#ED671C"
              />
            </a>
            <StatCard
              label="EOD Submitted Today"
              value={`${todayEodCount}/${totalMembers}`}
              sub="Team members active"
            />
          </div>

          {teamStats?.team?.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle>Live Team Status</SectionTitle>
                <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]">
                  <button
                    onClick={() => setTeamView('in')}
                    className={`px-3 py-1 text-[10px] font-semibold rounded transition-all ${
                      teamView === 'in' ? 'bg-green-500 text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    🟢 Clocked In ({clockedInCount})
                  </button>
                  <button
                    onClick={() => setTeamView('out')}
                    className={`px-3 py-1 text-[10px] font-semibold rounded transition-all ${
                      teamView === 'out' ? 'bg-red-500 text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    🔴 Clocked Out ({totalMembers - clockedInCount})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 mb-4">
                {filteredTeam.length > 0 ? (
                  filteredTeam.map((member: any) => (
                    <div
                      key={member.userId}
                      className="bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)] flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center text-[11px] font-bold border border-[var(--border)]">
                        {member.avatar || member.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          {member.name}
                          {appVersions[member.userId] === '1.0.9'
                            ? <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-500/10 text-green-500">✓ Updated</span>
                            : appVersions[member.userId]
                              ? <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-500/10 text-red-400">↑ Update</span>
                              : <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-500/10 text-gray-400">No app</span>
                          }
                        </div>
                        <div className={`text-[10px] font-bold ${member.isClockedIn ? 'text-green-400' : 'text-[var(--muted)]'}`}>
                          {member.isClockedIn ? '🟢 In' : '🔴 Out'} · {fmtTime(member.totalSeconds || 0)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-[var(--muted)] text-xs py-4">
                    No members {teamView === 'in' ? 'clocked in' : 'clocked out'} right now
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── EMPLOYEE SECTION ── */}
      {!isAdmin && (
        <>
          {/* Greeting */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--text)]">
                {getGreeting()}, {firstName} 👋
              </h2>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">
                {clockData?.isClockedIn
                  ? `Clocked in since ${fmtClock(clockData?.clockInTime)}`
                  : 'You are not clocked in yet'}
              </p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2 mb-3">
            <div className="relative bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-t-xl" />
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">Today's Hours</div>
              <div className="text-[22px] font-semibold leading-none mb-1">
                {fmtTime(clockData?.totalSeconds || 0)}
              </div>
              <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${clockData?.isClockedIn ? 'bg-emerald-500' : 'bg-red-400'}`} />
                {clockData?.isClockedIn ? 'Currently clocked in' : 'Clocked out'}
              </div>
            </div>

            <div className="relative bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-xl ${submittedToday ? 'bg-violet-500' : 'bg-amber-500'}`} />
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">EOD Report</div>
              <div className="text-[22px] font-semibold leading-none mb-1">
                {submittedToday ? '✅' : '⏳'}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {submittedToday ? 'Submitted today' : 'Pending'} · {eodStreak} this month
              </div>
            </div>

            <div className="relative bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-orange-500 rounded-t-xl" />
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">Leave Balance</div>
              <div className="text-[22px] font-semibold leading-none mb-1">
                {totalLeaveRemaining} <span className="text-[13px] font-normal text-[var(--muted)]">days</span>
              </div>
              <div className="text-[11px] text-[var(--muted)]">{leaveText}</div>
            </div>
          </div>

          {/* EOD Reminder */}
          {!submittedToday && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-base flex-shrink-0">
                📝
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">EOD not submitted yet</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  Submit before end of day to maintain your streak
                </div>
              </div>
              <a
                href="/eod"
                className="text-[11px] font-semibold text-amber-500 no-underline whitespace-nowrap hover:opacity-80 transition-opacity"
              >
                Submit now →
              </a>
            </div>
          )}

          {/* Badges */}
          <SectionTitle>
            My Badges {earnedBadges.length > 0 && `(${earnedBadges.length})`}
          </SectionTitle>

          {earnedBadges.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 text-center mb-4">
              <div className="text-3xl mb-2 opacity-40">🏅</div>
              <div className="text-xs font-semibold text-[var(--text)] mb-1">No badges yet</div>
              <div className="text-[10px] text-[var(--muted)]">
                Keep up the good work — badges will be awarded for your achievements
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 mb-4">
              {earnedBadges.map((b: any) => (
                <div
                  key={b.userBadgeId || b.id}
                  className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center transition-all hover:border-emerald-500/40"
                >
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl bg-emerald-500/10">
                    {b.icon}
                  </div>
                  <div className="text-[11px] font-semibold mb-0.5">{b.name}</div>
                  <div className="text-[9px] text-[var(--muted)] leading-tight mb-2">{b.description}</div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                    ✔ {fmtDate(b.awardedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── QUICK ACTIONS ── */}
      <SectionTitle>Quick Actions</SectionTitle>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
        {(isAdmin ? [
          { label: 'View Attendance', icon: '🕐', href: '/clock' },
          { label: 'Review Leaves',   icon: '🏖', href: '/leaves' },
          { label: 'EOD Reports',     icon: '📝', href: '/eod' },
          { label: 'KPIs',            icon: '📊', href: '/kpis' },
        ] : [
          { label: 'Clock In/Out', icon: '⏱', href: '/clock' },
          { label: 'Apply Leave',  icon: '🏖', href: '/leaves' },
          { label: 'Submit EOD',   icon: '📝', href: '/eod' },
          { label: 'My KPIs',      icon: '📊', href: '/kpis' },
        ]).map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bg-[var(--surface)] rounded-xl p-3 text-center border border-[var(--border)] no-underline text-[var(--text)] hover:border-[var(--orange)] transition-colors flex flex-col items-center gap-1.5"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[11px] font-semibold">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}