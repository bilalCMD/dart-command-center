'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Trophy, TrendingUp, Calendar, Award, ChevronDown } from 'lucide-react';

export default function ScorePage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [scoreData, setScoreData] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchScore = async (userId?: string) => {
    setRefreshing(true);
    setLoading(true);
    try {
      const url = userId ? `/api/score?userId=${userId}` : '/api/score';
      const res = await fetch(url);
      const data = await res.json();
      setScoreData(data);
      if (data.allUsers && !selectedUser) {
        setAllUsers(data.allUsers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    fetchScore(userId || undefined);
  };

  const getColor = (score: number) => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#f59e0b';
    if (score >= 50) return '#ED671C';
    return '#ef4444';
  };

  const getLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    return 'Below Average';
  };

  const getGradient = (score: number) => {
    if (score >= 85) return 'linear-gradient(135deg, #10b981, #059669)';
    if (score >= 70) return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (score >= 50) return 'linear-gradient(135deg, #ED671C, #B71CED)';
    return 'linear-gradient(135deg, #ef4444, #dc2626)';
  };

  if (loading && !scoreData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="animate-spin"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Loading performance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ═══════════════════════════════════════════════════ */}
      {/* HEADER                                               */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-black text-[var(--text)] tracking-tight">
            {isAdmin ? 'Team Performance' : 'My Performance'}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {isAdmin
              ? 'View team member scores and attendance'
              : 'Track your attendance and EOD compliance'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => fetchScore(selectedUser || undefined)}
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
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* Admin: User Selector */}
          {isAdmin && allUsers.length > 0 && (
            <select
              value={selectedUser}
              onChange={(e) => handleUserChange(e.target.value)}
              className="px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-xs font-semibold hover:border-[var(--orange)] transition-all shadow-soft"
            >
              <option value="">All Team Members</option>
              {allUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {scoreData ? (
        <>
          {/* ═══════════════════════════════════════════════════ */}
          {/* MAIN SCORE HERO CARD                                 */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-card p-8 mb-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
              <div
                className="absolute top-[-50%] right-[-20%] w-[500px] h-[500px] rounded-full blur-3xl"
                style={{ background: getGradient(scoreData.finalScore) }}
              />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-6 mb-6">
                {/* Left: Score Circle */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-[var(--border)] bg-white shadow-lg mb-3">
                    <div>
                      <div
                        className="text-[42px] font-black font-mono leading-none"
                        style={{ color: getColor(scoreData.finalScore) }}
                      >
                        {scoreData.finalScore}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-bold tracking-wider">
                        / 100
                      </div>
                    </div>
                  </div>
                  <div
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-soft"
                    style={{ background: getGradient(scoreData.finalScore) }}
                  >
                    <Trophy size={12} />
                    <span>{getLabel(scoreData.finalScore)}</span>
                  </div>
                </div>

                {/* Right: User Info (Admin) */}
                {isAdmin && scoreData.userName && (
                  <div className="flex-1 bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-[var(--border)] flex items-center justify-center text-sm font-bold shadow-soft">
                        {scoreData.userAvatar || scoreData.userName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--text)]">
                          {scoreData.userName}
                        </div>
                        <div className="text-xs text-[var(--muted)]">{scoreData.userEmail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <Calendar size={11} className="text-[var(--muted)]" />
                      <span className="text-[var(--muted)]">Daily Schedule:</span>
                      <span className="font-bold text-[var(--text)]">
                        {scoreData.schedule} hours
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Attendance */}
                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                      <TrendingUp size={14} className="text-green-500" />
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">
                      Attendance
                    </div>
                  </div>
                  <div
                    className="text-[28px] font-black leading-none mb-1"
                    style={{ color: getColor(scoreData.avgScore) }}
                  >
                    {scoreData.avgScore}%
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {scoreData.totalDays} working days
                  </div>
                </div>

                {/* EOD Compliance */}
                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Award size={14} className="text-blue-500" />
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">
                      EOD Reports
                    </div>
                  </div>
                  <div
                    className="text-[28px] font-black leading-none mb-1"
                    style={{ color: getColor(scoreData.eodPct) }}
                  >
                    {scoreData.eodPct}%
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {scoreData.eodDays}/{scoreData.totalWorkingDays} submitted
                  </div>
                </div>

                {/* Formula Breakdown */}
                <div className="bg-gradient-to-br from-[var(--surface)] to-white rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mb-2">
                    Score Formula
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[var(--muted)]">Attendance</span>
                      <span className="font-bold">70%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">EOD Reports</span>
                      <span className="font-bold">30%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* DAILY BREAKDOWN (COLLAPSIBLE)                        */}
          {/* ═══════════════════════════════════════════════════ */}
          {scoreData.dailyScores && scoreData.dailyScores.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--border)] shadow-soft overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface2)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-[var(--muted)]" />
                  <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.12em]">
                    Daily Breakdown — This Month
                  </span>
                  <span className="text-[11px] text-[var(--muted)] font-semibold">
                    · {scoreData.dailyScores.length} days
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]">
                  <span>{showBreakdown ? 'Hide' : 'Show'}</span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2.5}
                    className={`transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Breakdown List */}
              {showBreakdown && (
                <div className="divide-y divide-[var(--border-subtle)] max-h-[400px] overflow-y-auto animate-fade-in">
                  {scoreData.dailyScores.map((d: any) => (
                    <div
                      key={d.date}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface2)] transition-colors"
                    >
                      {/* Date */}
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-semibold text-[var(--text)] w-24">
                          {new Date(d.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        {d.isWeekend && (
                          <span className="text-[9px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">
                            WEEKEND
                          </span>
                        )}
                      </div>

                      {/* Hours + Score */}
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-[var(--muted)] text-mono">
                          {d.workedHours.toFixed(1)}h / {d.requiredHours}h
                        </div>
                        {d.bonus > 0 && (
                          <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">
                            +{d.bonus} bonus
                          </span>
                        )}
                        <div
                          className="text-sm font-black text-mono w-10 text-right"
                          style={{ color: getColor(d.score) }}
                        >
                          {d.score}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {(!scoreData.dailyScores || scoreData.dailyScores.length === 0) && (
            <div className="bg-white border border-dashed border-[var(--border)] rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Calendar size={20} className="text-[var(--subtle)]" />
              </div>
              <div className="text-[13px] font-semibold text-[var(--text)]">
                No attendance data yet
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Start clocking in to build your performance score
              </div>
            </div>
          )}
        </>
      ) : (
        /* No Data State */
        <div className="bg-white border border-dashed border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-[var(--subtle)]" />
          </div>
          <div className="text-[15px] font-bold text-[var(--text)] mb-2">
            No performance data available
          </div>
          <div className="text-[12px] text-[var(--muted)] max-w-sm mx-auto">
            {isAdmin
              ? 'Select a team member to view their performance score'
              : 'Start clocking in and submitting EOD reports to build your score'}
          </div>
        </div>
      )}
    </div>
  );
}