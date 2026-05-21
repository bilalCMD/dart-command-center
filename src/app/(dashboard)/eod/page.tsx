'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  PageHeader, FormTextarea,
  StatusDot, SectionTitle,
} from '@/components/ui';

const KPIS = [
  { id: 'k1', name: 'Client Satisfaction', icon: '⭐' },
  { id: 'k2', name: 'On-Time Delivery', icon: '⏱' },
  { id: 'k3', name: 'Revenue Growth', icon: '📈' },
  { id: 'k4', name: 'Content Output', icon: '✍️' },
  { id: 'k5', name: 'Revision Rate', icon: '🔄' },
  { id: 'k6', name: 'EOD Compliance', icon: '✅' },
];

type FilterType = 'all' | 'daily' | 'weekly' | 'monthly';

const ITEMS_PER_PAGE = 5;

interface EodReport {
  id: string;
  tasksCompleted: string;
  kpiFocus: string;
  blockers: string;
  tomorrowPlan: string;
  user?: { name: string; avatar: string };
  createdAt: string;
  date: string;
}

function parseTasks(raw: string): string[] {
  return raw
    .split(/\n|•|–|—|\*|-(?=\s)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function getStreak(reports: EodReport[]): number {
  if (!reports.length) return 0;
  const sorted = [...reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const r of sorted) {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}

function filterReports(reports: EodReport[], filter: FilterType): EodReport[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (filter === 'daily') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reports.filter(r => new Date(r.date) >= today);
  }
  if (filter === 'weekly') {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return reports.filter(r => new Date(r.date) >= weekStart);
  }
  if (filter === 'monthly') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return reports.filter(r => new Date(r.date) >= monthStart);
  }
  return reports;
}

// ─── Custom KPI Dropdown ──────────────────────────────────────
function KpiDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = KPIS.find(k => k.name === value) || KPIS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--orange)] transition-all cursor-pointer group"
        style={{ outline: open ? '2px solid var(--orange)' : 'none', outlineOffset: '2px' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[18px] leading-none">{selected.icon}</span>
          <span className="text-[13px] font-bold text-[var(--text)]">{selected.name}</span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform duration-200 text-[var(--muted)] ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-[var(--border)] bg-white shadow-2xl z-50 overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >
          {KPIS.map((k, i) => (
            <button
              key={k.id}
              type="button"
              onClick={() => { onChange(k.name); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 transition-colors cursor-pointer border-none ${k.name === value ? 'bg-orange-50' : 'bg-white'
                } ${i !== 0 ? 'border-t border-[var(--border-subtle)]' : ''}`}
            >
              <span className="text-[16px] w-6 text-center leading-none shrink-0">{k.icon}</span>
              <span className={`text-[13px] font-semibold flex-1 ${k.name === value ? 'text-[var(--orange)]' : 'text-[var(--text)]'}`}>
                {k.name}
              </span>
              {k.name === value && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Input with Add Button ───────────────────────────────
function TaskInput({
  tasks,
  onTasksChange,
}: {
  tasks: string[];
  onTasksChange: (tasks: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onTasksChange([...tasks, trimmed]);
    setInput('');
    inputRef.current?.focus();
  };

  const removeTask = (i: number) => {
    onTasksChange(tasks.filter((_, idx) => idx !== i));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
  };

  return (
    <div>
      {/* Existing tasks */}
      {tasks.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {tasks.map((task, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 group"
            >
              <div className="w-5 h-5 rounded-md bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l2 2 3-3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[13px] text-[var(--text)] flex-1 leading-snug">{task}</span>
              <button
                type="button"
                onClick={() => removeTask(i)}
                className="w-6 h-6 rounded-full bg-transparent hover:bg-red-100 border-none flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Remove task"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2L2 8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={tasks.length === 0 ? 'e.g. Landing page completed for Client A' : 'Add another task...'}
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--orange)] transition-colors"
          style={{ fontFamily: 'inherit' }}
        />
        <button
          type="button"
          onClick={addTask}
          disabled={!input.trim()}
          className="px-4 py-3 rounded-xl text-[12px] font-bold text-white dart-gradient border-none cursor-pointer transition-all disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add
        </button>
      </div>
      <p className="text-[10px] text-[var(--muted)] mt-2">
        Press Enter or click Add · hover a task to remove it
      </p>
    </div>
  );
}

// ─── Modal Popup ──────────────────────────────────────────────
function ReportModal({ r, onClose }: { r: EodReport; onClose: () => void }) {
  const tasks = parseTasks(r.tasksCompleted);
  const isToday = new Date(r.date).toDateString() === new Date().toDateString();
  const fullDate = new Date(r.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const submittedAt = r.createdAt
    ? new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in"
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className={`px-6 py-5 flex items-start justify-between shrink-0 ${isToday ? 'dart-gradient' : 'bg-[var(--surface2)]'}`}>
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-white/70' : 'text-[var(--muted)]'}`}>EOD Report</div>
            <div className={`text-[16px] font-black ${isToday ? 'text-white' : 'text-[var(--text)]'}`}>
              {isToday ? 'Today — ' : ''}{fullDate}
            </div>
            {submittedAt && (
              <div className={`text-[11px] mt-0.5 ${isToday ? 'text-white/60' : 'text-[var(--muted)]'}`}>Submitted at {submittedAt}</div>
            )}
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors ${isToday ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[var(--border)] text-[var(--muted)]'}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">KPI Focus</span>
            <span className="text-[11px] font-bold bg-[var(--surface2)] border border-[var(--border)] px-2.5 py-1 rounded-lg text-[var(--text)]">
              {KPIS.find(k => k.name === r.kpiFocus)?.icon} {r.kpiFocus}
            </span>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Tasks Completed · {tasks.length}</div>
            <div className="space-y-2.5">
              {tasks.map((task, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-green-50 border border-green-200 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l2 2 3-3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[13px] text-[var(--text)] leading-relaxed">{task}</span>
                </div>
              ))}
            </div>
          </div>

          {r.blockers && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1L12 11.5H1L6.5 1z" stroke="#d97706" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M6.5 5v3M6.5 9.5v.5" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Blockers</span>
              </div>
              <p className="text-[13px] text-amber-900 leading-relaxed">{r.blockers}</p>
            </div>
          )}

          {r.tomorrowPlan && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="#2563eb" strokeWidth="1.4" />
                  <path d="M6.5 4v2.5l1.5 1.5" stroke="#2563eb" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Tomorrow's Plan</span>
              </div>
              <p className="text-[13px] text-blue-900 leading-relaxed">{r.tomorrowPlan}</p>
            </div>
          )}

          {!r.blockers && !r.tomorrowPlan && (
            <div className="rounded-xl bg-[var(--surface2)] border border-[var(--border)] p-4 text-center">
              <p className="text-[12px] text-[var(--muted)]">No blockers or tomorrow plan noted</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-subtle)] shrink-0 flex items-center justify-between bg-[var(--surface2)]">
          <span className="text-[11px] text-[var(--muted)]">{tasks.length} task{tasks.length !== 1 ? 's' : ''} logged</span>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-bold border border-[var(--border)] bg-white hover:bg-[var(--surface2)] transition-colors cursor-pointer text-[var(--text)]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────
function HistoryRow({ r, onClick, onEdit }: { r: EodReport; onClick: () => void; onEdit: () => void }) {
  const tasks = parseTasks(r.tasksCompleted);
  const isToday = new Date(r.date).toDateString() === new Date().toDateString();
  const kpi = KPIS.find(k => k.name === r.kpiFocus);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border bg-white text-left cursor-pointer transition-all hover:shadow-soft hover:border-[var(--orange)] group ${isToday ? 'border-[var(--orange)]' : 'border-[var(--border)]'
        }`}
    >
      <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${isToday ? 'dart-gradient text-white' : 'bg-[var(--surface2)] text-[var(--text)]'}`}>
        <span className="text-[8px] font-bold uppercase leading-none opacity-70">
          {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' })}
        </span>
        <span className="text-[17px] font-black leading-snug">{new Date(r.date).getDate()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-bold text-[var(--text)]">
            {isToday ? 'Today' : new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          {isToday && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[var(--orange)] text-white px-1.5 py-0.5 rounded">Latest</span>
          )}
        </div>
        <div className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1">
          <span>{kpi?.icon}</span>
          <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {r.kpiFocus}</span>
          {r.blockers && <span> · ⚠ Blockers</span>}
        </div>
        <div className="text-[11px] text-[var(--muted)] mt-1 truncate">
          {tasks[0] || ''}
          {tasks.length > 1 ? ` +${tasks.length - 1} more` : ''}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-500 flex items-center justify-center transition-colors cursor-pointer group/edit"
          title="Edit this report"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="group-hover/edit:text-white text-blue-500">
            <path d="M8.5 1.5l2 2L4 10l-2.5.5L2 8l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="w-7 h-7 rounded-full bg-[var(--surface2)] group-hover:bg-[var(--orange)] flex items-center justify-center transition-colors">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="group-hover:text-white text-[var(--muted)]">
            <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function EODPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [reports, setReports] = useState<EodReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedReport, setSelectedReport] = useState<EodReport | null>(null);

  // Task list state (replaces tasksCompleted string in form)
  const [tasks, setTasks] = useState<string[]>([]);
  const [kpiFocus, setKpiFocus] = useState(KPIS[0].name);
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [editingReport, setEditingReport] = useState<EodReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBackdatedForm, setShowBackdatedForm] = useState(false);

  // History filters & pagination
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [submittedToday, setSubmittedToday] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/eod');
      const data = await res.json();
      setReports(data.reports || []);
      setSubmittedToday(data.submittedToday ?? false); // ← API ka value use karo
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filter]);
  ;


  const streak = getStreak(reports);
  const totalTasks = reports.reduce((sum, r) => sum + parseTasks(r.tasksCompleted).length, 0);
  const handleEdit = (report: EodReport) => {
    setEditingReport(report);
    setTasks(parseTasks(report.tasksCompleted));
    setKpiFocus(report.kpiFocus || KPIS[0].name);
    setBlockers(report.blockers || '');
    setTomorrowPlan(report.tomorrowPlan || '');
    setSelectedDate(new Date(report.date).toISOString().split('T')[0]);
    setShowBackdatedForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleSubmit = async () => {
    if (!tasks.length) { setError('At least one task is required'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/eod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasksCompleted: tasks.join('\n'),
          kpiFocus,
          blockers,
          tomorrowPlan,
          date: (showBackdatedForm || editingReport) ? selectedDate : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit');
      } else {
        setSuccess(editingReport ? 'EOD updated successfully!' : 'EOD submitted successfully!');
        setTasks([]);
        setKpiFocus(KPIS[0].name);
        setBlockers('');
        setTomorrowPlan('');
        setEditingReport(null);
        setShowBackdatedForm(false);
        setSelectedDate(new Date().toISOString().split('T')[0]);
        fetchReports();
      }
    } catch { setError('Something went wrong'); }
    finally { setSubmitting(false); }
  };

  // ── Filtered + paginated reports ──────────────────────────
  const filteredReports = filterReports(reports, filter);
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const pagedReports = filteredReports.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ══════════ ADMIN ══════════════════════════════════════════
  if (isAdmin) {
    const [adminFilter, setAdminFilter] = useState<FilterType>('all');
    const [adminPage, setAdminPage] = useState(1);
    const [adminSelected, setAdminSelected] = useState<EodReport | null>(null);
    const [memberFilter, setMemberFilter] = useState('');

    const filtered = filterReports(reports, adminFilter)
      .filter(r => !memberFilter || r.user?.name === memberFilter);
    const totalAdminPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paged = filtered.slice((adminPage - 1) * ITEMS_PER_PAGE, adminPage * ITEMS_PER_PAGE);
    const members = Array.from(new Set(reports.map(r => r.user?.name).filter(Boolean)));

    return (
      <div className="max-w-3xl animate-fade-in">
        {adminSelected && <ReportModal r={adminSelected} onClose={() => setAdminSelected(null)} />}

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[26px] font-black text-[var(--text)] tracking-tight">EOD Reports</h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">All team · {reports.length} total submissions</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border bg-green-50 text-green-700 border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {reports.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length} today
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: reports.length, label: 'Total Reports', icon: '📋' },
            { value: members.length, label: 'Active Members', icon: '👥' },
            { value: reports.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length, label: 'Submitted Today', icon: '✅' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] px-4 py-4 text-center">
              <div className="text-[22px] mb-1">{s.icon}</div>
              <div className="text-[22px] font-black text-[var(--text)] leading-none">{s.value}</div>
              <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {/* Time filter */}
          <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-1">
            {(['all', 'daily', 'weekly', 'monthly'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => { setAdminFilter(f); setAdminPage(1); }}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold capitalize transition-all border-none cursor-pointer ${adminFilter === f ? 'dart-gradient text-white shadow-sm' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
              >
                {f === 'daily' ? 'Today' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Member filter */}
          <div className="relative">
            <select
              value={memberFilter}
              onChange={e => { setMemberFilter(e.target.value); setAdminPage(1); }}
              style={{
                padding: '7px 32px 7px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
                cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <option value="">All Members</option>
              {members.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', pointerEvents: 'none' }}>▾</span>
          </div>
        </div>

        {/* Reports */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-[var(--muted)]">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
            </svg>
            <span className="text-[12px]">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
            <div className="text-[36px] mb-3">📭</div>
            <div className="text-[13px] font-bold text-[var(--text)]">No reports found</div>
            <div className="text-[11px] text-[var(--muted)] mt-1">Try changing the filters above</div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {paged.map(r => {
                const tasks = parseTasks(r.tasksCompleted);
                const isToday = new Date(r.date).toDateString() === new Date().toDateString();
                const kpi = KPIS.find(k => k.name === r.kpiFocus);
                return (
                  <button
                    key={r.id}
                    onClick={() => setAdminSelected(r)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border bg-white text-left cursor-pointer transition-all hover:shadow-soft hover:border-[var(--orange)] group ${isToday ? 'border-[var(--orange)]' : 'border-[var(--border)]'
                      }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl dart-gradient flex items-center justify-center text-[13px] font-black text-white shrink-0">
                      {r.user?.avatar || r.user?.name?.slice(0, 2).toUpperCase() || '??'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-bold text-[var(--text)]">{r.user?.name || 'Unknown'}</span>
                        {isToday && <span className="text-[9px] font-bold uppercase tracking-wider bg-[var(--orange)] text-white px-1.5 py-0.5 rounded">Today</span>}
                        <span className="text-[11px] text-[var(--muted)] font-semibold">
                          {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1">
                        <span>{kpi?.icon}</span>
                        <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {r.kpiFocus}</span>
                        {r.blockers && <span> · ⚠ Blockers</span>}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5 truncate">
                        {tasks[0] || ''}{tasks.length > 1 ? ` +${tasks.length - 1} more` : ''}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="w-7 h-7 rounded-full bg-[var(--surface2)] group-hover:bg-[var(--orange)] flex items-center justify-center shrink-0 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="group-hover:text-white text-[var(--muted)]">
                        <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalAdminPages > 1 && (
              <div className="flex items-center justify-between mt-5 px-1">
                <button onClick={() => setAdminPage(p => Math.max(1, p - 1))} disabled={adminPage === 1}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[11px] font-bold text-[var(--text)] hover:border-[var(--orange)] transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed">
                  ← Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setAdminPage(n)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all ${n === adminPage ? 'dart-gradient text-white' : 'bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <button onClick={() => setAdminPage(p => Math.min(totalAdminPages, p + 1))} disabled={adminPage === totalAdminPages}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[11px] font-bold text-[var(--text)] hover:border-[var(--orange)] transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed">
                  Next →
                </button>
              </div>
            )}
            <div className="text-center mt-3">
              <span className="text-[10px] text-[var(--muted)]">Page {adminPage} of {totalAdminPages} · showing {paged.length} of {filtered.length}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════ EMPLOYEE ══════════════════════════════════════
  return (
    <div className="max-w-xl animate-fade-in">

      {selectedReport && (
        <ReportModal r={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[26px] font-black text-[var(--text)] tracking-tight">End of Day</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${loading
          ? 'bg-[var(--surface2)] text-[var(--muted)] border-[var(--border)]'
          : submittedToday
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
          {loading ? (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${submittedToday ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
          )}
          {loading ? '...' : submittedToday ? 'Submitted' : 'Pending'}
        </div>
      </div>

      {/* Stats */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { value: streak, label: 'Day streak', sub: streak >= 5 ? '🔥 On fire' : streak >= 3 ? '💪 Keep it up' : '🌱 Building' },
            { value: reports.length, label: 'Reports', sub: 'All time' },
            { value: totalTasks, label: 'Tasks logged', sub: 'All time' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] px-4 py-4 text-center">
              <div className="text-[24px] font-black text-[var(--text)] leading-none">{s.value}</div>
              <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mt-1">{s.label}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5">
          <span className="text-xl">🎉</span>
          <span className="text-[12px] font-semibold text-green-700">{success}</span>
        </div>
      )}

      {/* Already submitted */}
      {submittedToday && (
        <div className="mb-7 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.5 9l4 4 7-7" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-bold text-green-800">All done for today!</div>
            <div className="text-[11px] text-green-600 mt-0.5">Your report has been submitted. Great work.</div>
          </div>
        </div>
      )}
      {/* Backdated EOD Toggle */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => {
            setShowBackdatedForm(!showBackdatedForm);
            setEditingReport(null);
            if (!showBackdatedForm) {
              setTasks([]); setKpiFocus(KPIS[0].name); setBlockers(''); setTomorrowPlan('');
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${showBackdatedForm ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400'}`}
        >
          📅 {showBackdatedForm ? 'Cancel Backdated Entry' : 'Add EOD for Past Date'}
        </button>

        {showBackdatedForm && (
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-blue-300 bg-white text-[13px] font-semibold text-[var(--text)] outline-none focus:border-blue-500 cursor-pointer"
          />
        )}

        {editingReport && (
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            ✏️ Editing report from {new Date(editingReport.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      {/* ── FORM ──────────────────────────────────────────── */}
      {/* ── FORM ── */}
      {(!submittedToday || showBackdatedForm || editingReport) && (
        <div className="bg-white rounded-2xl border border-[var(--border)] mb-8">

          {/* Step 1 — Tasks */}
          <div className="px-6 pt-6 pb-5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full dart-gradient flex items-center justify-center text-white text-[10px] font-black shrink-0">1</div>
                <span className="text-[13px] font-bold text-[var(--text)]">What did you complete today?</span>
              </div>
              {tasks.length > 0 && (
                <span className="text-[10px] font-bold text-[var(--orange)] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <TaskInput tasks={tasks} onTasksChange={setTasks} />
          </div>



          {/* Step 3 — Blockers + Tomorrow */}
          <div className="px-6 py-5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-full dart-gradient flex items-center justify-center text-white text-[10px] font-black shrink-0">2</div>
              <span className="text-[13px] font-bold text-[var(--text)]">Anything else to note?</span>
              <span className="text-[10px] text-[var(--muted)]">optional</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">⚠ Blockers</p>
                <FormTextarea
                  value={blockers}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBlockers(e.target.value)}
                  placeholder="Any challenges today?"
                  style={{ minHeight: 80, fontSize: '12.5px', marginBottom: 0 }}
                />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">→ Tomorrow</p>
                <FormTextarea
                  value={tomorrowPlan}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTomorrowPlan(e.target.value)}
                  placeholder="What's the plan?"
                  style={{ minHeight: 80, fontSize: '12.5px', marginBottom: 0 }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="px-6 py-5">
            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || tasks.length === 0}
              className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white dart-gradient dart-gradient-hover border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                  </svg>
                  Submitting...
                </>
              ) : editingReport ? 'Update EOD Report' : showBackdatedForm ? `Submit EOD for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Submit EOD Report'}
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">History</span>
        {!loading && (
          <span className="text-[11px] text-[var(--muted)] font-semibold">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-1">
        {(['all', 'daily', 'weekly', 'monthly'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold capitalize transition-all border-none cursor-pointer ${filter === f
              ? 'dart-gradient text-white shadow-sm'
              : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
          >
            {f === 'daily' ? 'Today' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-[var(--muted)]">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
          <span className="text-[12px]">Loading...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
          <div className="text-[36px] mb-3">📋</div>
          <div className="text-[13px] font-bold text-[var(--text)]">No reports {filter !== 'all' ? `for this ${filter === 'daily' ? 'day' : filter === 'weekly' ? 'week' : 'month'}` : 'yet'}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            {filter !== 'all' ? 'Try changing the filter above' : 'Submit your first EOD above'}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {pagedReports.map((r) => (
              <HistoryRow key={r.id} r={r} onClick={() => setSelectedReport(r)} onEdit={() => handleEdit(r)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 px-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[11px] font-bold text-[var(--text)] hover:border-[var(--orange)] transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M6.5 2L3.5 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all ${n === page
                      ? 'dart-gradient text-white'
                      : 'bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white text-[11px] font-bold text-[var(--text)] hover:border-[var(--orange)] transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Next
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}

          {/* Page info */}
          <div className="text-center mt-3">
            <span className="text-[10px] text-[var(--muted)]">
              Page {page} of {totalPages} · showing {pagedReports.length} of {filteredReports.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}