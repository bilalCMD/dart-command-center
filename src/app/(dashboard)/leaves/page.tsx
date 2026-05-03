'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, StatCard } from '@/components/ui';

const LEAVE_COLORS: Record<string, string> = {
  ANNUAL: '#B71CED',
  SICK: '#ef4444',
  CASUAL: '#ED671C',
  EMERGENCY: '#f59e0b',
  UNPAID: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
};

export default function LeavesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    type: 'ANNUAL',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, reqRes] = await Promise.all([
        fetch('/api/leaves/balance'),
        fetch('/api/leaves'),
      ]);
      const balData = await balRes.json();
      const reqData = await reqRes.json();
      setBalances(balData.balances || []);
      setRequests(reqData.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false); // Add this
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit');
      } else {
        setSuccess(`Leave request submitted! (${data.daysRequested} days)`);
        setShowForm(false);
        setForm({ type: 'ANNUAL', fromDate: '', toDate: '', reason: '' });
        fetchData();
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/leaves/${id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
  <h1 className="text-xl font-extrabold">
    {isAdmin ? 'Leave Requests — All Team' : 'My Leaves'}
  </h1>
  
  <div className="flex items-center gap-2">
    {/* Refresh Button */}
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
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
      <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
    </button>

    {/* Apply Leave Button - Employee only */}
    {!isAdmin && (
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 text-white text-xs font-bold rounded-lg border-none cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #ED671C, #B71CED)' }}
      >
        {showForm ? 'Cancel' : '+ Apply Leave'}
      </button>
    )}
  </div>
</div>

      {/* Success */}
      {success && (
        <div className="mb-3 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          ✅ {success}
        </div>
      )}

      {/* Balance Cards — Employee only */}
      {!isAdmin && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 mb-4">
          {balances.map((b) => (
            <StatCard
              key={b.type}
              label={b.type}
              value={`${b.remaining} days`}
              sub={`Used: ${b.used}/${b.total}`}
              accent={LEAVE_COLORS[b.type]}
            />
          ))}
        </div>
      )}

      {/* Apply Form */}
      {showForm && !isAdmin && (
        <div className="bg-[var(--surface)] rounded-xl p-5 mb-4 border border-[var(--border)]">
          <div className="text-sm font-bold mb-4">Apply for Leave</div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[var(--muted)] font-bold tracking-wider block mb-1">
                  TYPE
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm"
                >
                  {balances.map((b) => (
                    <option key={b.type} value={b.type}>
                      {b.type} ({b.remaining} days left)
                    </option>
                  ))}
                  <option value="UNPAID">UNPAID</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--muted)] font-bold tracking-wider block mb-1">
                  FROM
                </label>
                <input
                  type="date"
                  value={form.fromDate}
                  onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[var(--muted)] font-bold tracking-wider block mb-1">
                TO
              </label>
              <input
                type="date"
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--muted)] font-bold tracking-wider block mb-1">
                REASON
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
                rows={1}
                placeholder="Brief reason for leave..."
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm resize-none"
              />
            </div>
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                ❌ {error}
              </div>
            )}
<button
  type="submit"
  disabled={submitting}
  className="w-full py-3 text-white text-sm font-bold rounded-xl border-none cursor-pointer disabled:opacity-60"
  style={{ 
    background: submitting ? '#ccc' : 'linear-gradient(135deg, #ED671C, #B71CED)' 
  }}
>
  {submitting ? 'Submitting...' : 'Submit Request'}
</button>
          </form>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider">
            {isAdmin ? 'ALL LEAVE REQUESTS' : 'MY REQUESTS'}
          </span>
          <span className="text-xs text-[var(--muted)]">{requests.length} total</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--muted)]">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--muted)]">
            No leave requests yet
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {requests.map((r) => (
              <div
                key={r.id}
                className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                onClick={() => setSelectedRequest(r)}
              >
                <div className="flex items-center gap-3">
                  {isAdmin && r.user && (
                    <div className="w-7 h-7 rounded-full bg-[var(--bg)] flex items-center justify-center text-[10px] font-bold border border-[var(--border)]">
                      {r.user.avatar || r.user.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    {isAdmin && r.user && (
                      <div className="text-xs font-semibold mb-0.5">{r.user.name}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: LEAVE_COLORS[r.type] + '22',
                          color: LEAVE_COLORS[r.type],
                        }}
                      >
                        {r.type}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(r.fromDate)} → {formatDate(r.toDate)}
                      </span>
                    </div>
                    {/* <div className="text-[11px] text-[var(--muted)] mt-0.5">{r.reason}</div> */}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{
                      background: STATUS_COLORS[r.status] + '22',
                      color: STATUS_COLORS[r.status],
                    }}
                  >
                    {r.status}
                  </span>
                  {isAdmin && r.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAction(r.id, 'APPROVED')}
                        className="text-[10px] px-2 py-1 bg-green-500/20 text-green-400 rounded-lg border-none cursor-pointer hover:bg-green-500/30"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleAction(r.id, 'REJECTED')}
                        className="text-[10px] px-2 py-1 bg-red-500/20 text-red-400 rounded-lg border-none cursor-pointer hover:bg-red-500/30"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Leave Detail Popup */}
{selectedRequest && (
  <div 
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={() => setSelectedRequest(null)}
  >
    <div 
      className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          {isAdmin && selectedRequest.user && (
            <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex items-center justify-center text-xs font-bold border-2 border-[var(--border)]">
              {selectedRequest.user.avatar || selectedRequest.user.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-[var(--text)]">
              {isAdmin && selectedRequest.user ? selectedRequest.user.name : 'Leave Request'}
            </div>
            {isAdmin && selectedRequest.user && (
              <div className="text-xs text-[var(--muted)]">{selectedRequest.user.email}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => setSelectedRequest(null)}
          className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Type & Status */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-1">LEAVE TYPE</div>
            <span
              className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{
                background: LEAVE_COLORS[selectedRequest.type] + '22',
                color: LEAVE_COLORS[selectedRequest.type],
              }}
            >
              {selectedRequest.type}
            </span>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-1 text-right">STATUS</div>
            <span
              className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{
                background: STATUS_COLORS[selectedRequest.status] + '22',
                color: STATUS_COLORS[selectedRequest.status],
              }}
            >
              {selectedRequest.status}
            </span>
          </div>
        </div>

        {/* Dates */}
        <div>
          <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-2">DURATION</div>
          <div className="flex items-center gap-2 bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)]">
            <div className="flex-1">
              <div className="text-[9px] text-[var(--muted)] font-semibold mb-0.5">FROM</div>
              <div className="text-sm font-bold text-[var(--text)]">{formatDate(selectedRequest.fromDate)}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)]">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <div className="flex-1 text-right">
              <div className="text-[9px] text-[var(--muted)] font-semibold mb-0.5">TO</div>
              <div className="text-sm font-bold text-[var(--text)]">{formatDate(selectedRequest.toDate)}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--muted)] text-center mt-2">
            {selectedRequest.daysRequested} day{selectedRequest.daysRequested > 1 ? 's' : ''} requested
          </div>
        </div>

        {/* Reason */}
        <div>
  <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider mb-2">REASON</div>
  <div className="bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)] text-sm text-[var(--text)] leading-relaxed max-h-32 overflow-y-auto break-words">
    {selectedRequest.reason}
  </div>
</div>

        {/* Submitted Date */}
        <div className="text-xs text-[var(--muted)] text-center pt-2 border-t border-[var(--border)]">
          Submitted on {formatDate(selectedRequest.createdAt)}
        </div>
      </div>

      {/* Admin Actions */}
      {isAdmin && selectedRequest.status === 'PENDING' && (
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex gap-2">
          <button
            onClick={() => {
              handleAction(selectedRequest.id, 'APPROVED');
              setSelectedRequest(null);
            }}
            className="flex-1 py-2.5 bg-green-500 text-white text-sm font-bold rounded-lg border-none cursor-pointer hover:bg-green-600 transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => {
              handleAction(selectedRequest.id, 'REJECTED');
              setSelectedRequest(null);
            }}
            className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-lg border-none cursor-pointer hover:bg-red-600 transition-colors"
          >
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  </div>
)}
    </div>
  );
}