'use client';
import { useState, useEffect } from 'react';

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Annual Leave', icon: '🏖️', color: 'text-blue-500' },
  { value: 'SICK', label: 'Sick Leave', icon: '🏥', color: 'text-red-500' },
  { value: 'CASUAL', label: 'Casual Leave', icon: '☕', color: 'text-amber-500' },
  { value: 'EMERGENCY', label: 'Emergency Leave', icon: '🚨', color: 'text-orange-500' },
  { value: 'UNPAID', label: 'Unpaid Leave', icon: '📋', color: 'text-gray-500' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500',
  APPROVED: 'bg-green-500/10 text-green-500',
  REJECTED: 'bg-red-500/10 text-red-500',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcDays(from: string, to: string) {
  if (!from || !to) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

export default function LeavePage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    type: 'ANNUAL',
    fromDate: '',
    toDate: '',
    isHalfDay: false,
    reason: '',
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const res = await fetch('/api/leave/balance');
    const data = await res.json();
    setBalances(data.balances || []);
    setRequests(data.requests || []);
    setLoading(false);
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (!form.fromDate || !form.toDate || !form.reason) {
      setError('Sab fields fill karo'); return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      setError('To date, From date se pehle nahi ho sakti'); return;
    }
    setSubmitting(true);
    const res = await fetch('/api/leave/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || 'Error aya'); return; }
    setSuccess(`Leave apply ho gayi! ${data.days} din ke liye.`);
    setShowForm(false);
    setForm({ type: 'ANNUAL', fromDate: '', toDate: '', isHalfDay: false, reason: '' });
    fetchData();
  }

  const isSingleDay = form.fromDate && form.toDate && form.fromDate === form.toDate;
  const days = form.isHalfDay && isSingleDay ? 0.5 : calcDays(form.fromDate, form.toDate);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">My Leaves</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Apply for leave aur balance dekho</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="px-4 py-2 rounded-lg dart-gradient text-white text-sm font-semibold"
        >
          {showForm ? '✕ Cancel' : '+ Apply Leave'}
        </button>
      </div>

      {/* Success/Error */}
      {success && <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm px-4 py-3 rounded-lg">{success}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Apply Form */}
      {showForm && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Leave Application</h2>

          {/* Leave Type */}
          <div className="grid grid-cols-5 gap-2">
            {LEAVE_TYPES.map(lt => (
              <button
                key={lt.value}
                onClick={() => setForm(f => ({ ...f, type: lt.value }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  form.type === lt.value
                    ? 'border-[var(--orange)] bg-[var(--orange)]/10'
                    : 'border-[var(--border)] hover:border-[var(--orange)]/50'
                }`}
              >
                <div className="text-xl mb-1">{lt.icon}</div>
                <div className="text-[10px] text-[var(--muted)]">{lt.label.split(' ')[0]}</div>
              </button>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">From Date</label>
              <input
                type="date"
                value={form.fromDate}
                onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">To Date</label>
              <input
                type="date"
                value={form.toDate}
                onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              />
            </div>
          </div>

          {/* Half-day toggle — only show when single day selected */}
          {isSingleDay && (
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isHalfDay: !f.isHalfDay }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                form.isHalfDay
                  ? 'border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]'
                  : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--orange)]/50'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                form.isHalfDay ? 'bg-[var(--orange)] border-[var(--orange)] text-white' : 'border-[var(--border)]'
              }`}>{form.isHalfDay ? '✓' : ''}</span>
              🌗 Half Day Leave (0.5 din)
            </button>
          )}

          {days > 0 && (
            <div className="text-xs text-[var(--orange)] font-medium">
              📅 {days} din ki leave {form.isHalfDay && isSingleDay ? '(Half Day)' : ''}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
              placeholder="Leave ki wajah..."
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)] resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 rounded-lg dart-gradient text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Applying...' : 'Apply Leave'}
          </button>
        </div>
      )}

      {/* Balance Cards */}
      {loading ? (
        <div className="text-sm text-[var(--muted)] text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {LEAVE_TYPES.map(lt => {
            const bal = balances.find(b => b.type === lt.value);
            const remaining = bal ? bal.total - bal.used : 0;
            const pct = bal && bal.type !== 'UNPAID' ? Math.round(((bal.total - bal.used) / bal.total) * 100) : 100;
            return (
              <div key={lt.value} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
                <div className="text-2xl mb-2">{lt.icon}</div>
                <p className="text-[11px] text-[var(--muted)] mb-1">{lt.label}</p>
                {bal?.type === 'UNPAID' ? (
                  <p className="text-lg font-bold text-[var(--text)]">∞</p>
                ) : (
                  <>
                    <p className="text-lg font-bold text-[var(--text)]">{remaining}<span className="text-xs text-[var(--muted)] font-normal">/{bal?.total || 0}</span></p>
                    <div className="mt-2 h-1 bg-[var(--surface2)] rounded-full overflow-hidden">
                      <div className="h-full dart-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* My Requests */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-xs font-bold text-[var(--muted)] tracking-widest uppercase">My Leave Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted)]">Koi request nahi abhi tak</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {requests.map((r: any) => {
              const lt = LEAVE_TYPES.find(l => l.value === r.type);
              const days = calcDays(r.fromDate, r.toDate);
              return (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lt?.icon}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text)]">{lt?.label}</p>
                      <p className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
                        {fmtDate(r.fromDate)} → {fmtDate(r.toDate)} · {r.isHalfDay ? '0.5' : days} din
                        {r.isHalfDay && <span className="bg-[var(--orange)]/10 text-[var(--orange)] text-[10px] font-semibold px-1.5 py-0.5 rounded">Half Day</span>}
                      </p>
                      <p className="text-[11px] text-[var(--subtle)] mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}