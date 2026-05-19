'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Play, Square, ChevronDown, ChevronUp,
  RefreshCw, Clock, Users, Activity,
  LogIn, LogOut, Timer, Calendar,
  Coffee, FileText, X, TrendingUp,
  Zap, BarChart2, AlarmClock, MapPin,
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

function AwayModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string>('Meeting');
  const reasons = [
    { value: 'Meeting', icon: '👥', label: 'Physical Meeting' },
    { value: 'Other Device', icon: '💻', label: 'Working on Other Device' },
    { value: 'Washroom', icon: '🚿', label: 'Washroom Break' },
    { value: 'Other', icon: '🚶', label: 'Other' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #8b5cf6, #6366f1)' }} />
        <div className="p-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            <span className="text-2xl">🕌</span>
          </div>
          <h2 className="text-[18px] font-black text-[var(--text)] text-center mb-1">Going Away?</h2>
          <p className="text-[12px] text-[var(--muted)] text-center mb-5">Idle time won't be counted while away</p>
          <div className="space-y-2 mb-5">
            {reasons.map(r => (
              <button key={r.value} onClick={() => setSelected(r.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left cursor-pointer ${selected === r.value ? 'border-purple-500 bg-purple-50' : 'border-[var(--border)] bg-white hover:border-purple-200'}`}>
                <span className="text-2xl">{r.icon}</span>
                <span className="text-[13px] font-bold text-[var(--text)]">{r.label}</span>
                {selected === r.value && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
          <button onClick={() => onConfirm(selected)} className="w-full py-3.5 text-white font-bold text-sm rounded-xl mb-2.5 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            🕌 Confirm Away
          </button>
          <button onClick={onCancel} className="w-full py-2.5 bg-transparent text-[var(--muted)] text-sm font-semibold rounded-xl hover:text-[var(--text)] transition-all flex items-center justify-center gap-1.5">
            <X size={13} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
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
      <div className="flex items-end gap-1.5" style={{ height: 100 }}>
        {days.map((day) => {
          const isToday = day.date === todayStr;
          const heightPct = day.seconds > 0 ? Math.max((day.seconds / max) * 100, 5) : 0;
          const metTarget = day.seconds >= target;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--text)] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                {day.seconds > 0 ? fmtShort(day.seconds) : 'No data'}
              </div>
              <div className="w-full flex flex-col justify-end rounded-sm overflow-hidden" style={{ height: 88 }}>
                {day.seconds > 0 ? (
                  <div
                    className={`w-full rounded-sm transition-all ${isToday ? 'dart-gradient' : metTarget ? 'bg-emerald-400' : 'bg-[var(--border)]'}`}
                    style={{ height: `${heightPct}%` }}
                  />
                ) : (
                  <div className="w-full rounded-sm bg-[var(--surface2)]" style={{ height: 4 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
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
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm dart-gradient" /><span className="text-[10px] text-[var(--muted)] font-semibold">Today</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /><span className="text-[10px] text-[var(--muted)] font-semibold">Target met</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[var(--border)]" /><span className="text-[10px] text-[var(--muted)] font-semibold">Below target</span></div>
      </div>
    </div>
  );
}

function EODPopup({ workedSeconds, onSubmitEOD, onSkip }: {
  workedSeconds: number;
  onSubmitEOD: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSkip} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full dart-gradient" />
        <div className="p-6">
          <div className="w-14 h-14 dart-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText size={24} className="text-white" />
          </div>
          <h2 className="text-[18px] font-black text-[var(--text)] text-center mb-1">Great work today! 🎉</h2>
          <p className="text-[13px] text-[var(--muted)] text-center mb-2">
            You worked for <span className="font-bold text-[var(--text)]">{fmtShort(workedSeconds)}</span> today.
          </p>
          <p className="text-[12px] text-[var(--muted)] text-center mb-6">
            Submit your <span className="font-bold text-[var(--orange)]">End of Day Report</span> — let the team know what you accomplished!
          </p>
          <div className="bg-[var(--surface2)] rounded-xl px-4 py-3 mb-5 flex items-center justify-between border border-[var(--border)]">
            <div className="text-center">
              <p className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Worked</p>
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
                {workedSeconds >= 28800 ? '✅ Met' : '⚠️ Short'}
              </p>
            </div>
          </div>
          <button onClick={onSubmitEOD} className="w-full py-3.5 dart-gradient text-white font-bold text-sm rounded-xl mb-2.5 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg">
            <FileText size={15} /> Submit EOD Report Now
          </button>
          <button onClick={onSkip} className="w-full py-2.5 bg-transparent text-[var(--muted)] text-sm font-semibold rounded-xl hover:text-[var(--text)] transition-all flex items-center justify-center gap-1.5">
            <X size={13} /> Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

function DayDetailModal({ day, onClose }: { day: any; onClose: () => void }) {
  const fmtS = (s: number) => { if (!s || s <= 0) return '0m'; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const fmtT = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const metTarget = day.seconds >= 8 * 3600;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className={`px-6 py-5 flex items-start justify-between shrink-0 ${metTarget ? 'dart-gradient' : 'bg-[var(--surface2)]'}`}>
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${metTarget ? 'text-white/70' : 'text-[var(--muted)]'}`}>Daily Summary</div>
            <div className={`text-[16px] font-black ${metTarget ? 'text-white' : 'text-[var(--text)]'}`}>{dateLabel}</div>
            <div className={`text-[11px] mt-0.5 ${metTarget ? 'text-white/70' : 'text-[var(--muted)]'}`}>
              {metTarget ? '✅ Target Met!' : '⚠️ Below 8h target'}
            </div>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer ${metTarget ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[var(--border)] text-[var(--muted)]'}`}>
            <X size={12} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Work Time', value: fmtS(day.seconds), icon: <Timer size={14} className="text-[var(--orange)]" />, bg: 'bg-orange-50 border-orange-100' },
              { label: 'Sessions', value: `${day.sessions?.length || 0}`, icon: <Activity size={14} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-100' },
              { label: 'Target', value: metTarget ? 'Met ✓' : 'Not Met', icon: <TrendingUp size={14} className={metTarget ? 'text-emerald-500' : 'text-amber-500'} />, bg: metTarget ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-[14px] font-black text-[var(--text)]">{s.value}</div>
                <div className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Sessions · {day.sessions?.length || 0}</div>
            <div className="space-y-2">
              {(day.sessions || []).map((s: any, i: number) => (
                <div key={i} className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase">Session {i + 1}</span>
                    <span className="text-[12px] font-black text-[var(--text)]">{fmtS(s.duration)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                      <LogIn size={11} /> {fmtT(s.clockIn)}
                    </div>
                    {s.clockOut ? (
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-red-500">
                        <LogOut size={11} /> {fmtT(s.clockOut)}
                      </div>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold animate-pulse">● Active</span>
                    )}
                  </div>
                </div>
              ))}
              {(!day.sessions || day.sessions.length === 0) && (
                <div className="text-center py-6 text-[var(--muted)] text-[12px]">No sessions recorded</div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] shrink-0 flex items-center justify-between bg-[var(--surface2)]">
          <span className="text-[11px] text-[var(--muted)]">Total: {fmtS(day.seconds)}</span>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-bold border border-[var(--border)] bg-white hover:bg-[var(--surface2)] transition-colors cursor-pointer text-[var(--text)]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DayRow({ day }: { day: any }) {
  const [showModal, setShowModal] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = day.date === todayStr;
  const fmtS = (s: number) => { if (!s || s <= 0) return '0m'; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const metTarget = day.seconds >= 8 * 3600;
  return (
    <>
      {showModal && <DayDetailModal day={day} onClose={() => setShowModal(false)} />}
      <div
        className="border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--orange)] transition-all group"
        onClick={() => setShowModal(true)}
      >
        <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface2)] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-[var(--orange)]' : metTarget ? 'bg-emerald-400' : 'bg-[var(--border)]'}`} />
            <span className="text-[12px] font-semibold text-[var(--text)]">{isToday ? 'Today' : dateLabel}</span>
            <span className="text-[10px] text-[var(--muted)] font-semibold">· {day.sessions?.length || 0} session{(day.sessions?.length || 0) !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-bold ${metTarget ? 'text-emerald-600' : 'text-[var(--text)]'}`}>{fmtS(day.seconds)}</span>
            <ChevronDown size={12} className="text-[var(--muted)] group-hover:text-[var(--orange)] transition-colors" />
          </div>
        </div>
      </div>
    </>
  );
}

function StatusBadge({ isClockedIn, isOnBreak, isAway }: { isClockedIn: boolean; isOnBreak: boolean; isAway?: boolean }) {
  if (isAway) return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
      <span>🕌</span> Away
    </div>
  );
  if (isOnBreak) return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
      <Coffee size={11} /> On Break
    </div>
  );
  if (isClockedIn) return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-green-50 text-emerald-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Clocked In
    </div>
  );
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-slate-50 text-[var(--muted)] border border-[var(--border)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--subtle)]" /> Clocked Out
    </div>
  );
}

function ActionButton({ onClick, loading, variant, icon, label, fullWidth }: any) {
  const variantClass = {
    primary: 'dart-gradient text-white hover:shadow-[0_8px_20px_rgba(237,103,28,0.35)]',
    danger: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-[0_8px_20px_rgba(239,68,68,0.3)]',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    away: 'text-white hover:opacity-90',
  }[variant as 'primary' | 'danger' | 'success' | 'warning' | 'away'];
  const inlineStyle = variant === 'away' ? { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' } : {};
  return (
    <button onClick={onClick} disabled={loading} style={inlineStyle}
      className={`${fullWidth ? 'w-full' : ''} inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] rounded-xl font-bold border-none cursor-pointer transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed tracking-wide uppercase ${variantClass}`}>
      {loading ? <><RefreshCw size={14} className="animate-spin" /><span>...</span></> : <>{icon}<span>{label}</span></>}
    </button>
  );
}

function getEventConfig(type: string) {
  switch (type) {
    case 'CLOCK_IN': return { label: 'Clock In', iconSm: <Play size={9} strokeWidth={3} fill="currentColor" />, iconLg: <LogIn size={13} strokeWidth={2.5} className="text-emerald-600" />, badge: 'bg-green-50 text-emerald-700', iconBg: 'bg-green-50' };
    case 'CLOCK_OUT': return { label: 'Clock Out', iconSm: <Square size={9} strokeWidth={3} fill="currentColor" />, iconLg: <LogOut size={13} strokeWidth={2.5} className="text-red-500" />, badge: 'bg-red-50 text-red-600', iconBg: 'bg-red-50' };
    case 'BREAK_START': return { label: 'Break Started', iconSm: <Coffee size={9} strokeWidth={2.5} />, iconLg: <Coffee size={13} strokeWidth={2.5} className="text-amber-600" />, badge: 'bg-amber-50 text-amber-700', iconBg: 'bg-amber-50' };
    case 'BREAK_END': return { label: 'Break Ended', iconSm: <Play size={9} strokeWidth={3} fill="currentColor" />, iconLg: <Play size={13} strokeWidth={2.5} fill="currentColor" className="text-amber-600" />, badge: 'bg-amber-50 text-amber-700', iconBg: 'bg-amber-50' };
    case 'AWAY_START': return { label: 'Away Started', iconSm: <span style={{ fontSize: '9px' }}>🕌</span>, iconLg: <span style={{ fontSize: '14px' }}>🕌</span>, badge: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-50' };
    case 'AWAY_END': return { label: 'Away Ended', iconSm: <Play size={9} strokeWidth={3} fill="currentColor" />, iconLg: <Play size={13} strokeWidth={2.5} fill="currentColor" className="text-purple-600" />, badge: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-50' };
    default: return { label: type, iconSm: null, iconLg: null, badge: 'bg-slate-50 text-[var(--muted)]', iconBg: 'bg-slate-50' };
  }
}

function UserRow({ member, active = false }: { member: any; active?: boolean }) {
  const fmtS = (s: number) => { if (!s || s <= 0) return '0m'; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const fmtT = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return (
    <div className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--surface2)] transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden ${active ? 'dart-gradient text-white shadow-soft' : 'bg-[var(--surface2)] border border-[var(--border)] text-[var(--text-soft)]'}`}>
        {member.image
          ? <img src={member.image} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : member.avatar || member.name?.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[var(--text)] truncate">{member.name}</div>
        <div className="text-[11px] text-[var(--muted)] truncate">{member.email}</div>
      </div>
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${active ? 'bg-green-50 text-emerald-700 border border-green-200' : 'bg-slate-50 text-[var(--muted)] border border-[var(--border)]'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--subtle)]'}`} />
        {active ? 'IN' : 'OUT'}
      </div>
      <div className="text-right shrink-0 min-w-[55px]">
        <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Today</div>
        <div className="text-[13px] font-bold text-[var(--text)] font-mono">{fmtS(member.totalSeconds || 0)}</div>
      </div>
      {active && member.clockInTime && (
        <div className="text-right shrink-0 min-w-[55px] border-l border-[var(--border)] pl-3">
          <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Since</div>
          <div className="text-[12px] font-bold text-emerald-600 font-mono">{fmtT(member.clockInTime)}</div>
        </div>
      )}
    </div>
  );
}

export default function ClockPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isAway, setIsAway] = useState(false);
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [breakStart, setBreakStart] = useState<Date | null>(null);
  const [showEODPopup, setShowEODPopup] = useState(false);
  const [workedOnClockOut, setWorkedOnClockOut] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeTab, setActiveTab] = useState<'activity' | 'history'>('activity');
  const [historyFilter, setHistoryFilter] = useState<'day' | 'week' | 'month'>('week');
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adminTab, setAdminTab] = useState<'live' | 'log' | 'report'>('live');

  const today = new Date().toISOString().split('T')[0];
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/clock/report?from=${reportFrom}&to=${reportTo}`);
      const data = await res.json();
      setReportData(data);
    } catch (e) { console.error(e); }
    finally { setReportLoading(false); }
  };

  const fetchEmployeeStatus = async () => {
    try {
      const res = await fetch('/api/clock/today');
      const data = await res.json();
      setIsClockedIn(data.isClockedIn || false);
      setIsOnBreak(data.isOnBreak || false);
      setIsAway(data.isAway || false);
      setElapsed(data.workingSeconds || data.totalSeconds || 0);
      setBreakSeconds(data.breakSeconds || 0);
      setBreakCount(data.breakCount || 0);
      setIdleSeconds(data.idleSeconds || 0);
      setEvents(data.events || []);
      setSessionStart(data.currentSessionStart ? new Date(data.currentSessionStart) : null);
      setBreakStart(data.currentBreakStart ? new Date(data.currentBreakStart) : null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (f: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/clock/history?filter=${f}`);
      const data = await res.json();
      setHistoryData(data);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  const fetchTeamData = async () => {
    try {
      const res = await fetch('/api/clock/team');
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
      if (isClockedIn) {
        timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [isClockedIn, isAdmin]);

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

  const handleAction = async (type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END' | 'AWAY_END') => {
    setActionLoading(type);
    setErrorMsg('');
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Action failed'); setActionLoading(null); return; }
      if (type === 'CLOCK_OUT') { setWorkedOnClockOut(elapsed); setShowEODPopup(true); }
      await fetchEmployeeStatus();
      fetchHistory(historyFilter);
    } catch (e) { setErrorMsg('Network error. Try again.'); }
    finally { setActionLoading(null); }
  };
  const handleFilterChange = (f: 'day' | 'week' | 'month') => {
    setHistoryFilter(f);
    fetchHistory(f);
  };
  const handleAwayConfirm = async (reason: string) => {
    setShowAwayModal(false);
    setActionLoading('AWAY_START');
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'AWAY_START', note: `Reason: ${reason}` }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Action failed'); }
      await fetchEmployeeStatus();
    } catch (e) { setErrorMsg('Network error'); }
    finally { setActionLoading(null); }
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

  if (isAdmin) {
    const activeMembers = teamData.filter((m: any) => m.isClockedIn);
    const inactiveMembers = teamData.filter((m: any) => !m.isClockedIn);
    const allEvents: any[] = [];
    teamData.forEach((member: any) => {
      (member.events || []).forEach((e: any) => allEvents.push({ ...e, member }));
    });
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
      <div className="animate-fade-in w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[26px] font-black text-[var(--text)] tracking-tight">Attendance</h1>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">Real-time team status · {teamData.length} members</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 text-[11px] font-semibold bg-white border border-[var(--border)] px-3 py-2 rounded-xl shadow-soft hover:border-[var(--orange)] transition-all disabled:opacity-50">
            <RefreshCw size={12} className={`text-[var(--orange)] ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: <Activity size={18} className="text-emerald-600" />, bg: 'bg-emerald-50 border-emerald-100', label: 'Active Now', value: `${activeMembers.length}/${teamData.length}`, sub: 'clocked in' },
            { icon: <Clock size={18} className="text-slate-400" />, bg: 'bg-slate-50 border-slate-100', label: 'Clocked Out', value: inactiveMembers.length, sub: 'members' },
            { icon: <Users size={18} className="text-[var(--orange)]" />, bg: 'bg-orange-50 border-orange-100', label: 'Total Team', value: teamData.length, sub: 'employees' },
          ].map((s) => (
            <div key={s.label} className={`bg-white border rounded-2xl p-4 shadow-soft flex items-center gap-4 ${s.bg}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg}`}>{s.icon}</div>
              <div>
                <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">{s.label}</div>
                <div className="text-[22px] font-black text-[var(--text)] leading-tight">{s.value}</div>
                <div className="text-[10px] text-[var(--muted)]">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-1 mb-5 w-fit">
          {[
            { key: 'live', label: 'Live Status', icon: <Activity size={13} /> },
            { key: 'log', label: 'Activity Log', icon: <FileText size={13} /> },
            { key: 'report', label: 'Date Report', icon: <Calendar size={13} /> },
          ].map((t) => (
            <button key={t.key} onClick={() => setAdminTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-lg transition-all border-none cursor-pointer ${adminTab === t.key ? 'dart-gradient text-white shadow-soft' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {adminTab === 'live' && (
          <div className="space-y-4">
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--surface2)]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Active Now</span>
                <span className="ml-1 text-[11px] text-[var(--muted)] font-semibold">· {activeMembers.length}</span>
              </div>
              {activeMembers.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Clock size={20} className="text-[var(--subtle)] mx-auto mb-2" />
                  <div className="text-[13px] font-semibold text-[var(--text)]">No one's clocked in yet</div>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {activeMembers.map((m: any) => <UserRow key={m.userId} member={m} active />)}
                </div>
              )}
            </div>

            {inactiveMembers.length > 0 && (
              <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft overflow-hidden">
                <button onClick={() => setShowInactive(!showInactive)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-[var(--surface2)] border-none cursor-pointer hover:bg-[var(--border)] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--subtle)]" />
                    <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Clocked Out</span>
                    <span className="text-[11px] text-[var(--muted)] font-semibold">· {inactiveMembers.length}</span>
                  </div>
                  {showInactive ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
                </button>
                {showInactive && (
                  <div className="divide-y divide-[var(--border)] animate-fade-in">
                    {inactiveMembers.map((m: any) => <UserRow key={m.userId} member={m} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {adminTab === 'log' && (
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--surface2)]">
              <Activity size={14} className="text-[var(--muted)]" />
              <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Today's Activity Log</span>
              <span className="ml-1 text-[11px] text-[var(--muted)] font-semibold">· {allEvents.length} events</span>
            </div>
            {allEvents.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Activity size={20} className="text-[var(--subtle)] mx-auto mb-2" />
                <div className="text-[13px] font-semibold text-[var(--text)]">No activity today yet</div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto">
                {allEvents.map((e: any) => {
                  const cfg = getEventConfig(e.type);
                  return (
                    <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--surface2)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">
                          {e.member.avatar || e.member.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--text)]">{e.member.name}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${cfg.badge}`}>
                            {cfg.iconSm}{cfg.label}
                          </span>
                        </div>
                      </div>
                      <span className="text-[12px] text-[var(--muted)] font-semibold font-mono">{formatTime(e.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {adminTab === 'report' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft p-5">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">From</label>
                  <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} max={today}
                    className="px-3 py-2 text-[13px] font-semibold text-[var(--text)] bg-[var(--surface2)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--orange)] transition-colors cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">To</label>
                  <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} max={today}
                    className="px-3 py-2 text-[13px] font-semibold text-[var(--text)] bg-[var(--surface2)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--orange)] transition-colors cursor-pointer" />
                </div>
                <button onClick={fetchReport} disabled={reportLoading}
                  className="flex items-center gap-2 px-5 py-2 dart-gradient text-white text-[12px] font-bold rounded-xl border-none cursor-pointer hover:opacity-90 transition-all disabled:opacity-60 shadow-soft">
                  {reportLoading ? <><RefreshCw size={13} className="animate-spin" /> Loading...</> : <><Calendar size={13} /> Search</>}
                </button>
              </div>
            </div>

            {reportData && (
              <div className="space-y-3">
                {reportData.employees?.filter((emp: any) => emp.days.length > 0).length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft px-5 py-14 text-center">
                    <Calendar size={22} className="text-[var(--subtle)] mx-auto mb-2" />
                    <div className="text-[13px] font-semibold text-[var(--text)]">No attendance records found</div>
                  </div>
                ) : (
                  reportData.employees.filter((emp: any) => emp.days.length > 0).map((emp: any) => (
                    <div key={emp.userId} className="bg-white rounded-2xl border border-[var(--border)] shadow-soft overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface2)] flex items-center gap-3">
                        <div className="w-8 h-8 dart-gradient rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                          {emp.avatar || emp.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-[var(--text)]">{emp.name}</div>
                          <div className="text-[10px] text-[var(--muted)]">{emp.email}</div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Days Present</div>
                          <div className="text-[15px] font-black text-[var(--text)]">{emp.days.length}</div>
                        </div>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        <div className="grid grid-cols-4 px-5 py-2 bg-[var(--surface2)]">
                          {['Date', 'Clock In', 'Clock Out', 'Total Hours'].map(h => (
                            <div key={h} className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{h}</div>
                          ))}
                        </div>
                        {emp.days.map((day: any) => {
                          const fmtT = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          const fmtS = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
                          const dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          const metTarget = day.totalSeconds >= 8 * 3600;
                          return (
                            <div key={day.date} className="grid grid-cols-4 px-5 py-3 hover:bg-[var(--surface2)] transition-colors items-center">
                              <div className="text-[12px] font-semibold text-[var(--text)]">{dateLabel}</div>
                              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                                <LogIn size={11} />
                                {day.firstClockIn ? fmtT(day.firstClockIn) : <span className="text-[var(--subtle)]">—</span>}
                              </div>
                              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-red-500">
                                <LogOut size={11} />
                                {day.lastClockOut ? fmtT(day.lastClockOut) : <span className="text-[10px] text-emerald-600 font-bold animate-pulse">● Active</span>}
                              </div>
                              <div className={`text-[12px] font-bold ${metTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {fmtS(day.totalSeconds)}{metTarget && <span className="ml-1 text-[9px]">✓</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const progressPct = Math.min((elapsed / (8 * 3600)) * 100, 100);

  return (
    <div className="animate-fade-in w-full">
      {showAwayModal && (
        <AwayModal
          onConfirm={handleAwayConfirm}
          onCancel={() => setShowAwayModal(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-black text-[var(--text)] tracking-tight">Time Tracker</h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <StatusBadge isClockedIn={isClockedIn} isOnBreak={isOnBreak} isAway={isAway} />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-card overflow-hidden sticky top-5">
            <div className="h-1" style={{ background: isOnBreak ? '#f59e0b' : isClockedIn ? 'linear-gradient(90deg,#f97316,#fb923c)' : '#e2e8f0' }} />
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[var(--surface2)] flex items-center justify-center">
                  <Timer size={13} className="text-[var(--muted)]" />
                </div>
                <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-[0.12em]">
                  {isOnBreak ? 'Paused — On Break' : "Today's Working Time"}
                </span>
              </div>

              <div className={`text-[52px] font-black leading-none tracking-tight font-mono mb-1 ${isOnBreak ? 'text-amber-500' : isClockedIn ? 'dart-gradient-text' : 'text-[var(--subtle)]'}`}>
                {fmtTime(elapsed)}
              </div>

              {sessionStart && isClockedIn && !isOnBreak && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Session started at {formatTime(sessionStart.toISOString())}
                </div>
              )}
              {!isClockedIn && (
                <div className="text-[12px] text-[var(--muted)] mb-4">Ready to start your day</div>
              )}

              {isOnBreak && breakStart && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee size={13} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Break Timer</span>
                  </div>
                  <div className="text-[28px] font-black text-amber-700 font-mono leading-none">{fmtTime(breakSeconds)}</div>
                  <div className="text-[10px] text-amber-600 mt-1">Started at {formatTime(breakStart.toISOString())}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Timer size={10} className="text-[var(--orange)]" />
                    <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">Working</span>
                  </div>
                  <div className="text-[15px] font-black text-[var(--text)]">{fmtShort(elapsed) || '0m'}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Coffee size={10} className="text-amber-500" />
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Break</span>
                  </div>
                  <div className="text-[15px] font-black text-amber-700">{fmtShort(breakSeconds) || '0m'}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <AlarmClock size={10} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Idle</span>
                  </div>
                  <div className="text-[15px] font-black text-slate-500">{fmtShort(idleSeconds) || '0m'}</div>
                </div>
              </div>

              <div className="mb-1.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-[var(--muted)] font-semibold">Daily Target</span>
                  <span className="text-[10px] font-bold text-[var(--text)]">{progressPct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[var(--surface2)] rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full dart-gradient transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="text-[10px] text-[var(--muted)] font-semibold mt-1">
                  {progressPct >= 100 ? '🎉 8h target reached!' : `${fmtShort(elapsed)} of 8h`}
                </div>
              </div>

              {errorMsg && (
                <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 font-semibold">{errorMsg}</div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                {!isClockedIn && (
                  <ActionButton onClick={() => handleAction('CLOCK_IN')} loading={actionLoading === 'CLOCK_IN'} variant="primary" icon={<Play size={14} strokeWidth={3} fill="currentColor" />} label="Clock In" fullWidth />
                )}
                {isClockedIn && !isOnBreak && !isAway && (
                  <>
                    <ActionButton onClick={() => handleAction('CLOCK_OUT')} loading={actionLoading === 'CLOCK_OUT'} variant="danger" icon={<Square size={14} strokeWidth={3} fill="currentColor" />} label="Clock Out" fullWidth />
                    <ActionButton onClick={() => handleAction('BREAK_START')} loading={actionLoading === 'BREAK_START'} variant="warning" icon={<Coffee size={14} strokeWidth={2.5} />} label="Start Break" fullWidth />
                    <ActionButton onClick={() => setShowAwayModal(true)} loading={actionLoading === 'AWAY_START'} variant="away" icon={<span style={{ fontSize: '16px' }}>🕌</span>} label="Away (AFK)" fullWidth />
                  </>
                )}
                {isOnBreak && (
                  <ActionButton onClick={() => handleAction('BREAK_END')} loading={actionLoading === 'BREAK_END'} variant="success" icon={<Play size={14} strokeWidth={3} fill="currentColor" />} label="End Break" fullWidth />
                )}
                {isAway && (
                  <ActionButton onClick={() => handleAction('AWAY_END')} loading={actionLoading === 'AWAY_END'} variant="success" icon={<Play size={14} strokeWidth={3} fill="currentColor" />} label="I'm Back - End Away" fullWidth />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-7">
          <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-1 mb-4 w-fit">
            {[
              { key: 'activity', label: "Today's Activity", icon: <Activity size={13} /> },
              { key: 'history', label: 'History', icon: <BarChart2 size={13} /> },
            ].map((t) => (
              <button key={t.key} onClick={() => { setActiveTab(t.key as any); if (t.key === 'history') fetchHistory(historyFilter); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-lg transition-all border-none cursor-pointer ${activeTab === t.key ? 'dart-gradient text-white shadow-soft' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--surface2)]">
                <Activity size={14} className="text-[var(--muted)]" />
                <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">Today's Events</span>
                <span className="ml-1 text-[11px] text-[var(--muted)] font-semibold">· {events.length} events</span>
              </div>
              {events.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <AlarmClock size={28} className="text-[var(--subtle)] mx-auto mb-3" />
                  <div className="text-[14px] font-bold text-[var(--text)] mb-1">No activity yet</div>
                  <div className="text-[12px] text-[var(--muted)]">Clock in to start tracking your day</div>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {[...events].reverse().map((e: any) => {
                    const cfg = getEventConfig(e.type);
                    return (
                      <div key={e.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[var(--surface2)] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.iconBg}`}>
                            {cfg.iconLg}
                          </div>
                          <span className="text-[13px] font-semibold text-[var(--text)]">{cfg.label}</span>
                        </div>
                        <span className="text-[12px] text-[var(--muted)] font-semibold font-mono">{formatTime(e.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface2)]">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--muted)]" />
                  <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">History</span>
                </div>
                <div className="flex gap-0.5 bg-white border border-[var(--border)] rounded-lg p-0.5">
                  {(['day', 'week', 'month'] as const).map((f) => (
                    <button key={f} onClick={() => handleFilterChange(f)}
                      className={`px-3 py-1 text-[10px] font-bold rounded transition-all capitalize border-none cursor-pointer ${historyFilter === f ? 'dart-gradient text-white shadow-soft' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
                      {f === 'day' ? 'Today' : f === 'week' ? '7 Days' : '30 Days'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-[var(--muted)]">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-[12px]">Loading...</span>
                  </div>
                ) : historyData ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { label: 'Total Hours', value: fmtShort(historyData.totalSeconds), icon: <Clock size={14} className="text-[var(--orange)]" /> },
                        { label: 'Avg / Day', value: fmtShort(historyData.avgSeconds), icon: <TrendingUp size={14} className="text-emerald-500" /> },
                        { label: 'Days Worked', value: `${historyData.workedDays}d`, icon: <Calendar size={14} className="text-blue-500" /> },
                      ].map((s) => (
                        <div key={s.label} className="bg-[var(--surface2)] rounded-xl p-3 border border-[var(--border)]">
                          <div className="flex items-center gap-1.5 mb-1">{s.icon}<div className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider">{s.label}</div></div>
                          <div className="text-[18px] font-black text-[var(--text)]">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {historyFilter !== 'day' && historyData.days?.length > 0 && (
                      <div className="mb-5">
                        <HistoryChart days={historyData.days} filter={historyFilter} />
                      </div>
                    )}

                    {historyFilter === 'day' && (
                      <div className="space-y-0 divide-y divide-[var(--border)]">
                        {historyData.days?.[0]?.sessions?.length > 0 ? (
                          historyData.days[0].sessions.map((s: any, i: number) => (
                            <div key={i} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--surface2)] flex items-center justify-center text-[10px] font-bold text-[var(--muted)]">{i + 1}</div>
                                <div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                                    <LogIn size={10} /> {formatTime(s.clockIn)}
                                  </div>
                                  {s.clockOut && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
                                      <LogOut size={10} /> {formatTime(s.clockOut)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-[13px] font-bold text-[var(--text)]">{fmtShort(s.duration)}</div>
                            </div>
                          ))
                        ) : (
                          <div className="py-10 text-center text-[var(--muted)] text-[12px]">No sessions today yet</div>
                        )}
                      </div>
                    )}

                    {historyFilter !== 'day' && (
                      <div className="space-y-2 mt-2">
                        {[...historyData.days].reverse().filter((d: any) => d.seconds > 0).slice(0, 10).map((day: any) => (
                          <DayRow key={day.date} day={day} />
                        ))}
                        {historyData.days.filter((d: any) => d.seconds > 0).length === 0 && (
                          <div className="py-8 text-center text-[var(--muted)] text-[12px]">No records found</div>
                        )}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}