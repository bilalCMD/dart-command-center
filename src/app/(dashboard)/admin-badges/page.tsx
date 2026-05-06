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
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoResults, setAutoResults] = useState<any>(null);

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

  const runAutoBadges = async () => {
    if (!confirm('🤖 Run Auto Badge Engine?\n\nThis will analyze this week\'s performance and award badges automatically.')) return;

    setAutoRunning(true);
    try {
      const res = await fetch('/api/badges/auto-assign', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setAutoResults(data);
        fetchData();
      } else {
        alert('Error: ' + (data.error || 'Failed to run'));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setAutoRunning(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[var(--muted)] text-sm">Loading...</div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-extrabold">Manage Badges</h1>
        <button
          onClick={runAutoBadges}
          disabled={autoRunning}
          className="px-4 py-2 text-white text-xs font-bold rounded-lg border-none cursor-pointer disabled:opacity-50 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
        >
          {autoRunning ? (
            <>
              <span className="animate-spin">⚙️</span> Analyzing...
            </>
          ) : (
            <>🤖 Run Auto Badges</>
          )}
        </button>
      </div>

      {success && (
        <div className="mb-4 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          ✅ {success}
        </div>
      )}

      {/* Auto Badge Info Banner */}
      <div className="mb-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🤖</div>
          <div className="flex-1">
            <div className="text-sm font-bold mb-1">Auto Badge Engine</div>
            <div className="text-[11px] text-[var(--muted)] leading-relaxed">
              Click "Run Auto Badges" to analyze this week's performance and automatically award badges based on:
              KPI scores, attendance, EOD reports, productivity, and discipline.
            </div>
          </div>
        </div>
      </div>

      {/* Manual Assign Badge */}
      <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] mb-6">
        <div className="text-xs font-bold text-[var(--muted)] tracking-wider mb-3">MANUAL ASSIGN BADGE</div>
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

      {/* Auto Badge Results Modal */}
      {autoResults && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(circle at top, rgba(139,92,246,0.3), rgba(0,0,0,0.9))',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', zIndex: 9999, animation: 'fadeIn 0.3s ease'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '24px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 80px rgba(139,92,246,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
              animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Animated Header with confetti background */}
            <div
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
                padding: '32px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: '-50px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-40px', left: '20%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', top: '30%', left: '-30px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '40px', marginBottom: '8px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>🎉</div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                      Auto Badge Results
                    </h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', fontWeight: '500' }}>
                      📅 Week of {new Date(autoResults.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(autoResults.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoResults(null)}
                    style={{
                      background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                      width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                      fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s', backdropFilter: 'blur(10px)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  >×</button>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', lineHeight: 1 }}>{autoResults.totalUsers}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👥 Analyzed</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', lineHeight: 1 }}>{autoResults.totalAwards}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏆 Awards</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                      {autoResults.stats.filter((s: any) => parseFloat(s.activeHours) > 0).length}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚡ Active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {autoResults.awards.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '20px' }}>🏆</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>This Week's Champions</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                    {autoResults.awards.map((a: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.15) 100%)',
                          border: '1px solid rgba(139,92,246,0.3)',
                          borderRadius: '14px',
                          padding: '14px 16px',
                          display: 'flex', alignItems: 'center', gap: '14px',
                          animation: `slideIn 0.4s ease ${i * 0.1}s both`
                        }}
                      >
                        <div style={{
                          width: '48px', height: '48px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '24px',
                          boxShadow: '0 6px 20px rgba(251,191,36,0.4)'
                        }}>🏆</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>{a.user}</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', background: 'linear-gradient(135deg, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            {a.badge}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>✨ {a.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '12px', opacity: 0.5 }}>🎯</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 6px' }}>No New Badges This Week</h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Either everyone already has them or criteria not met yet</p>
                </div>
              )}

              {/* Stats Table */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: '8px' }}>
                <span style={{ fontSize: '20px' }}>📊</span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>Team Performance</h3>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</th>
                      <th style={{ padding: '12px 8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase' }}>Days</th>
                      <th style={{ padding: '12px 8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase' }}>Late</th>
                      <th style={{ padding: '12px 8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase' }}>EOD</th>
                      <th style={{ padding: '12px 8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase' }}>Active</th>
                      <th style={{ padding: '12px 8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase' }}>Productivity</th>
                      <th style={{ padding: '12px 8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase' }}>KPI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoResults.stats
                      .sort((a: any, b: any) => parseFloat(b.activeHours) - parseFloat(a.activeHours))
                      .map((s: any, i: number) => {
                        const productivityNum = parseInt(s.productivity);
                        const productivityColor = productivityNum >= 80 ? '#10b981' : productivityNum >= 50 ? '#f59e0b' : productivityNum > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)';
                        const isTop = i === 0 && parseFloat(s.activeHours) > 0;
                        return (
                          <tr key={i} style={{
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            background: isTop ? 'linear-gradient(90deg, rgba(251,191,36,0.08) 0%, transparent 100%)' : 'transparent'
                          }}>
                            <td style={{ padding: '12px 14px', color: '#fff', fontWeight: '600' }}>
                              {isTop && '🥇 '}
                              {s.name}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{s.workingDays}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: s.lateDays > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>{s.lateDays}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: s.eodCount >= 5 ? '#10b981' : 'rgba(255,255,255,0.7)' }}>{s.eodCount}/5</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>{s.activeHours}h</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: productivityColor, fontWeight: '800' }}>{s.productivity}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{s.kpiScore}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>✨ Generated automatically based on this week's data</div>
              <button
                onClick={() => setAutoResults(null)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  color: 'white', border: 'none',
                  padding: '10px 24px', borderRadius: '10px',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(139,92,246,0.4)'
                }}
              >
                🎉 Awesome!
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
          `}</style>
        </div>
      )}
    </div>
  );
}