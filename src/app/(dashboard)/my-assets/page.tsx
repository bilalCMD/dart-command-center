'use client';
import { useState, useEffect } from 'react';
import { Package, FileText, CheckCircle, Clock, Search } from 'lucide-react';

const isSiteAsset = (a: any) => (a.notes || '').startsWith('[SITE]');

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

export default function MyAssetsPage() {
  const [available, setAvailable]   = useState<any[]>([]);
  const [myAssets, setMyAssets]     = useState<any[]>([]);
  const [requests, setRequests]     = useState<any[]>([]);
  const [activeTab, setActiveTab]   = useState<'available' | 'mine' | 'requests'>('available');
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [description, setDescription]     = useState('');
  const [submitting, setSubmitting]       = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [avail, mine, reqs] = await Promise.all([
      fetch('/api/assets/available').then(r => r.json()).catch(() => []),
      fetch('/api/assets').then(r => r.json()).catch(() => []),
      fetch('/api/asset-requests').then(r => r.json()).catch(() => []),
    ]);
    setAvailable(Array.isArray(avail) ? avail.filter((a: any) => !isSiteAsset(a)) : []);
    setMyAssets(Array.isArray(mine) ? mine : []);
    setRequests(Array.isArray(reqs) ? reqs : []);
  }

  function openRequest(asset: any) {
    setSelectedAsset(asset);
    setDescription('');
    setShowModal(true);
  }

  async function submitRequest() {
    if (!description.trim()) return;
    setSubmitting(true);
    await fetch('/api/asset-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NEW_REQUEST',
        assetId: selectedAsset?.id || '',
        description,
      }),
    });
    setShowModal(false);
    setSubmitting(false);
    loadData();
  }

  const filteredAvailable = available.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.brand || '').toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="animate-fade-in w-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-black text-[var(--text)] tracking-tight">Asset Management</h1>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">Browse available assets and submit requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-1 mb-5 w-fit">
        {([
          { key: 'available', label: 'Available Assets', icon: <Package size={12} />, badge: available.length },
          { key: 'mine',      label: 'My Assets',        icon: <CheckCircle size={12} />, badge: myAssets.length },
          { key: 'requests',  label: 'My Requests',      icon: <FileText size={12} />, badge: pendingCount || undefined },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-lg transition-all border-none cursor-pointer ${activeTab === t.key ? 'dart-gradient text-white shadow-soft' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
            {t.icon}{t.label}
            {t.badge ? <span className={`ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-black ${activeTab === t.key ? 'bg-white/30 text-white' : 'bg-[var(--border)] text-[var(--muted)]'}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ── Available Assets ── */}
      {activeTab === 'available' && (
        <>
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft p-4 mb-4 flex items-center gap-2">
            <Search size={13} className="text-[var(--muted)]" />
            <input
              type="text" placeholder="Search by name, category, brand..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-[13px] outline-none flex-1 text-[var(--text)]"
            />
          </div>

          {filteredAvailable.length === 0 ? (
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft px-5 py-16 text-center">
              <Package size={32} className="text-[var(--subtle)] mx-auto mb-3" />
              <div className="text-[15px] font-bold text-[var(--text)] mb-1">No available assets</div>
              <div className="text-[12px] text-[var(--muted)]">All assets are currently assigned. Submit a request if you need something.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredAvailable.map(a => (
                <div key={a.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] overflow-hidden flex flex-col">
                  {a.photoUrl
                    ? <img src={a.photoUrl} alt={a.name} className="w-full h-32 object-cover" />
                    : <div className="w-full h-32 bg-[var(--surface2)] flex items-center justify-center"><Package size={28} className="text-[var(--subtle)]" /></div>
                  }
                  <div className="p-3 flex flex-col flex-1">
                    <div className="font-bold text-[13px] text-[var(--text)] truncate">{a.name}</div>
                    <div className="text-[11px] text-[var(--muted)] mb-1">{a.tagId ? `${a.tagId} · ` : ''}{a.category}</div>
                    {a.brand && <div className="text-[11px] text-[var(--muted)]">{a.brand}{a.model ? ` · ${a.model}` : ''}</div>}
                    {a.purchasePrice && <div className="text-[12px] font-bold text-emerald-600 mt-1">Rs {parseFloat(a.purchasePrice).toLocaleString()}</div>}
                    <div className="mt-auto pt-3">
                      <button onClick={() => openRequest(a)}
                        className="w-full dart-gradient text-white py-1.5 rounded-xl text-[12px] font-bold border-none cursor-pointer hover:opacity-90 transition-all">
                        Request Asset
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── My Assets ── */}
      {activeTab === 'mine' && (
        <div>
          {myAssets.length === 0 ? (
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft px-5 py-16 text-center">
              <CheckCircle size={32} className="text-[var(--subtle)] mx-auto mb-3" />
              <div className="text-[15px] font-bold text-[var(--text)] mb-1">No assets assigned</div>
              <div className="text-[12px] text-[var(--muted)]">You don't have any assets assigned to you yet.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {myAssets.map(a => (
                <div key={a.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] overflow-hidden">
                  {a.photoUrl
                    ? <img src={a.photoUrl} alt={a.name} className="w-full h-32 object-cover" />
                    : <div className="w-full h-32 bg-[var(--surface2)] flex items-center justify-center"><Package size={28} className="text-[var(--subtle)]" /></div>
                  }
                  <div className="p-3">
                    <div className="font-bold text-[13px] text-[var(--text)] truncate">{a.name}</div>
                    <div className="text-[11px] text-[var(--muted)] mb-1">{a.tagId ? `${a.tagId} · ` : ''}{a.category}</div>
                    {a.brand && <div className="text-[11px] text-[var(--muted)]">{a.brand}</div>}
                    {a.purchasePrice && <div className="text-[12px] font-bold text-emerald-600 mt-1">Rs {parseFloat(a.purchasePrice).toLocaleString()}</div>}
                    <div className="text-[11px] text-[var(--muted)] mt-1">Condition: {a.condition}</div>
                    {a.assignedAt && <div className="text-[10px] text-[var(--subtle)] mt-1">Since {new Date(a.assignedAt).toLocaleDateString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── My Requests ── */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft px-5 py-16 text-center">
              <Clock size={32} className="text-[var(--subtle)] mx-auto mb-3" />
              <div className="text-[15px] font-bold text-[var(--text)] mb-1">No requests yet</div>
              <div className="text-[12px] text-[var(--muted)]">Browse available assets and request what you need.</div>
            </div>
          ) : requests.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] p-5">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-[14px] font-bold text-[var(--text)]">{r.asset?.name || 'Asset Request'}</div>
                  <div className="text-[11px] text-[var(--muted)]">{r.type.replace('_', ' ')} · {new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border ${STATUS_BADGE[r.status] || ''}`}>{r.status}</span>
              </div>
              <p className="text-[13px] text-[var(--muted)] mt-2">{r.description}</p>
              {r.adminNote && (
                <div className="mt-3 p-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text)]">
                  <span className="font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider">Admin Note: </span>{r.adminNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="h-1 dart-gradient rounded-t-2xl" />
            <div className="p-6">
              <h2 className="text-[18px] font-black text-[var(--text)] mb-1">Request Asset</h2>
              {selectedAsset && (
                <div className="flex items-center gap-3 p-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl mb-4">
                  {selectedAsset.photoUrl
                    ? <img src={selectedAsset.photoUrl} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                    : <div className="w-10 h-10 bg-[var(--border)] rounded-lg flex items-center justify-center shrink-0"><Package size={16} className="text-[var(--muted)]" /></div>
                  }
                  <div>
                    <div className="text-[13px] font-bold text-[var(--text)]">{selectedAsset.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">{selectedAsset.category}</div>
                  </div>
                </div>
              )}
              <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Why do you need this?</div>
              <textarea
                placeholder="Describe your request..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="w-full border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent resize-none"
              />
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => setShowModal(false)}
                  className="px-5 py-2 border border-[var(--border)] rounded-xl text-[13px] font-semibold cursor-pointer hover:bg-[var(--surface2)] transition-colors bg-transparent">
                  Cancel
                </button>
                <button onClick={submitRequest} disabled={submitting || !description.trim()}
                  className="dart-gradient text-white px-5 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer hover:opacity-90 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
