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

  useEffect(() => { fetchMembers(); }, [date]);

  async function fetchMembers() {
    setLoading(true);
    const res = await fetch(`/api/admin/activity?date=${date}`);
    const data = await res.json();
    const sorted = (data.members || []).sort((a: any, b: any) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      if (a.isTracking && !b.isTracking) return -1;
      if (!a.isTracking && b.isTracking) return 1;
      return b.totalSeconds - a.totalSeconds;
    });
    setMembers(sorted);
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
    fetchDetail(m.id);
  }

  const chromeApps = detail?.byApp?.filter((a: any) => a.appName === 'Google Chrome') || [];
  const otherApps = detail?.byApp?.filter((a: any) => a.appName !== 'Google Chrome') || [];
  const chromeSites = chromeApps.flatMap((a: any) =>
    Object.entries(a.sites || {}).map(([site, secs]) => ({ site, seconds: secs as number }))
  ).sort((a: any, b: any) => b.seconds - a.seconds);
  const totalChromeSeconds = chromeSites.reduce((s: number, c: any) => s + c.seconds, 0);

  const activeMembers = members.filter(m => m.isOnline);
  const inactiveMembers = members.filter(m => !m.isOnline);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>Activity Monitor</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>Track employee app usage & idle time</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => { fetchMembers(); if (selected) fetchDetail(selected.id); }}
            style={{
              padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)',
              background: '#fff', fontSize: '12px', fontWeight: 600, color: 'var(--text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            🔄 Refresh
          </button>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSelected(null); setDetail(null); }}
            style={{
              background: '#fff', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '8px 12px', fontSize: '13px', color: 'var(--text)',
              outline: 'none', cursor: 'pointer',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Team Members ({members.length})
            </span>
            {activeMembers.length > 0 && (
              <span style={{ fontSize: '10px', fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '99px' }}>
                {activeMembers.length} active
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading...</div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
              {activeMembers.length > 0 && (
                <>
                  <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Now</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {activeMembers.filter((m: any) => m.isOnBreak).length > 0 && (
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: '99px' }}>
                          ☕ {activeMembers.filter((m: any) => m.isOnBreak).length} on break
                        </span>
                      )}
                      {activeMembers.filter((m: any) => m.isAway).length > 0 && (
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#8b5cf6', background: '#f3e8ff', padding: '2px 6px', borderRadius: '99px' }}>
                          🕌 {activeMembers.filter((m: any) => m.isAway).length} away
                        </span>
                      )}
                    </div>
                  </div>
                  {activeMembers.map(m => (
                    <MemberRow key={m.id} m={m} selected={selected} onSelect={selectMember} active={m.isOnline} />
                  ))}
                  {inactiveMembers.length > 0 && <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />}
                </>
              )}

              {inactiveMembers.length > 0 && (
                <>
                  {activeMembers.length > 0 && (
                    <div style={{ padding: '8px 16px 4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>No Data</span>
                    </div>
                  )}
                  {inactiveMembers.map(m => (
                    <MemberRow key={m.id} m={m} selected={selected} onSelect={selectMember} active={false} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!selected ? (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>👈</div>
              <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 500 }}>Select a member to view their activity</p>
            </div>
          ) : detailLoading ? (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '48px', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                {[0, 150, 300].map(d => (
                  <div key={d} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--orange)', animation: 'bounce 1s infinite', animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          ) : detail ? (
            <>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: detail.clockIn ? '14px' : '0' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #f97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {selected.avatar || selected.name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{selected.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                      <span>{selected.role}</span>
                      {detail.clockIn && (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>
                          Clocked in at {new Date(detail.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      )}
                      {detail.clockOut && (
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
                          · Out {new Date(detail.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  {(selected as any).isAway ? (
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#f3e8ff', color: '#8b5cf6', padding: '4px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }} />
                      🕌 Away {(selected as any).awayReason ? `· ${(selected as any).awayReason}` : ''}
                    </span>
                  ) : selected.isOnBreak ? (
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                      ☕ On Break
                    </span>
                  ) : selected.isOnline && (
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                      Active
                    </span>
                  )}
                </div>

                {detail.clockIn && (() => {
                  const pct = Math.min((detail.totalSeconds / (8 * 3600)) * 100, 100);
                  const hrs = (detail.totalSeconds / 3600).toFixed(1);
                  const done = pct >= 100;
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Daily Progress</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: done ? '#16a34a' : 'var(--orange)' }}>
                          {hrs}h / 8h {done ? '✓ Complete' : `· ${(8 - detail.totalSeconds / 3600).toFixed(1)}h left`}
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--surface2)', borderRadius: '99px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          borderRadius: '99px',
                          background: done ? '#22c55e' : 'linear-gradient(90deg, #f97316, #fb923c)',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Office Time',   value: fmtTime(detail.totalSeconds),      color: 'var(--orange)' },
                  { label: 'Break Time',    value: fmtTime(detail.totalBreakSeconds),  color: '#8b5cf6' },
                  { label: 'Idle Time',     value: fmtTime(detail.totalIdleSeconds),   color: '#f59e0b' },
                  { label: 'Apps Used',     value: otherApps.length,                   color: 'var(--text)' },
                  { label: 'Sites Visited', value: chromeSites.length,                 color: '#3b82f6' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--border)', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { key: 'apps', label: `📱 Apps (${otherApps.length})` },
                    { key: 'chrome', label: `🌐 Chrome (${chromeSites.length} sites)` },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      style={{
                        flex: 1, padding: '12px 16px', fontSize: '12px', fontWeight: 700,
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: activeTab === tab.key ? '#fff7ed' : '#fafafa',
                        color: activeTab === tab.key ? 'var(--orange)' : 'var(--muted)',
                        borderBottom: activeTab === tab.key ? '2px solid var(--orange)' : '2px solid transparent',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'apps' && (
                  <div>
                    {otherApps.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
                        <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No app activity tracked</p>
                        <p style={{ fontSize: '11px', color: 'var(--subtle)', marginTop: '4px' }}>Make sure desktop app is running</p>
                      </div>
                    ) : otherApps.map((app: any) => {
                      const pct = detail.totalSeconds > 0 ? Math.round((app.seconds / detail.totalSeconds) * 100) : 0;
                      const icon = APP_ICONS[app.appName] || '💼';
                      return (
                        <div key={app.appName} style={{ padding: '14px 20px', borderBottom: '1px solid #f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '18px' }}>{icon}</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{app.appName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{fmtTime(app.seconds)}</span>
                              <span style={{ fontSize: '10px', background: '#f1f5f9', color: 'var(--muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #f97316, #fb923c)', borderRadius: '99px', width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'chrome' && (
                  <div>
                    {chromeSites.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🌐</div>
                        <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No Chrome activity tracked</p>
                        <p style={{ fontSize: '11px', color: 'var(--subtle)', marginTop: '4px' }}>Make sure Dart Chrome extension is installed</p>
                      </div>
                    ) : chromeSites.map((s: any) => {
                      const pct = totalChromeSeconds > 0 ? Math.round((s.seconds / totalChromeSeconds) * 100) : 0;
                      return (
                        <div key={s.site} style={{ padding: '14px 20px', borderBottom: '1px solid #f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img src={`https://www.google.com/s2/favicons?domain=${s.site}&sz=16`} style={{ width: '16px', height: '16px', borderRadius: '3px' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{s.site}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{fmtTime(s.seconds)}</span>
                              <span style={{ fontSize: '10px', background: '#f1f5f9', color: 'var(--muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: '99px', width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {detail.idleLogs?.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⏸ Idle Periods</span>
                  </div>
                  {detail.idleLogs.map((log: any, i: number) => (
                    <div key={i} style={{ padding: '10px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                        {new Date(log.idleFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' → '}
                        {new Date(log.idleTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>{fmtTime(log.seconds)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ m, selected, onSelect, active }: { m: any; selected: any; onSelect: (m: any) => void; active: boolean }) {
  const isSelected = selected?.id === m.id;
  const onBreak = m.isOnBreak;
  const away = (m as any).isAway;
  
  const avatarBg = away
    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
    : onBreak 
      ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
      : active 
        ? 'linear-gradient(135deg, #f97316, #fb923c)' 
        : '#f1f5f9';
  
  return (
    <button
      onClick={() => onSelect(m)}
      style={{
        width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', cursor: 'pointer',
        background: isSelected ? '#fff7ed' : '#fff', transition: 'all 0.12s',
        borderLeft: isSelected ? '3px solid var(--orange)' : '3px solid transparent',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#fafafa'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#fff'; }}
    >
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
        background: avatarBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 800, color: (active || away) ? '#fff' : 'var(--muted)',
        position: 'relative',
      }}>
        {m.avatar || m.name?.[0] || '?'}
        {away && (
          <span style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            fontSize: '11px', background: '#fff', borderRadius: '50%',
            width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #8b5cf6',
          }}>🕌</span>
        )}
        {onBreak && !away && (
          <span style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            fontSize: '11px', background: '#fff', borderRadius: '50%',
            width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #f59e0b',
          }}>☕</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
        <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{m.role}</div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {away ? (
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px', background: '#f3e8ff', padding: '3px 8px', borderRadius: '99px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
            🕌 Away
          </span>
        ) : onBreak ? (
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '3px 8px', borderRadius: '99px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            On Break
          </span>
        ) : active ? (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {fmtTime(m.totalSeconds)}
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--subtle)' }}>No data</span>
        )}
      </div>
    </button>
  );
}