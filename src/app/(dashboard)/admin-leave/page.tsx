'use client';
import { useState, useEffect } from 'react';

const LEAVE_TYPES: Record<string, { label: string; icon: string }> = {
  ANNUAL: { label: 'Annual', icon: '🏖️' },
  SICK: { label: 'Sick', icon: '🏥' },
  CASUAL: { label: 'Casual', icon: '☕' },
  EMERGENCY: { label: 'Emergency', icon: '🚨' },
  UNPAID: { label: 'Unpaid', icon: '📋' },
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  APPROVED: 'bg-green-500/10 text-green-500 border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcDays(from: string, to: string) {
  return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function AdminLeavePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    setLoading(true);
    const res = await fetch('/api/leave/admin');
    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }

  async function handleAction(requestId: string, status: 'APPROVED' | 'REJECTED') {
    setProcessing(requestId);
    await fetch('/api/leave/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status }),
    });
    setProcessing(null);
    fetchRequests();
  }

  const filtered = requests.filter(r => filter === 'ALL' ? true : r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Leave Management</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Employee leave requests approve ya reject karo</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-semibold px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            {pendingCount} Pending
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === f
                ? 'dart-gradient text-white'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {f} {f !== 'ALL' && `(${requests.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--muted)]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-[var(--muted)]">Koi {filter.toLowerCase()} request nahi</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((r: any) => {
              const lt = LEAVE_TYPES[r.type];
              const days = calcDays(r.fromDate, r.toDate);
              return (
                <div key={r.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Employee Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg dart-gradient flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {r.user?.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text)]">{r.user?.name}</p>
                        <p className="text-[11px] text-[var(--muted)]">{r.user?.email}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-sm">{lt?.icon}</span>
                          <span className="text-[12px] font-medium text-[var(--text)]">{lt?.label} Leave</span>
                          <span className="text-[11px] text-[var(--muted)]">·</span>
                          <span className="text-[12px] text-[var(--muted)]">{r.isHalfDay ? '0.5' : days} din</span>
                          {r.isHalfDay && <span className="bg-[var(--orange)]/10 text-[var(--orange)] text-[10px] font-semibold px-1.5 py-0.5 rounded">Half Day</span>}
                        </div>
                        <p className="text-[11px] text-[var(--muted)] mt-1">
                          📅 {fmtDate(r.fromDate)} → {fmtDate(r.toDate)}
                        </p>
                        <p className="text-[11px] text-[var(--subtle)] mt-0.5 italic">"{r.reason}"</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                      {r.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(r.id, 'APPROVED')}
                            disabled={processing === r.id}
                            className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold hover:bg-green-500/20 transition-all disabled:opacity-50"
                          >
                            {processing === r.id ? '...' : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'REJECTED')}
                            disabled={processing === r.id}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                          >
                            {processing === r.id ? '...' : '✕ Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}