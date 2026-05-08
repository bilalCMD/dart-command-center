'use client';
import { useState, useEffect } from 'react';

const STATUS_STYLE: Record<string, string> = {
  Available:      'bg-emerald-500 text-white',
  Assigned:       'bg-blue-500 text-white',
  'Under Repair': 'bg-amber-500 text-white',
  Disposed:       'bg-gray-400 text-white',
};
const STATUS_BADGE: Record<string, string> = {
  Available:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  Assigned:       'bg-blue-50 text-blue-700 border-blue-200',
  'Under Repair': 'bg-amber-50 text-amber-700 border-amber-200',
  Disposed:       'bg-gray-50 text-gray-600 border-gray-200',
};

export default function AdminAssetsPage() {
  const [assets, setAssets]           = useState<any[]>([]);
  const [users, setUsers]             = useState<any[]>([]);
  const [requests, setRequests]       = useState<any[]>([]);
  const [showModal, setShowModal]     = useState(false);
  const [activeTab, setActiveTab]     = useState('assets');
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [search, setSearch]           = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus]     = useState('All');
  const [filterUser, setFilterUser]         = useState('All');
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState({
    name: '', tagId: '', photoUrl: '', category: 'Laptop', brand: '', model: '',
    serialNumber: '', condition: 'Good', assignedTo: '', purchaseDate: '',
    purchasePrice: '', notes: '', location: 'employee',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, u, r] = await Promise.all([
      fetch('/api/assets').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()).catch(() => []),
      fetch('/api/asset-requests').then(r => r.json()),
    ]);
    setAssets(a);
    setUsers(Array.isArray(u) ? u : []);
    setRequests(r);
  }

  async function saveAsset() {
    const url    = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
    const method = editingAsset ? 'PATCH' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowModal(false); setEditingAsset(null);
    resetForm(); loadData();
  }

  function resetForm() {
    setForm({ name: '', tagId: '', photoUrl: '', category: 'Laptop', brand: '', model: '',
      serialNumber: '', condition: 'Good', assignedTo: '', purchaseDate: '',
      purchasePrice: '', notes: '', location: 'employee' });
  }

  async function deleteAsset(id: string) {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function updateRequest(id: string, status: string) {
    await fetch('/api/asset-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    loadData();
  }

  function openEdit(asset: any) {
    setEditingAsset(asset);
    setForm({
      name: asset.name, tagId: asset.tagId || '', photoUrl: asset.photoUrl || '',
      category: asset.category, brand: asset.brand || '', model: asset.model || '',
      serialNumber: asset.serialNumber || '', condition: asset.condition,
      assignedTo: asset.assignedTo || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchasePrice: asset.purchasePrice || '', notes: asset.notes || '',
      location: asset.location || 'employee',
    });
    setShowModal(true);
  }

  const filteredAssets = assets.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.tagId || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.assignedUser?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'All' || a.category === filterCategory;
    const matchStatus   = filterStatus === 'All' || a.status === filterStatus;
    const matchUser     = filterUser === 'All' ||
      (filterUser === 'unassigned' ? !a.assignedTo : a.assignedTo === filterUser);
    return matchSearch && matchCategory && matchStatus && matchUser;
  });

  const activeAssets    = assets.filter(a => a.status !== 'Disposed');
  const totalValue      = activeAssets.reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0);
  const disposedValue   = assets.filter(a => a.status === 'Disposed').reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0);
  const assignedCount   = assets.filter(a => a.assignedTo).length;
  const availableCount  = assets.filter(a => a.status === 'Available').length;
  const dartAssets      = assets.filter(a => !a.assignedTo && a.status === 'Available' && (a.location || 'employee') === 'employee');
  const siteAssets      = assets.filter(a => (a.location || 'employee') === 'site');
  const categories      = Array.from(new Set(assets.map(a => a.category)));
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;

  const byUser = users.map(u => ({
    user: u,
    assets: assets.filter(a => a.assignedTo === u.id),
    value: assets.filter(a => a.assignedTo === u.id).reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0),
  })).filter(g => g.assets.length > 0).sort((a, b) => b.assets.length - a.assets.length);

  const tabs = [
    { key: 'assets',    label: 'All Assets',   icon: '📦' },
    { key: 'byUser',    label: 'By Employee',  icon: '👤' },
    { key: 'dartAssets',label: 'Dart Assets',  icon: '🎯' },
    { key: 'siteAssets',label: 'Site Assets',  icon: '🏢' },
    { key: 'requests',  label: 'Requests',     icon: '📋', badge: pendingRequests },
  ];

  return (
    <div className="animate-fade-in w-full">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft overflow-hidden">
          <div className="h-1 dart-gradient" />
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 dart-gradient rounded-2xl flex items-center justify-center shadow-soft">
                <span className="text-2xl">🏗️</span>
              </div>
              <div>
                <h1 className="text-[22px] font-black text-[var(--text)] tracking-tight">Asset Management</h1>
                <p className="text-[12px] text-[var(--muted)] mt-0.5">Track, assign and manage all company assets</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingAsset(null); resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 dart-gradient text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-soft hover:opacity-90 transition-all border-none cursor-pointer"
            >
              + Add Asset
            </button>
          </div>

          {/* Stats row inside header */}
          <div className="grid grid-cols-4 border-t border-[var(--border)]">
            {[
              { label: 'Total Assets', value: assets.length, color: 'text-[var(--text)]', icon: '📦' },
              { label: 'Active Value', value: `Rs ${(totalValue/1000).toFixed(0)}K`, sub: disposedValue > 0 ? `-Rs ${(disposedValue/1000).toFixed(0)}K disposed` : null, color: 'text-emerald-600', icon: '💰' },
              { label: 'Assigned', value: assignedCount, color: 'text-blue-600', icon: '👤' },
              { label: 'Available', value: availableCount, color: 'text-emerald-600', icon: '✅' },
            ].map((s, i) => (
              <div key={s.label} className={`px-6 py-4 flex items-center gap-3 ${i < 3 ? 'border-r border-[var(--border)]' : ''}`}>
                <div className="text-xl">{s.icon}</div>
                <div>
                  <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">{s.label}</div>
                  <div className={`text-[20px] font-black leading-tight ${s.color}`}>{s.value}</div>
                  {s.sub && <div className="text-[10px] text-red-500 font-semibold">{s.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-1 mb-5 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-lg transition-all border-none cursor-pointer ${activeTab === t.key ? 'dart-gradient text-white shadow-soft' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
            <span>{t.icon}</span>
            {t.label}
            {t.badge ? (
              <span className="ml-0.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── All Assets Tab ── */}
      {activeTab === 'assets' && (
        <>
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft p-4 mb-4 flex gap-2 flex-wrap items-center">
            <input type="text" placeholder="🔍 Search name, tag, brand, employee..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] flex-1 min-w-[200px] outline-none focus:border-[var(--orange)] bg-[var(--surface2)]" />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] bg-[var(--surface2)] outline-none">
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] bg-[var(--surface2)] outline-none">
              <option value="All">All Status</option>
              <option>Available</option><option>Assigned</option><option>Under Repair</option><option>Disposed</option>
            </select>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] bg-[var(--surface2)] outline-none">
              <option value="All">All Users</option>
              <option value="unassigned">⚠️ Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="flex gap-0.5 border border-[var(--border)] rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2 text-sm font-bold transition-all border-none cursor-pointer ${viewMode === 'grid' ? 'dart-gradient text-white' : 'bg-[var(--surface2)] text-[var(--muted)]'}`}>⊞</button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 text-sm font-bold transition-all border-none cursor-pointer ${viewMode === 'list' ? 'dart-gradient text-white' : 'bg-[var(--surface2)] text-[var(--muted)]'}`}>☰</button>
            </div>
          </div>
          <div className="text-[11px] text-[var(--muted)] mb-3 font-semibold">
            Showing <strong className="text-[var(--text)]">{filteredAssets.length}</strong> of {assets.length} assets
          </div>
          <AssetGrid assets={filteredAssets} viewMode={viewMode} onEdit={openEdit} onDelete={deleteAsset} />
        </>
      )}

      {/* ── Dart Assets Tab ── */}
      {activeTab === 'dartAssets' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 dart-gradient rounded-xl flex items-center justify-center text-xl">🎯</div>
            <div>
              <h2 className="text-[16px] font-black text-[var(--text)]">Dart Assets</h2>
              <p className="text-[12px] text-[var(--muted)]">Company assets available for employee assignment</p>
            </div>
            <div className="ml-auto bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-2 text-center">
              <div className="text-[11px] text-[var(--muted)] font-semibold">Available</div>
              <div className="text-[18px] font-black text-emerald-600">{dartAssets.length}</div>
            </div>
          </div>
          <AssetGrid assets={dartAssets} viewMode="grid" onEdit={openEdit} onDelete={deleteAsset} />
          {dartAssets.length === 0 && <EmptyState icon="🎯" text="No unassigned assets available" />}
        </div>
      )}

      {/* ── Site Assets Tab ── */}
      {activeTab === 'siteAssets' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center text-xl">🏢</div>
            <div>
              <h2 className="text-[16px] font-black text-[var(--text)]">Site Assets</h2>
              <p className="text-[12px] text-[var(--muted)]">Office & location-based assets — furniture, equipment, fixtures</p>
            </div>
            <div className="ml-auto flex gap-3">
              <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-2 text-center">
                <div className="text-[11px] text-[var(--muted)] font-semibold">Total</div>
                <div className="text-[18px] font-black text-[var(--text)]">{siteAssets.length}</div>
              </div>
              <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-2 text-center">
                <div className="text-[11px] text-[var(--muted)] font-semibold">Value</div>
                <div className="text-[18px] font-black text-emerald-600">Rs {(siteAssets.reduce((s,a) => s+(parseFloat(a.purchasePrice)||0),0)/1000).toFixed(0)}K</div>
              </div>
            </div>
          </div>

          {siteAssets.length === 0 ? (
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft px-5 py-16 text-center">
              <div className="text-5xl mb-3">🏢</div>
              <div className="text-[15px] font-bold text-[var(--text)] mb-1">No site assets yet</div>
              <div className="text-[12px] text-[var(--muted)] mb-4">Add office furniture, ACs, printers etc. as site assets</div>
              <button
                onClick={() => { setEditingAsset(null); resetForm(); setForm(f => ({...f, location: 'site'})); setShowModal(true); }}
                className="dart-gradient text-white px-5 py-2.5 rounded-xl text-[13px] font-bold border-none cursor-pointer hover:opacity-90"
              >
                + Add Site Asset
              </button>
            </div>
          ) : (
            <>
              {/* Group by category */}
              {Array.from(new Set(siteAssets.map(a => a.category))).map(cat => {
                const catAssets = siteAssets.filter(a => a.category === cat);
                return (
                  <div key={cat} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">{cat}</span>
                      <span className="text-[10px] bg-[var(--surface2)] border border-[var(--border)] px-2 py-0.5 rounded-full font-bold text-[var(--muted)]">{catAssets.length}</span>
                    </div>
                    <AssetGrid assets={catAssets} viewMode="grid" onEdit={openEdit} onDelete={deleteAsset} />
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── By Employee Tab ── */}
      {activeTab === 'byUser' && (
        <div className="space-y-3">
          {byUser.map(g => (
            <div key={g.user.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 dart-gradient rounded-xl flex items-center justify-center text-[13px] font-black text-white">
                    {g.user.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--text)]">{g.user.name}</h3>
                    <p className="text-[11px] text-[var(--muted)]">{g.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-black text-[var(--text)]">{g.assets.length} assets</div>
                  <div className="text-[11px] font-semibold text-emerald-600">Rs {g.value.toLocaleString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {g.assets.map(a => (
                  <div key={a.id} className="border border-[var(--border)] rounded-xl p-2.5 flex gap-2 items-center hover:bg-[var(--surface2)] transition-colors">
                    {a.photoUrl
                      ? <img src={a.photoUrl} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      : <div className="w-10 h-10 bg-[var(--surface2)] rounded-lg shrink-0 flex items-center justify-center text-lg">📦</div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[var(--text)] truncate">{a.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{a.tagId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {byUser.length === 0 && <EmptyState icon="👤" text="No assets assigned yet" />}
        </div>
      )}

      {/* ── Requests Tab ── */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text)]">{r.user.name} · {r.type.replace('_', ' ')}</h3>
                  <p className="text-[11px] text-[var(--muted)]">{r.asset?.name || 'New Asset Request'}</p>
                </div>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{r.status}</span>
              </div>
              <p className="text-[13px] text-[var(--muted)] mb-3">{r.description}</p>
              {r.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => updateRequest(r.id, 'APPROVED')} className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer hover:bg-emerald-600">Approve</button>
                  <button onClick={() => updateRequest(r.id, 'REJECTED')} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer hover:bg-red-600">Reject</button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <EmptyState icon="📋" text="No requests yet" />}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="h-1 dart-gradient rounded-t-2xl" />
            <div className="p-6">
              <h2 className="text-[18px] font-black text-[var(--text)] mb-5">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Asset Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]" />
                <input placeholder="Tag ID" value={form.tagId} onChange={e => setForm({...form, tagId: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]" />

                {/* Location type */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Asset Type</label>
                  <div className="flex gap-2">
                    {[
                      { val: 'employee', label: '👤 Employee Asset', desc: 'Can be assigned to staff' },
                      { val: 'site',     label: '🏢 Site Asset',     desc: 'Office/location fixture' },
                    ].map(opt => (
                      <button key={opt.val} type="button" onClick={() => setForm({...form, location: opt.val})}
                        className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${form.location === opt.val ? 'border-[var(--orange)] bg-orange-50' : 'border-[var(--border)] bg-[var(--surface2)]'}`}>
                        <div className="text-[12px] font-bold text-[var(--text)]">{opt.label}</div>
                        <div className="text-[10px] text-[var(--muted)]">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Photo</label>
                  <div className="flex gap-2 items-start">
                    {form.photoUrl && <img src={form.photoUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-[var(--border)]" />}
                    <div className="flex-1 flex flex-col gap-2">
                      <input type="file" accept="image/*" id="photo-upload" style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const fd = new FormData(); fd.append('file', file);
                          const btn = document.getElementById('upload-btn');
                          if (btn) btn.textContent = '⏳ Uploading...';
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: fd });
                            const data = await res.json();
                            if (data.url) setForm(prev => ({ ...prev, photoUrl: data.url }));
                            else alert('Upload failed: ' + (data.error || 'Unknown'));
                          } catch (err: any) { alert('Upload error: ' + err.message); }
                          finally { if (btn) btn.textContent = '📷 Take Photo / Upload'; }
                        }} />
                      <label htmlFor="photo-upload" id="upload-btn"
                        className="cursor-pointer dart-gradient text-white text-center py-2 px-3 rounded-xl text-[13px] font-semibold">
                        📷 Take Photo / Upload
                      </label>
                      <input placeholder="Or paste image URL" value={form.photoUrl}
                        onChange={e => setForm({...form, photoUrl: e.target.value})}
                        className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]" />
                    </div>
                  </div>
                </div>

                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]">
                  <option>Laptop</option><option>Desktop</option><option>Phone</option><option>Tablet</option>
                  <option>Monitor</option><option>Headphones</option><option>Keyboard</option><option>Mouse</option>
                  <option>Camera</option><option>Speaker</option><option>Network</option><option>Storage</option>
                  <option>UPS</option><option>Printer</option><option>Furniture</option><option>Air Conditioner</option>
                  <option>Whiteboard</option><option>Accessory</option><option>Other</option>
                </select>
                <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]">
                  <option>New</option><option>Good</option><option>Fair</option><option>Poor</option>
                </select>
                <input placeholder="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]" />
                <input placeholder="Model" value={form.model} onChange={e => setForm({...form, model: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]" />
                <input placeholder="Serial Number" value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] col-span-2" />

                {form.location === 'employee' && (
                  <select value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}
                    className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] col-span-2">
                    <option value="">-- Not Assigned --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                )}

                <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]" />
                <input type="number" placeholder="Price (Rs)" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)]" />
                <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] col-span-2" rows={2} />
              </div>
              <div className="flex gap-2 mt-5 justify-end">
                <button onClick={() => { setShowModal(false); setEditingAsset(null); }}
                  className="px-5 py-2 border border-[var(--border)] rounded-xl text-[13px] font-semibold cursor-pointer hover:bg-[var(--surface2)] transition-colors">Cancel</button>
                <button onClick={saveAsset}
                  className="dart-gradient text-white px-5 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer hover:opacity-90">Save Asset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssetGrid({ assets, viewMode, onEdit, onDelete }: { assets: any[]; viewMode: 'grid' | 'list'; onEdit: (a: any) => void; onDelete: (id: string) => void }) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface2)] border-b border-[var(--border)]">
            <tr>{['', 'Name', 'Tag', 'Category', 'Status', 'Assigned To', 'Price', 'Actions'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--surface2)] transition-colors">
                <td className="px-3 py-2">{a.photoUrl ? <img src={a.photoUrl} alt="" className="w-9 h-9 object-cover rounded-lg" /> : <div className="w-9 h-9 bg-[var(--surface2)] rounded-lg flex items-center justify-center">📦</div>}</td>
                <td className="px-3 py-2 font-semibold text-[var(--text)] text-[13px]">{a.name}</td>
                <td className="px-3 py-2 text-[var(--muted)] text-[12px]">{a.tagId || '-'}</td>
                <td className="px-3 py-2 text-[var(--muted)] text-[12px]">{a.category}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${STATUS_BADGE[a.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{a.status}</span></td>
                <td className="px-3 py-2 text-blue-600 text-[12px]">{a.assignedUser?.name || '-'}</td>
                <td className="px-3 py-2 text-emerald-700 font-semibold text-[12px]">{a.purchasePrice ? `Rs ${parseFloat(a.purchasePrice).toLocaleString()}` : '-'}</td>
                <td className="px-3 py-2 flex gap-2">
                  <button onClick={() => onEdit(a)} className="text-blue-600 text-[11px] font-semibold hover:underline cursor-pointer bg-transparent border-none">Edit</button>
                  <button onClick={() => onDelete(a.id)} className="text-red-500 text-[11px] font-semibold hover:underline cursor-pointer bg-transparent border-none">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {assets.map(a => (
        <div key={a.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow group">
          <div className="relative">
            {a.photoUrl
              ? <img src={a.photoUrl} alt={a.name} className="w-full h-32 object-cover" />
              : <div className="w-full h-32 bg-gradient-to-br from-[var(--surface2)] to-[var(--border)] flex items-center justify-center text-3xl">📦</div>
            }
            <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-lg ${STATUS_STYLE[a.status] || 'bg-gray-400 text-white'}`}>{a.status}</span>
          </div>
          <div className="p-3">
            <h3 className="font-bold text-[13px] text-[var(--text)] truncate">{a.name}</h3>
            <div className="text-[11px] text-[var(--muted)] mb-1">{a.tagId} · {a.category}</div>
            {a.brand && <div className="text-[11px] text-[var(--muted)]">{a.brand}</div>}
            {a.purchasePrice && <div className="text-[12px] font-bold text-emerald-600 mt-1">Rs {parseFloat(a.purchasePrice).toLocaleString()}</div>}
            {a.assignedUser
              ? <div className="text-[11px] text-blue-600 mt-1 truncate">👤 {a.assignedUser.name}</div>
              : <div className="text-[11px] text-[var(--subtle)] mt-1">Not assigned</div>
            }
            <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(a)} className="text-blue-600 text-[11px] font-semibold cursor-pointer bg-transparent border-none hover:underline">Edit</button>
              <button onClick={() => onDelete(a.id)} className="text-red-500 text-[11px] font-semibold cursor-pointer bg-transparent border-none hover:underline">Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft px-5 py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-[14px] font-semibold text-[var(--text)]">{text}</div>
    </div>
  );
}
