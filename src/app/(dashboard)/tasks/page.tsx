'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assignee { id: string; name: string; email: string | null; avatar: string | null; }
interface Task { id: string; url: string; name: string; status: string; priority: string | null; due: string | null; tags: string[]; assignees: Assignee[]; summary: string | null; }
interface Database { databaseId: string; databaseName: string; totalTasks: number; tasks: Task[]; }
interface ApiResponse { total: number; databases: Database[]; teamMembers: { id: string; name: string; email: string; avatar: string | null }[] | null; }

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  'To-do':       { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
  'In progress': { bg: '#eff6ff', color: '#3b82f6', dot: '#3b82f6' },
  'Review':      { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  'Done':        { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
  'Archived':    { bg: '#f8fafc', color: '#94a3b8', dot: '#cbd5e1' },
};
const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  High:   { color: '#ef4444', bg: '#fef2f2' },
  Medium: { color: '#f59e0b', bg: '#fffbeb' },
  Low:    { color: '#10b981', bg: '#f0fdf4' },
};
const STATUSES = ['All', 'To-do', 'In progress', 'Review', 'Done'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const isOverdue = (d: string | null, status: string) => !!d && new Date(d) < new Date() && status !== 'Done';

// ── Top Progress Loader ───────────────────────────────────────────────────────
function TopLoader({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setWidth(0);
      // quick jump to 30%
      const t1 = setTimeout(() => setWidth(30), 50);
      // slow crawl to 80%
      const t2 = setTimeout(() => setWidth(80), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      // complete to 100% then fade out
      setWidth(100);
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: '3px', background: 'transparent' }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        transition: width === 100 ? 'width 0.2s ease, opacity 0.3s ease 0.2s' : 'width 0.4s ease',
        opacity: width === 100 ? 0 : 1,
        borderRadius: '0 2px 2px 0',
        boxShadow: '0 0 8px rgba(99,102,241,0.6)',
      }} />
    </div>
  );
}


// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'shimmer 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.08}s`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: '13px', width: `${160 + i * 25}px`, background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' }} />
            <div style={{ height: '10px', width: '90px', background: '#f1f5f9', borderRadius: '4px' }} />
          </div>
          <div style={{ height: '22px', width: '72px', background: '#f1f5f9', borderRadius: '99px' }} />
          <div style={{ display: 'flex', gap: '3px' }}>
            {[...Array(2)].map((_, j) => <div key={j} style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0' }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444'];
function Avatar({ a, index }: { a: Assignee; index: number }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div title={a.name} style={{
      width: '24px', height: '24px', borderRadius: '50%',
      background: color, border: '2px solid #fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '8px', fontWeight: 700, color: '#fff', overflow: 'hidden',
      marginLeft: index > 0 ? '-6px' : 0, flexShrink: 0,
    }}>
      {a.avatar
        ? <img src={a.avatar} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : a.name?.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ task }: { task: Task }) {
  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG['To-do'];
  const pc = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const overdue = isOverdue(task.due, task.status);

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px',
        borderBottom: '1px solid #f8fafc',
        textDecoration: 'none',
        transition: 'background 0.12s',
        cursor: 'pointer',
        background: '#fff',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbff'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
    >
      {/* Task name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.name}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {task.due && (
            <span style={{ fontSize: '11px', color: overdue ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {overdue ? '⚠' : '📅'} {fmt(task.due)}
            </span>
          )}
          {task.tags?.slice(0, 2).map((t: string) => (
            <span key={t} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Priority */}
      {pc && (
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '5px', background: pc.bg, color: pc.color, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {task.priority}
        </span>
      )}

      {/* Status pill */}
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px',
        background: sc.bg, color: sc.color,
        display: 'flex', alignItems: 'center', gap: '5px',
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
        {task.status}
      </span>

      {/* Assignees */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {task.assignees?.slice(0, 3).map((a, i) => <Avatar key={a.id} a={a} index={i} />)}
        {task.assignees?.length > 3 && (
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#64748b', marginLeft: '-6px' }}>
            +{task.assignees.length - 3}
          </div>
        )}
      </div>
    </a>
  );
}

// ── DB Section ────────────────────────────────────────────────────────────────
function DatabaseSection({ db, filter }: { db: Database; filter: string }) {
  const [open, setOpen] = useState(true);
  const filtered = filter === 'All' ? db.tasks : db.tasks.filter(t => t.status === filter);
  if (filtered.length === 0) return null;

  return (
    <div style={{ marginBottom: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
      {/* DB header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: '100%', padding: '12px 16px',
          background: '#fafafa', border: 'none', borderBottom: open ? '1px solid #e2e8f0' : 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1 }}>
          {db.databaseName}
        </span>
        <span style={{ fontSize: '11px', color: '#6366f1', background: '#eef2ff', padding: '1px 8px', borderRadius: '99px', fontWeight: 700 }}>
          {filtered.length}
        </span>
        <span style={{ fontSize: '12px', color: '#94a3b8', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>

      {/* Column headers */}
      {open && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '7px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ flex: 1, fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Task</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '60px', textAlign: 'center' }}>Priority</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '90px', textAlign: 'center' }}>Status</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '60px', textAlign: 'center' }}>Team</span>
          </div>
          {filtered.map(task => <TaskRow key={task.id} task={task} />)}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedDb, setSelectedDb] = useState('');

  const loadTasks = async (email?: string) => {
    setLoading(true); setError('');
    try {
      const url = email ? `/api/notion?email=${encodeURIComponent(email)}` : '/api/notion';
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) setError(json.error || 'Failed to load');
      else setData(json);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); }, []);

  const selectedMember = data?.teamMembers?.find(m => m.email === selectedEmail);
  const visibleDbs = (data?.databases || []).filter(db => !selectedDb || db.databaseId === selectedDb);
  const totalFiltered = visibleDbs.reduce((sum, db) => {
    const tasks = filter === 'All' ? db.tasks : db.tasks.filter(t => t.status === filter);
    return sum + tasks.length;
  }, 0);

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      <TopLoader active={loading} />
      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#0f172a', padding: '24px', maxWidth: '1000px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {isAdmin ? (selectedEmail ? `${selectedMember?.name ?? ''}'s Tasks` : 'All Tasks') : 'My Tasks'}
            </h1>
            {!loading && data && (
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0', fontWeight: 400 }}>
                {totalFiltered} task{totalFiltered !== 1 ? 's' : ''}{selectedDb ? ` in ${data.databases.find(d => d.databaseId === selectedDb)?.databaseName ?? ''}` : ` across ${data.databases.length} workspace${data.databases.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isAdmin && (data?.teamMembers?.length ?? 0) > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedEmail}
                  onChange={e => { setSelectedEmail(e.target.value); setFilter('All'); loadTasks(e.target.value || undefined); }}
                  style={{
                    padding: '7px 32px 7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                    background: '#fff', border: '1px solid #e2e8f0', color: '#334155',
                    cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                    fontFamily: 'inherit', minWidth: '140px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <option value="">All Members</option>
                  {data!.teamMembers!.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                </select>
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', pointerEvents: 'none' }}>▾</span>
              </div>
            )}
            {/* Company / DB dropdown */}
            {!loading && (data?.databases?.length ?? 0) > 1 && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedDb}
                  onChange={e => { setSelectedDb(e.target.value); setFilter('All'); }}
                  style={{
                    padding: '7px 32px 7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                    background: '#fff', border: '1px solid #e2e8f0', color: '#334155',
                    cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                    fontFamily: 'inherit', minWidth: '150px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <option value="">All Companies</option>
                  {(data?.databases || []).map(db => (
                    <option key={db.databaseId} value={db.databaseId}>{db.databaseName}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', pointerEvents: 'none' }}>▾</span>
              </div>
            )}
            <a
              href="https://www.notion.so"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px', fontWeight: 500, padding: '7px 14px', borderRadius: '8px',
                border: '1px solid #e2e8f0', color: '#64748b', textDecoration: 'none',
                background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              ↗ Notion
            </a>
          </div>
        </div>

        {/* ── Status Filter Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
          {STATUSES.map(s => {
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  fontSize: '12px', fontWeight: active ? 600 : 500,
                  padding: '5px 14px', borderRadius: '7px', border: 'none',
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#0f172a' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontFamily: 'inherit',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ fontSize: '12px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '12px 16px', background: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ height: '12px', width: '120px', background: '#e2e8f0', borderRadius: '4px' }} />
            </div>
            <Skeleton />
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && totalFiltered === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', fontSize: '13px', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>📭</div>
            No tasks found{filter !== 'All' ? ` with status "${filter}"` : ''}
          </div>
        )}

        {/* ── Grouped Databases ── */}
        {!loading && !error && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            {visibleDbs.map(db => (
              <DatabaseSection key={db.databaseId} db={db} filter={filter} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}