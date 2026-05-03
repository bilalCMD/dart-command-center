'use client';
import { useState, useEffect } from 'react';

function fmtTime(seconds: number) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const APP_ICONS: Record<string, string> = {
  'Google Chrome': '🌐',
  'Figma': '🎨',
  'VS Code': '💻',
  'Slack': '💬',
  'Zoom': '📹',
  'Notion': '📝',
  'Postman': '📮',
  'Microsoft Excel': '📊',
  'Microsoft Word': '📄',
  'Photoshop': '🖼️',
  'After Effects': '🎬',
  'Premiere Pro': '🎥',
};

export default function ActivityMonitorPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'apps' | 'chrome'>('apps');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  useEffect(() => { fetchMembers(); }, [date]);

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
    setActiveTab('apps');
    setExpandedApp(null);
    fetchDetail(m.id);
  }

  // Separate Chrome sites from other apps
  const chromeApps = detail?.byApp?.filter((a: any) => a.appName === 'Google Chrome') || [];
  const otherApps = detail?.byApp?.filter((a: any) => a.appName !== 'Google Chrome') || [];
  
  // Flatten all Chrome sites
  const chromeSites = chromeApps.flatMap((a: any) =>
    Object.entries(a.sites || {}).map(([site, secs]) => ({ site, seconds: secs as number }))
  ).sort((a: any, b: any) => b.seconds - a.seconds);

  const totalChromeSeconds = chromeSites.reduce((s: number, c: any) => s + c.seconds, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Activity Monitor</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Track employee app usage & idle time</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setSelected(null); setDetail(null); }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--orange)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Members List */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h2 className="text-xs font-bold text-[var(--muted)] tracking-widest uppercase">
                Team Members ({members.length})
              </h2>
            </div>
            {loading ? (
              <div className="p-6 text-center text-sm text-[var(--muted)]">Loading...</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectMember(m)}
                    className={`w-full px-4 py-3 text-left transition-all relative ${
                      selected?.id === m.id ? 'bg-[var(--surface2)]' : 'hover:bg-[var(--surface2)]'
                    }`}
                  >
                    {selected?.id === m.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full dart-gradient" />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg dart-gradient flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {m.avatar || m.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--text)]">{m.name}</p>
                          <p className="text-[11px] text-[var(--muted)]">{m.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {m.isTracking ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            {fmtTime(m.totalSeconds)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--subtle)]">No data</span>
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
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">👆</div>
                <p className="text-sm text-[var(--muted)]">Select a member to view their activity</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] h-48 flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : detail ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
                  <p className="text-lg font-bold text-[var(--orange)]">{fmtTime(detail.totalSeconds)}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">Active Time</p>
                </div>
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
                  <p className="text-lg font-bold text-amber-500">{fmtTime(detail.totalIdleSeconds)}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">Idle Time</p>
                </div>
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
                  <p className="text-lg font-bold text-[var(--text)]">{otherApps.length}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">Apps Used</p>
                </div>
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 text-center">
                  <p className="text-lg font-bold text-blue-500">{chromeSites.length}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">Sites Visited</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="flex border-b border-[var(--border)]">
                  <button
                    onClick={() => setActiveTab('apps')}
                    className={`flex-1 px-4 py-3 text-xs font-bold tracking-widest uppercase transition-all ${
                      activeTab === 'apps'
                        ? 'text-[var(--orange)] border-b-2 border-[var(--orange)] bg-[var(--surface2)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    📱 Apps ({otherApps.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('chrome')}
                    className={`flex-1 px-4 py-3 text-xs font-bold tracking-widest uppercase transition-all ${
                      activeTab === 'chrome'
                        ? 'text-[var(--orange)] border-b-2 border-[var(--orange)] bg-[var(--surface2)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    🌐 Chrome ({chromeSites.length} sites)
                  </button>
                </div>

                {/* Apps Tab */}
                {activeTab === 'apps' && (
                  <div>
                    {otherApps.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-3xl mb-2">📭</div>
                        <p className="text-sm text-[var(--muted)]">No app activity tracked</p>
                        <p className="text-xs text-[var(--subtle)] mt-1">Make sure desktop app is running</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {otherApps.map((app: any) => {
                          const pct = detail.totalSeconds > 0
                            ? Math.round((app.seconds / detail.totalSeconds) * 100) : 0;
                          const icon = APP_ICONS[app.appName] || '💼';
                          return (
                            <div key={app.appName} className="px-4 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{icon}</span>
                                  <span className="text-[13px] font-semibold text-[var(--text)]">{app.appName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[var(--text)]">{fmtTime(app.seconds)}</span>
                                  <span className="text-[11px] text-[var(--muted)] bg-[var(--surface2)] px-1.5 py-0.5 rounded">{pct}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
                                <div className="h-full dart-gradient rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Chrome Tab */}
                {activeTab === 'chrome' && (
                  <div>
                    {chromeSites.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-3xl mb-2">🌐</div>
                        <p className="text-sm text-[var(--muted)]">No Chrome activity tracked</p>
                        <p className="text-xs text-[var(--subtle)] mt-1">Make sure Dart Chrome extension is installed</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {chromeSites.map((s: any) => {
                          const pct = totalChromeSeconds > 0
                            ? Math.round((s.seconds / totalChromeSeconds) * 100) : 0;
                          return (
                            <div key={s.site} className="px-4 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${s.site}&sz=16`}
                                    className="w-4 h-4 rounded"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                  />
                                  <span className="text-[13px] font-semibold text-[var(--text)]">{s.site}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[var(--text)]">{fmtTime(s.seconds)}</span>
                                  <span className="text-[11px] text-[var(--muted)] bg-[var(--surface2)] px-1.5 py-0.5 rounded">{pct}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Idle Logs */}
              {detail.idleLogs?.length > 0 && (
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <h3 className="text-xs font-bold text-[var(--muted)] tracking-widest uppercase">Idle Periods</h3>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {detail.idleLogs.map((log: any, i: number) => (
                      <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[12px] text-[var(--text-soft)]">
                          {new Date(log.idleFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' → '}
                          {new Date(log.idleTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[12px] font-medium text-amber-500">{fmtTime(log.seconds)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}