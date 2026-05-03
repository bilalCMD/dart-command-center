'use client';
import { useState, useEffect } from 'react';

function fmtTime(seconds: number) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ActivityMonitorPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [date]);

  async function fetchMembers() {
    setLoading(true);
    const res = await fetch(`/api/admin/activity?date=${date}`);
    const data = await res.json();
    setMembers(data.members || []);
    setLoading(false);
  }

  async function fetchDetail(userId: string) {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/activity?date=${date}&userId=${userId}`);
    const data = await res.json();
    setDetail(data);
    setDetailLoading(false);
  }

  function selectMember(m: any) {
    setSelected(m);
    setDetail(null);
    fetchDetail(m.id);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Monitor</h1>
            <p className="text-gray-400 text-sm mt-1">Track employee app usage & idle time</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSelected(null); setDetail(null); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">Team Members ({members.length})</h2>
              </div>
              {loading ? (
                <div className="p-6 text-center text-gray-500 text-sm">Loading...</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => selectMember(m)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors ${selected?.id === m.id ? 'bg-gray-800 border-l-2 border-blue-500' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                            {m.avatar || m.name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {m.isTracking ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                              {fmtTime(m.totalSeconds)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">No data</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 h-64 flex items-center justify-center">
                <p className="text-gray-600 text-sm">Select a member to view activity</p>
              </div>
            ) : detailLoading ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 h-64 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Loading activity...</p>
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{fmtTime(detail.totalSeconds)}</p>
                    <p className="text-xs text-gray-500 mt-1">Active Time</p>
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                    <p className="text-2xl font-bold text-orange-400">{fmtTime(detail.totalIdleSeconds)}</p>
                    <p className="text-xs text-gray-500 mt-1">Idle Time</p>
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                    <p className="text-2xl font-bold text-purple-400">{detail.byApp?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Apps Used</p>
                  </div>
                </div>

                {/* App Breakdown */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-300">App Usage — {selected.name}</h3>
                  </div>
                  {detail.byApp?.length === 0 ? (
                    <div className="p-6 text-center text-gray-600 text-sm">No activity tracked for this date</div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {detail.byApp?.map((app: any) => {
                        const pct = detail.totalSeconds > 0 ? Math.round((app.seconds / detail.totalSeconds) * 100) : 0;
                        const sites = Object.entries(app.sites || {}).sort((a: any, b: any) => b[1] - a[1]);
                        return (
                          <div key={app.appName} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs">
                                  {app.appName?.[0] || '?'}
                                </div>
                                <span className="text-sm font-medium text-white">{app.appName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{fmtTime(app.seconds)}</span>
                                <span className="text-xs text-gray-600">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {sites.length > 0 && (
                              <div className="ml-8 space-y-1">
                                {sites.slice(0, 5).map(([site, secs]: any) => (
                                  <div key={site} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">↳ {site}</span>
                                    <span className="text-gray-500">{fmtTime(secs)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Idle Logs */}
                {detail.idleLogs?.length > 0 && (
                  <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-300">Idle Periods</h3>
                    </div>
                    <div className="divide-y divide-gray-800">
                      {detail.idleLogs.map((log: any, i: number) => (
                        <div key={i} className="px-4 py-2 flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {new Date(log.idleFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' → '}
                            {new Date(log.idleTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-orange-400">{fmtTime(log.seconds)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}