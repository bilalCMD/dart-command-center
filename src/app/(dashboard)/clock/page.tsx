'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Play, Square, ChevronDown, ChevronUp,
  RefreshCw, Clock, Users, Activity,
  LogIn, LogOut, Timer, Calendar,
  Coffee, FileText, X,
} from 'lucide-react';

const fmtTime = (s: number) => {
  const safe = Math.max(0, Math.floor(s));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const sec = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const fmtShort = (s: number) => {
  if (!s || s <= 0) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

function HistoryChart({ days, filter }: { days: any[]; filter: string }) {
  const max = Math.max(...days.map(d => d.seconds), 1);
  const todayStr = new Date().toISOString().split('T')[0];
  const target = 8 * 3600;
  const showLabel = (i: number) => {
    if (filter === 'month') return i === 0 || i === days.length - 1 || i % 5 === 0;
    return true;
  };
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {days.map((day) => {
          const isToday = day.date === todayStr;
          const heightPct = day.seconds > 0 ? Math.max((day.seconds / max) * 100, 5) : 0;
          const metTarget = day.seconds >= target;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--text)] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                {day.seconds > 0 ? fmtShort(day.seconds) : 'No data'}
              </div>
              <div className="w-full flex flex-col justify-end" style={{ height: 72 }}>
                {day.seconds > 0 ? (
                  <div className={`w-full rounded-sm transition-all ${isToday ? 'dart-gradient' : metTarget ? 'bg-emerald-400' : 'bg-[var(--border)]'}`} style={{ height: `${heightPct}%` }} />
                ) : (
                  <div className="w-full rounded-sm bg-[var(--surface2)]" style={{ height: 4 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {days.map((day, i) => (
          <div key={day.date} className="flex-1 text-center">
            {showLabel(i) && (
              <span className={`text-[8px] font-bold uppercase ${day.date === todayStr ? 'text-[var(--orange)]' : 'text-[var(--muted)]'}`}>
                {filter === 'month' ? new Date(day.date).getDate() : day.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm dart-gradient" /><span className="text-[9px] text-[var(--muted)] font-semibold">Today</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-400" /><span className="text-[9px] text-[var(--muted)] font-semibold">8h+ met</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[var(--border)]" /><span className="text-[9px] text-[var(--muted)] font-semibold">Below target</span></div>
      </div>
    </div>
  );
}

// ── EOD POPUP ─────────────────────────────────────────────
function EODPopup({ workedSeconds, onSubmitEOD, onSkip }: {
  workedSeconds: number;
  onSubmitEOD: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSkip} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-sm overflow-hidden animate-fade-in">
        {/* Top gradient bar */}
        <div className="h-1.5 w-full dart-gradient" />

        <div className="p-6">
          {/* Icon */}
          <div className="w-14 h-14 dart-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText size={24} className="text-white" />
          </div>

          <h2 className="text-[18px] font-black text-[var(--text)] text-center mb-1">
            Great work today! 🎉
          </h2>
          <p className="text-[13px] text-[var(--muted)] text-center mb-2">
            You worked for <span className="font-bold text-[var(--text)]">{fmtShort(workedSeconds)}</span> today.
          </p>
          <p className="text-[12px] text-[var(--muted)] text-center mb-6">
            Don't forget to submit your <span className="font-bold text-[var(--orange)]">End of Day Report</span> — let the team know what you accomplished!
          </p>

          {/* Stats */}
          <div className="bg-[var(--surface2)] rounded-xl px-4 py-3 mb-5 flex items-center justify-between border border-[var(--border)]">
            <div className="text-center">
              <p className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Hours Worked</p>
              <p className="text-[16px] font-black text-[var(--text)]">{fmtShort(workedSeconds)}</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="text-center">
              <p className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Target</p>
              <p className="text-[16px] font-black text-[var(--text)]">8h</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="text-center">
              <p className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Status</p>
              <p className={`text-[13px] font-black ${workedSeconds >= 28800 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {workedSeconds >= 28800 ? '✅ Target Met' : '⚠️ Below Target'}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <button onClick={onSubmitEOD}
            className="w-full py-3.5 dart-gradient text-white font-bold text-sm rounded-xl mb-2.5 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg">
            <FileText size={15} />
            Submit EOD Report Now
          </button>
          <button onClick={onSkip}
            className="w-full py-2.5 bg-transparent text-[var(--muted)] text-sm font-semibold rounded-xl hover:text-[var(--text)] transition-all flex items-center justify-center gap-1.5">
            <X size={13} />
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClockPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [isClockedIn, setIsClockedIn]     = useState(false);
  const [isOnBreak, setIsOnBreak]         = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const [breakSeconds, setBreakSeconds]   = useState(0);
  const [breakCount, setBreakCount]       = useState(0);
  const [events, setEvents]               = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]           = useState('');
  const [sessionStart, setSessionStart]   = useState<Date | null>(null);
  const [breakStart, setBreakStart]       = useState<Date | null>(null);
  const [showEODPopup, setShowEODPopup]   = useState(false);
  const [workedOnClockOut, setWorkedOnClockOut] = useState(0);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [historyFilter, setHistoryFilter]     = useState<'day' | 'week' | 'month'>('week');
  const [historyData, setHistoryData]         = useState<any>(null);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [teamData, setTeamData]               = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showInactive, setShowInactive]       = useState(false);
  const [refreshing, setRefreshing]           = useState(false);

  const fetchEmployeeStatus = async () => {
    try {
      const res  = await fetch('/api/clock/today');
      const data = await res.json();
      setIsClockedIn(data.isClockedIn || false);
      setIsOnBreak(data.isOnBreak || false);
      setElapsed(data.workingSeconds || data.totalSeconds || 0);
      setBreakSeconds(data.breakSeconds || 0);
      setBreakCount(data.breakCount || 0);
      setEvents(data.events || []);
      setSessionStart(data.currentSessionStart ? new Date(data.currentSessionStart) : null);
      setBreakStart(data.currentBreakStart ? new Date(data.currentBreakStart) : null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (f: string) => {
    setHistoryLoading(true);
    try {
      const res  = await fetch(`/api/clock/history?filter=${f}`);
      const data = await res.json();
      setHistoryData(data);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  const fetchTeamData = async () => {
    try {
      const res  = await fetch('/api/clock/team');
      const data = await res.json();
      setTeamData(data.team || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeamData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAdmin) { fetchTeamData(); }
    else { fetchEmployeeStatus(); fetchHistory('week'); }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      if (isClockedIn && !isOnBreak) {
        timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [isClockedIn, isOnBreak, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      if (isOnBreak) {
        breakTimerRef.current = setInterval(() => setBreakSeconds(p => p + 1), 1000);
      } else {
        if (breakTimerRef.current) clearInterval(breakTimerRef.current);
      }
      return () => { if (breakTimerRef.current) clearInterval(breakTimerRef.current); };
    }
  }, [isOnBreak, isAdmin]);

  const handleAction = async (type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END') => {
    setActionLoading(type);
    setErrorMsg('');
    try {
      const res  = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Action failed');
        setActionLoading(null);
        return;
      }

      // ── EOD POPUP on Clock Out ──
      if (type === 'CLOCK_OUT') {
        setWorkedOnClockOut(elapsed);
        setShowEODPopup(true);
      }

      await fetchEmployeeStatus();
      fetchHistory(historyFilter);
    } catch (e) {
      setErrorMsg('Network error. Try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (f: 'day' | 'week' | 'month') => {
    setHistoryFilter(f);
    fetchHistory(f);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
          <RefreshCw size={14} className="animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  if (isAdmin) {
    const activeMembers   = teamData.filter((m: any) => m.isClockedIn);
    const inactiveMembers = teamData.filter((m: any) => !m.isClockedIn);
    const allEvents: any[] = [];
    teamData.forEach((member: any) => {
      (member.events || []).forEach((e: any) => allEvents.push({ ...e, member }));
    });
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-black text-[var(--text)] tracking-tight">Attendance</h1>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">Real-time team status · {teamData.length} members</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 text-[11px] font-semibold bg-white border border-[var(--border)] px-3 py-1.5 rounded-lg shadow-soft hover:border-[var(--orange)] transition-all disabled:opacity-50">
            <RefreshCw size={11} className={`text-[var(--orange)] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <Activity size={16} className="text-[var(--success)]" />, bg: 'bg-green-50', label: 'Active Now', value: `${activeMembers.length}/${teamData.length}` },
            { icon: <Clock size={16} className="text-[var(--muted)]" />, bg: 'bg-slate-100', label: 'Clocked Out', value: inactiveMembers.length },
            { icon: <Users size={16} className="text-[var(--orange)]" />, bg: 'dart-gradient-soft', label: 'Total Team', value: teamData.length },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-3 shadow-soft flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>{s.icon}</div>
              <div>
                <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">{s.label}</div>
                <div className="text-[18px] font-black text-[var(--text)] leading-tight">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Active Now</span>
            <span className="text-[11px] text-[var(--muted)] font-semibold">· {activeMembers.length}</span>
          </div>
          {activeMembers.length === 0 ? (
            <div className="bg-white border border-dashed border-[var(--border)] rounded-xl p-8 text-center">
              <Clock size={18} className="text-[var(--subtle)] mx-auto mb-2" />
              <div className="text-[13px] font-semibold text-[var(--text)]">No one's clocked in yet</div>
            </div>
          ) : (
            <div className="bg-white border border-[var(--border)] rounded-xl shadow-soft overflow-hidden divide-y divide-[var(--border-subtle)]">
              {activeMembers.map((m: any) => <UserRow key={m.userId} member={m} active />)}
            </div>
          )}
        </div>

        {inactiveMembers.length > 0 && (
          <div className="mb-5">
            <button onClick={() => setShowInactive(!showInactive)} className="w-full flex items-center justify-between px-1 py-2 bg-transparent border-none cursor-pointer group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--subtle)]" />
                <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Clocked Out</span>
                <span className="text-[11px] text-[var(--muted)] font-semibold">· {inactiveMembers.length}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">
                <span>{showInactive ? 'Hide' : 'Show'}</span>
                {showInactive ? <ChevronUp size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
              </div>
            </button>
            {showInactive && (
              <div className="mt-2 bg-white border border-[var(--border)] rounded-xl shadow-soft overflow-hidden divide-y divide-[var(--border-subtle)] animate-fade-in">
                {inactiveMembers.map((m: any) => <UserRow key={m.userId} member={m} />)}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-[var(--border)] shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 bg-[var(--surface2)]">
            <Activity size={13} className="text-[var(--muted)]" />
            <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Today's Activity Log</span>
            <span className="text-[11px] text-[var(--muted)] font-semibold">· {allEvents.length} events</span>
          </div>
          {allEvents.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Activity size={18} className="text-[var(--subtle)] mx-auto mb-2" />
              <div className="text-[13px] font-semibold text-[var(--text)]">No activity today yet</div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] max-h-[400px] overflow-y-auto">
              {allEvents.map((e: any) => {
                const cfg = getEventConfig(e.type);
                return (
                  <div key={e.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-[var(--surface2)] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center text-[9.5px] font-bold shrink-0">
                        {e.member.avatar || e.member.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-[var(--text)]">{e.member.name}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.badge}`}>
                          {cfg.iconSm}{cfg.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--muted)] font-semibold">{formatTime(e.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // EMPLOYEE VIEW
  const progressPct = Math.min((elapsed / (8 * 3600)) * 100, 100);

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* EOD Popup */}
      {showEODPopup && (
        <EODPopup
          workedSeconds={workedOnClockOut}
          onSubmitEOD={() => {
            setShowEODPopup(false);
            router.push('/eod');
          }}
          onSkip={() => setShowEODPopup(false)}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-black text-[var(--text)] tracking-tight">Time Tracker</h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {isOnBreak ? 'On break — timer paused' : isClockedIn ? 'Working — keep it up!' : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <StatusBadge isClockedIn={isClockedIn} isOnBreak={isOnBreak} />
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-card p-8 mb-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] rounded-full dart-gradient blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface2)] rounded-md mb-3">
            <Timer size={11} className="text-[var(--muted)]" />
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.12em]">
              {isOnBreak ? 'Working Time (Paused)' : "Today's Working Time"}
            </span>
          </div>

          <div className={`text-[56px] font-black leading-none tracking-tight font-mono mb-2 ${isOnBreak ? 'text-[var(--subtle)]' : 'dart-gradient-text'}`}>
            {fmtTime(elapsed)}
          </div>

          {(breakSeconds > 0 || isOnBreak) && (
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <Coffee size={12} className="text-amber-600" />
              <span className="text-[11px] font-bold text-amber-700">
                Break {isOnBreak ? 'in progress' : 'taken'}: {fmtShort(breakSeconds)}
                {breakCount > 1 && ` · ${breakCount} breaks`}
              </span>
            </div>
          )}

          {isOnBreak && breakStart && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coffee size={14} className="text-amber-600" />
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">On Break</span>
              </div>
              <div className="text-[28px] font-black text-amber-700 font-mono leading-none">
                {fmtTime(breakSeconds)}
              </div>
              <div className="text-[10px] text-amber-600 mt-1">
                Started at {formatTime(breakStart.toISOString())}
              </div>
            </div>
          )}

          {sessionStart && isClockedIn && !isOnBreak && (
            <div className="inline-flex items-center gap-1.5 text-[12px] text-[var(--success)] font-semibold mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <span>Session started at {formatTime(sessionStart.toISOString())}</span>
            </div>
          )}
          {!isClockedIn && (
            <div className="text-[12px] text-[var(--muted)] mb-4">Ready to start your day</div>
          )}

          <div className="w-full bg-[var(--surface2)] rounded-full h-1.5 mb-2 overflow-hidden">
            <div className="h-full rounded-full dart-gradient transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-[10px] text-[var(--muted)] font-semibold mb-5">
            {progressPct >= 100 ? '🎉 8h target reached!' : `${progressPct.toFixed(0)}% of 8h daily target`}
          </div>

          {errorMsg && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!isClockedIn && (
              <ActionButton onClick={() => handleAction('CLOCK_IN')} loading={actionLoading === 'CLOCK_IN'} variant="primary" icon={<Play size={13} strokeWidth={3} fill="currentColor" />} label="Clock In" />
            )}
            {isClockedIn && !isOnBreak && (
              <>
                <ActionButton onClick={() => handleAction('CLOCK_OUT')} loading={actionLoading === 'CLOCK_OUT'} variant="danger" icon={<Square size={13} strokeWidth={3} fill="currentColor" />} label="Clock Out" />
                <ActionButton onClick={() => handleAction('BREAK_START')} loading={actionLoading === 'BREAK_START'} variant="warning" icon={<Coffee size={13} strokeWidth={2.5} />} label="Start Break" />
              </>
            )}
            {isOnBreak && (
              <ActionButton onClick={() => handleAction('BREAK_END')} loading={actionLoading === 'BREAK_END'} variant="success" icon={<Play size={13} strokeWidth={3} fill="currentColor" />} label="End Break" />
            )}
          </div>
        </div>
      </div>

      {events.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-soft overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 bg-[var(--surface2)]">
            <Activity size={13} className="text-[var(--muted)]" />
            <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Today's Activity</span>
            <span className="text-[11px] text-[var(--muted)] font-semibold">· {events.length} events</span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {[...events].reverse().map((e: any) => {
              const cfg = getEventConfig(e.type);
              return (
                <div key={e.id} className="px-4 py-3 flex items-center justify-between hover:bg-[var(--surface2)] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
                      {cfg.iconLg}
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--text)]">{cfg.label}</span>
                  </div>
                  <span className="text-[12px] text-[var(--muted)] font-semibold font-mono">{formatTime(e.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--border)] shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface2)]">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-[var(--muted)]" />
            <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">History</span>
          </div>
          <div className="flex gap-0.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-0.5">
            {(['day', 'week', 'month'] as const).map((f) => (
              <button key={f} onClick={() => handleFilterChange(f)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all capitalize border-none cursor-pointer ${historyFilter === f ? 'dart-gradient text-white shadow-soft' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
                {f === 'day' ? 'Today' : f === 'week' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-[var(--muted)] text-sm">
              <RefreshCw size={13} className="animate-spin" />
              <span className="text-[12px]">Loading...</span>
            </div>
          ) : historyData ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Total Hours', value: fmtShort(historyData.totalSeconds) },
                  { label: 'Avg / Day', value: fmtShort(historyData.avgSeconds) },
                  { label: 'Days Worked', value: `${historyData.workedDays}d` },
                ].map((s) => (
                  <div key={s.label} className="bg-[var(--surface2)] rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider mb-0.5">{s.label}</div>
                    <div className="text-[15px] font-black text-[var(--text)]">{s.value}</div>
                  </div>
                ))}
              </div>

              {historyFilter !== 'day' && historyData.days?.length > 0 && (
                <HistoryChart days={historyData.days} filter={historyFilter} />
              )}

              {historyFilter === 'day' && (
                <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
                  {historyData.days?.[0]?.sessions?.length > 0 ? (
                    historyData.days[0].sessions.map((s: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[var(--surface2)] flex items-center justify-center text-[10px] font-bold text-[var(--muted)]">{i + 1}</div>
                          <div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--success)]">
                              <LogIn size={10} /> {formatTime(s.clockIn)}
                            </div>
                            {s.clockOut && (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--danger)]">
                                <LogOut size={10} /> {formatTime(s.clockOut)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-[12px] font-bold text-[var(--text)]">{fmtShort(s.duration)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-[var(--muted)] text-[12px]">No sessions today yet</div>
                  )}
                </div>
              )}

              {historyFilter !== 'day' && (
                <div className="mt-3 space-y-1">
                  {[...historyData.days].reverse().filter((d: any) => d.seconds > 0).slice(0, 10).map((day: any) => (
                    <DayRow key={day.date} day={day} />
                  ))}
                  {historyData.days.filter((d: any) => d.seconds > 0).length === 0 && (
                    <div className="py-6 text-center text-[var(--muted)] text-[12px]">No records found</div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isClockedIn, isOnBreak }: { isClockedIn: boolean; isOnBreak: boolean }) {
  if (isOnBreak) return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-soft bg-amber-50 text-amber-700 border border-amber-200">
      <Coffee size={11} /> On Break
    </div>
  );
  if (isClockedIn) return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-soft bg-green-50 text-[var(--success)] border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" /> Clocked In
    </div>
  );
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-soft bg-slate-50 text-[var(--muted)] border border-[var(--border)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--subtle)]" /> Clocked Out
    </div>
  );
}

function ActionButton({ onClick, loading, variant, icon, label }: any) {
  const variantClass = {
    primary: 'dart-gradient text-white hover:shadow-[0_8px_20px_rgba(237,103,28,0.35)]',
    danger: 'bg-[var(--danger)] text-white hover:bg-red-600 hover:shadow-[0_8px_20px_rgba(239,68,68,0.3)]',
    success: 'bg-[var(--success)] text-white hover:bg-green-600 hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)]',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-[0_8px_20px_rgba(245,158,11,0.3)]',
  }[variant as 'primary' | 'danger' | 'success' | 'warning'];
  return (
    <button onClick={onClick} disabled={loading}
      className={`inline-flex items-center gap-2 px-7 py-3 text-[13px] rounded-xl font-bold border-none cursor-pointer transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed tracking-wider uppercase ${variantClass}`}>
      {loading ? <><RefreshCw size={14} className="animate-spin" /><span>...</span></> : <>{icon}<span>{label}</span></>}
    </button>
  );
}

function getEventConfig(type: string) {
  switch (type) {
    case 'CLOCK_IN':   return { label: 'Clock In',      iconSm: <Play size={9} strokeWidth={3} fill="currentColor" />,   iconLg: <LogIn size={12} strokeWidth={2.5} className="text-[var(--success)]" />,  badge: 'bg-green-50 text-[var(--success)]',  iconBg: 'bg-green-50' };
    case 'CLOCK_OUT':  return { label: 'Clock Out',     iconSm: <Square size={9} strokeWidth={3} fill="currentColor" />, iconLg: <LogOut size={12} strokeWidth={2.5} className="text-[var(--danger)]" />,  badge: 'bg-red-50 text-[var(--danger)]',     iconBg: 'bg-red-50' };
    case 'BREAK_START':return { label: 'Break Started', iconSm: <Coffee size={9} strokeWidth={2.5} />,                   iconLg: <Coffee size={12} strokeWidth={2.5} className="text-amber-600" />,         badge: 'bg-amber-50 text-amber-700',         iconBg: 'bg-amber-50' };
    case 'BREAK_END':  return { label: 'Break Ended',   iconSm: <Play size={9} strokeWidth={3} fill="currentColor" />,   iconLg: <Play size={12} strokeWidth={2.5} fill="currentColor" className="text-amber-600" />, badge: 'bg-amber-50 text-amber-700', iconBg: 'bg-amber-50' };
    default:           return { label: type,            iconSm: null,                                                     iconLg: null,                                                                        badge: 'bg-slate-50 text-[var(--muted)]',    iconBg: 'bg-slate-50' };
  }
}

function DayRow({ day }: { day: any }) {
  const [open, setOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday  = day.date === todayStr;
  const fmtS = (s: number) => { if (!s || s <= 0) return '0m'; const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const fmtT = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2.5 bg-transparent border-none cursor-pointer hover:bg-[var(--surface2)] transition-colors">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-[var(--orange)]' : 'bg-emerald-400'}`} />
          <span className="text-[12px] font-semibold text-[var(--text)]">{isToday ? 'Today' : dateLabel}</span>
          <span className="text-[10px] text-[var(--muted)] font-semibold">· {day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[var(--text)]">{fmtS(day.seconds)}</span>
          {open ? <ChevronUp size={12} className="text-[var(--muted)]" /> : <ChevronDown size={12} className="text-[var(--muted)]" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] bg-[var(--surface2)]">
          {day.sessions.map((s: any, i: number) => (
            <div key={i} className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--success)]"><LogIn size={10} /><span>{fmtT(s.clockIn)}</span></div>
                {s.clockOut ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--danger)]"><LogOut size={10} /><span>{fmtT(s.clockOut)}</span></div>
                ) : (
                  <span className="text-[10px] text-[var(--success)] font-semibold animate-pulse">● Active</span>
                )}
              </div>
              <span className="text-[11px] font-bold text-[var(--text)]">{fmtS(s.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ member, active = false }: { member: any; active?: boolean }) {
  const fmtS = (s: number) => { if (!s || s <= 0) return '0m'; const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const fmtT = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface2)] transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${active ? 'dart-gradient text-white shadow-soft' : 'bg-[var(--surface2)] border border-[var(--border)] text-[var(--text-soft)]'}`}>
        {member.avatar || member.name?.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[var(--text)] truncate">{member.name}</span>
          <span className="text-[11px] text-[var(--muted)] truncate">{member.email}</span>
        </div>
      </div>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${active ? 'bg-green-50 text-[var(--success)] border border-green-200' : 'bg-slate-50 text-[var(--muted)] border border-[var(--border)]'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--success)] animate-pulse' : 'bg-[var(--subtle)]'}`} />
        {active ? 'IN' : 'OUT'}
      </div>
      <div className="text-right shrink-0 min-w-[60px]">
        <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Today</div>
        <div className="text-[12px] font-bold text-[var(--text)] font-mono">{fmtS(member.totalSeconds || 0)}</div>
      </div>
      {active && member.clockInTime && (
        <div className="text-right shrink-0 min-w-[60px] border-l border-[var(--border)] pl-3">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Since</div>
          <div className="text-[12px] font-bold text-[var(--success)] font-mono">{fmtT(member.clockInTime)}</div>
        </div>
      )}
    </div>
  );
}