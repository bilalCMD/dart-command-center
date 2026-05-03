'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ManageBadgesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [badges, setBadges] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    userId: '',
    badgeId: '',
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/badges');
      const data = await res.json();
      setBadges(data.badges || []);
      setUsers(data.users || []);
      setUserBadges(data.userBadges || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async () => {
    if (!form.userId || !form.badgeId) return;
    setAssigning(true);
    setSuccess('');
    try {
      const res = await fetch('/api/badges/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess('Badge assigned!');
        setForm({ userId: '', badgeId: '' });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (userBadgeId: string) => {
    try {
      await fetch(`/api/badges/assign?id=${userBadgeId}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[var(--muted)] text-sm">Loading...</div>
  );

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-4">Manage Badges</h1>

      {success && (
        <div className="mb-4 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          ✅ {success}
        </div>
      )}

      {/* Assign Badge */}
      <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] mb-6">
        <div className="text-xs font-bold text-[var(--muted)] tracking-wider mb-3">ASSIGN BADGE</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-[var(--muted)] font-bold block mb-1">EMPLOYEE</label>
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs"
            >
              <option value="">Select employee...</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--muted)] font-bold block mb-1">BADGE</label>
            <select
              value={form.badgeId}
              onChange={(e) => setForm({ ...form, badgeId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs"
            >
              <option value="">Select badge...</option>
              {badges.map((b: any) => (
                <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleAssign}
          disabled={assigning || !form.userId || !form.badgeId}
          className="px-4 py-2 text-white text-xs font-bold rounded-lg border-none cursor-pointer disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #ED671C, #B71CED)' }}
        >
          {assigning ? 'Assigning...' : 'Assign Badge'}
        </button>
      </div>

      {/* All Badges */}
      <div className="mb-6">
        <div className="text-xs font-bold text-[var(--muted)] tracking-wider mb-3">ALL BADGES</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
          {badges.map((b: any) => (
            <div key={b.id} className="bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)] text-center">
              <div className="text-2xl mb-1">{b.icon}</div>
              <div className="text-[11px] font-bold">{b.name}</div>
              <div className="text-[9px] text-[var(--muted)] mt-0.5">{b.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Earned Badges */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider">
            EARNED BADGES — ALL TEAM
          </span>
        </div>
        {userBadges.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--muted)]">No badges assigned yet</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {userBadges.map((ub: any) => (
              <div key={ub.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--bg)] flex items-center justify-center text-[10px] font-bold border border-[var(--border)]">
                    {ub.user?.avatar || ub.user?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{ub.user?.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">
                      {ub.badge?.icon} {ub.badge?.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(ub.id)}
                  className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 rounded border-none cursor-pointer hover:bg-red-500/20"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}