'use client';
import { useState, useEffect } from 'react';
import { Package, Users, DollarSign, CheckCircle, Plus, Search, Grid, List, Building2, Target, FileText, RefreshCw } from 'lucide-react';

const STATUS_DOT: Record<string, string> = {
  Available:      'bg-emerald-500',
  Assigned:       'bg-blue-500',
  'Under Repair': 'bg-amber-500',
  Disposed:       'bg-gray-400',
};
const STATUS_CARD: Record<string, string> = {
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

const isSiteAsset = (a: any) => (a.notes || '').startsWith('[SITE]');
const notesDisplay = (notes: string) => notes?.replace(/^\[SITE\]\s*/, '') || '';

export default function AdminAssetsPage() {
  const [assets, setAssets]         = useState<any[]>([]);
  const [users, setUsers]           = useState<any[]>([]);
  const [requests, setRequests]     = useState<any[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [activeTab, setActiveTab]   = useState('assets');
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [search, setSearch]         = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus]     = useState('All');
  const [filterUser, setFilterUser]         = useState('All');
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid');
  const [assetType, setAssetType]           = useState<'employee' | 'site'>('employee');
  const [form, setForm] = useState({
    name: '', tagId: '', photoUrl: '', category: 'Laptop', brand: '', model: '',
    serialNumber: '', condition: 'Good', assignedTo: '', purchaseDate: '',
    purchasePrice: '', notes: '',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, u, r] = await Promise.all([
      fetch('/api/assets').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()).catch(() => []),
      fetch('/api/asset-requests').then(r => r.json()),
    ]);
    setAssets(Array.isArray(a) ? a : []);
    setUsers(Array.isArray(u) ? u : []);
    setRequests(Array.isArray(r) ? r : []);
  }

  function resetForm(type: 'employee' | 'site' = 'employee') {
    setAssetType(type);
    setForm({ name: '', tagId: '', photoUrl: '', category: type === 'site' ? 'Furniture' : 'Laptop',
      brand: '', model: '', serialNumber: '', condition: 'Good', assignedTo: '',
      purchaseDate: '', purchasePrice: '', notes: type === 'site' ? '[SITE] ' : '' });
  }

  async function saveAsset() {
    const finalNotes = assetType === 'site'
      ? (form.notes.startsWith('[SITE]') ? form.notes : `[SITE] ${form.notes}`)
      : form.notes.replace(/^\[SITE\]\s*/, '');

    const url    = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
    const method = editingAsset ? 'PATCH' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, notes: finalNotes }) });
    setShowModal(false); setEditingAsset(null); resetForm(); loadData();
  }

  async function deleteAsset(id: string) {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function updateRequest(id: string, status: string) {
    await fetch('/api/asset-requests', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    loadData();
  }

  function openEdit(asset: any) {
    const site = isSiteAsset(asset);
    setEditingAsset(asset);
    setAssetType(site ? 'site' : 'employee');
    setForm({
      name: asset.name, tagId: asset.tagId || '', photoUrl: asset.photoUrl || '',
      category: asset.category, brand: asset.brand || '', model: asset.model || '',
      serialNumber: asset.serialNumber || '', condition: asset.condition,
      assignedTo: asset.assignedTo || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchasePrice: asset.purchasePrice || '', notes: asset.notes || '',
    });
    setShowModal(true);
  }

  const empAssets   = assets.filter(a => !isSiteAsset(a));
  const siteAssets  = assets.filter(a => isSiteAsset(a));
  const dartAssets  = empAssets.filter(a => !a.assignedTo && a.status === 'Available');

  const filteredAssets = assets.filter(a => {
    const ms = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.tagId || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.assignedUser?.name || '').toLowerCase().includes(search.toLowerCase());
    const mc = filterCategory === 'All' || a.category === filterCategory;
    const mst = filterStatus === 'All' || a.status === filterStatus;
    const mu = filterUser === 'All' ||
      (filterUser === 'unassigned' ? !a.assignedTo : a.assignedTo === filterUser);
    return ms && mc && mst && mu;
  });

  const activeAssets   = assets.filter(a => a.status !== 'Disposed');
  const totalValue     = activeAssets.reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0);
  const disposedValue  = assets.filter(a => a.status === 'Disposed').reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0);
  const assignedCount  = assets.filter(a => a.assignedTo).length;
  const availableCount = assets.filter(a => a.status === 'Available').length;
  const categories     = Array.from(new Set(assets.map(a => a.category)));
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;

  const byUser = users.map(u => ({
    user: u,
    assets: empAssets.filter(a => a.assignedTo === u.id),
    value: empAssets.filter(a => a.assignedTo === u.id).reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0),
  })).filter(g => g.assets.length > 0).sort((a, b) => b.assets.length - a.assets.length);

  return (
    <div className="animate-fade-in w-full">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-black text-[var(--text)] tracking-tight">Asset Management</h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Track, assign and manage all company assets</p>
        </div>
        <button onClick={() => { setEditingAsset(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 dart-gradient text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-soft hover:opacity-90 transition-all border-none cursor-pointer">
          <Plus size={14} /> Add Asset
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Assets', value: assets.length, icon: <Package size={18} className="text-[var(--muted)]" />, color: 'text-[var(--text)]' },
          { label: 'Active Value', value: `Rs ${(totalValue/1000).toFixed(0)}K`, sub: disposedValue > 0 ? `-Rs ${(disposedValue/1000).toFixed(0)}K disposed` : null, icon: <DollarSign size={18} className="text-emerald-500" />, color: 'text-emerald-600' },
          { label: 'Assigned', value: assignedCount, icon: <Users size={18} className="text-blue-500" />, color: 'text-blue-600' },
          { label: 'Available', value: availableCount, icon: <CheckCircle size={18} className="text-emerald-500" />, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-soft flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">{s.label}</div>
              <div className={`text-[22px] font-black leading-tight ${s.color}`}>{s.value}</div>
              {s.sub && <div className="text-[10px] text-red-500 font-semibold">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-1 mb-5 w-fit">
        {[
          { key: 'assets',     label: 'All Assets',  icon: <Package size={12} /> },
          { key: 'byUser',     label: 'By Employee', icon: <Users size={12} /> },
          { key: 'dartAssets', label: 'Dart Assets', icon: <Target size={12} /> },
          { key: 'siteAssets', label: 'Site Assets', icon: <Building2 size={12} /> },
          { key: 'requests',   label: 'Requests',    icon: <FileText size={12} />, badge: pendingRequests },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-lg transition-all border-none cursor-pointer ${activeTab === t.key ? 'dart-gradient text-white shadow-soft' : 'bg-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
            {t.icon}{t.label}
            {t.badge ? <span className="ml-0.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ── All Assets ── */}
      {activeTab === 'assets' && (
        <>
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft p-4 mb-4 flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-2 border border-[var(--border)] rounded-xl px-3 py-2 bg-[var(--surface2)] flex-1 min-w-[200px]">
              <Search size={13} className="text-[var(--muted)]" />
              <input type="text" placeholder="Search name, tag, brand, employee..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-[13px] outline-none flex-1 text-[var(--text)]" />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] bg-[var(--surface2)] outline-none text-[var(--text)]">
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] bg-[var(--surface2)] outline-none text-[var(--text)]">
              <option value="All">All Status</option>
              <option>Available</option><option>Assigned</option><option>Under Repair</option><option>Disposed</option>
            </select>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
              className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] bg-[var(--surface2)] outline-none text-[var(--text)]">
              <option value="All">All Users</option>
              <option value="unassigned">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="flex border border-[var(--border)] rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2 transition-all border-none cursor-pointer ${viewMode === 'grid' ? 'dart-gradient text-white' : 'bg-[var(--surface2)] text-[var(--muted)]'}`}><Grid size={14} /></button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 transition-all border-none cursor-pointer ${viewMode === 'list' ? 'dart-gradient text-white' : 'bg-[var(--surface2)] text-[var(--muted)]'}`}><List size={14} /></button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--muted)] font-semibold mb-3">
            Showing <strong className="text-[var(--text)]">{filteredAssets.length}</strong> of {assets.length} assets
          </p>
          <AssetGrid assets={filteredAssets} viewMode={viewMode} onEdit={openEdit} onDelete={deleteAsset} />
        </>
      )}

      {/* ── Dart Assets ── */}
      {activeTab === 'dartAssets' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-black text-[var(--text)]">Dart Assets</h2>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">Company assets available for employee assignment</p>
            </div>
            <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-2 text-center shadow-soft">
              <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Available</div>
              <div className="text-[20px] font-black text-emerald-600">{dartAssets.length}</div>
            </div>
          </div>
          {dartAssets.length > 0
            ? <AssetGrid assets={dartAssets} viewMode="grid" onEdit={openEdit} onDelete={deleteAsset} />
            : <EmptyState icon={<Target size={24} className="text-[var(--subtle)]" />} text="No unassigned assets available" />
          }
        </div>
      )}

      {/* ── Site Assets ── */}
      {activeTab === 'siteAssets' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-black text-[var(--text)]">Site Assets</h2>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">Office & location-based assets — furniture, equipment, fixtures</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-2 text-center shadow-soft">
                <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Total</div>
                <div className="text-[20px] font-black text-[var(--text)]">{siteAssets.length}</div>
              </div>
              <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-2 text-center shadow-soft">
                <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">Value</div>
                <div className="text-[20px] font-black text-emerald-600">
                  Rs {(siteAssets.reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0) / 1000).toFixed(0)}K
                </div>
              </div>
              <button onClick={() => { setEditingAsset(null); resetForm('site'); setShowModal(true); }}
                className="flex items-center gap-2 dart-gradient text-white px-4 py-2.5 rounded-xl text-[12px] font-bold border-none cursor-pointer hover:opacity-90 shadow-soft">
                <Plus size={13} /> Add Site Asset
              </button>
            </div>
          </div>

          {siteAssets.length === 0 ? (
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft px-5 py-16 text-center">
              <Building2 size={32} className="text-[var(--subtle)] mx-auto mb-3" />
              <div className="text-[15px] font-bold text-[var(--text)] mb-1">No site assets added yet</div>
              <div className="text-[12px] text-[var(--muted)] mb-5">Add office furniture, ACs, printers and other fixtures here</div>
              <button onClick={() => { setEditingAsset(null); resetForm('site'); setShowModal(true); }}
                className="dart-gradient text-white px-5 py-2.5 rounded-xl text-[13px] font-bold border-none cursor-pointer hover:opacity-90">
                Add Site Asset
              </button>
            </div>
          ) : (
            <>
              {Array.from(new Set(siteAssets.map(a => a.category))).map(cat => {
                const catAssets = siteAssets.filter(a => a.category === cat);
                return (
                  <div key={cat} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">{cat}</span>
                      <span className="text-[10px] bg-[var(--surface2)] border border-[var(--border)] px-2 py-0.5 rounded-full font-semibold text-[var(--muted)]">{catAssets.length}</span>
                    </div>
                    <AssetGrid assets={catAssets} viewMode="grid" onEdit={openEdit} onDelete={deleteAsset} siteMode />
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── By Employee ── */}
      {activeTab === 'byUser' && (
        <div className="space-y-3">
          {byUser.map(g => (
            <div key={g.user.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 dart-gradient rounded-xl flex items-center justify-center text-[13px] font-black text-white shrink-0">
                    {g.user.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[var(--text)]">{g.user.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">{g.user.email}</div>
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
                      : <div className="w-10 h-10 bg-[var(--surface2)] rounded-lg shrink-0 flex items-center justify-center"><Package size={14} className="text-[var(--muted)]" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[var(--text)] truncate">{a.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{a.tagId || a.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {byUser.length === 0 && <EmptyState icon={<Users size={24} className="text-[var(--subtle)]" />} text="No assets assigned to employees yet" />}
        </div>
      )}

      {/* ── Requests ── */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-soft border border-[var(--border)] p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[14px] font-bold text-[var(--text)]">{r.user.name} · {r.type.replace('_', ' ')}</div>
                  <div className="text-[11px] text-[var(--muted)]">{r.asset?.name || 'New Asset Request'}</div>
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
          {requests.length === 0 && <EmptyState icon={<FileText size={24} className="text-[var(--subtle)]" />} text="No requests yet" />}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="h-1 dart-gradient rounded-t-2xl" />
            <div className="p-6">
              <h2 className="text-[18px] font-black text-[var(--text)] mb-5">{editingAsset ? 'Edit Asset' : 'Add Asset'}</h2>

              {/* Asset Type */}
              <div className="mb-4">
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Asset Type</div>
                <div className="flex gap-2">
                  {([['employee', 'Employee Asset', 'Assigned to staff members'] , ['site', 'Site Asset', 'Office fixtures & equipment']] as const).map(([val, label, desc]) => (
                    <button key={val} type="button" onClick={() => { setAssetType(val); if (val === 'site' && !form.notes.startsWith('[SITE]')) setForm(f => ({...f, notes: '[SITE] ' + f.notes})); if (val === 'employee') setForm(f => ({...f, notes: f.notes.replace(/^\[SITE\]\s*/, '')})); }}
                      className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-left transition-all cursor-pointer bg-transparent ${assetType === val ? 'border-[var(--orange)] bg-orange-50' : 'border-[var(--border)] bg-[var(--surface2)]'}`}>
                      <div className="text-[12px] font-bold text-[var(--text)]">{label}</div>
                      <div className="text-[10px] text-[var(--muted)]">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Asset Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent" />
                <input placeholder="Tag ID" value={form.tagId} onChange={e => setForm({...form, tagId: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent" />

                {/* Photo */}
                <div className="col-span-2">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Photo</div>
                  <div className="flex gap-3 items-start">
                    {form.photoUrl && <img src={form.photoUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-[var(--border)] shrink-0" />}
                    <div className="flex-1 flex flex-col gap-2">
                      <input type="file" accept="image/*" id="photo-upload" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const fd = new FormData(); fd.append('file', file);
                          const btn = document.getElementById('upload-btn') as HTMLLabelElement;
                          if (btn) btn.textContent = 'Uploading...';
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: fd });
                            const data = await res.json();
                            if (data.url) setForm(prev => ({ ...prev, photoUrl: data.url }));
                          } finally { if (btn) btn.textContent = 'Upload Photo'; }
                        }} />
                      <label htmlFor="photo-upload" id="upload-btn"
                        className="cursor-pointer dart-gradient text-white text-center py-2 px-3 rounded-xl text-[12px] font-semibold">
                        Upload Photo
                      </label>
                      <input placeholder="Or paste image URL" value={form.photoUrl} onChange={e => setForm({...form, photoUrl: e.target.value})}
                        className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent" />
                    </div>
                  </div>
                </div>

                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent">
                  {assetType === 'site'
                    ? (<><option>Furniture</option><option>Air Conditioner</option><option>Whiteboard</option><option>Printer</option><option>Network</option><option>UPS</option><option>Other</option></>)
                    : (<><option>Laptop</option><option>Desktop</option><option>Phone</option><option>Tablet</option><option>Monitor</option><option>Headphones</option><option>Keyboard</option><option>Mouse</option><option>Camera</option><option>Speaker</option><option>Storage</option><option>Accessory</option><option>Other</option></>)
                  }
                </select>
                <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent">
                  <option>New</option><option>Good</option><option>Fair</option><option>Poor</option>
                </select>
                <input placeholder="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent" />
                <input placeholder="Model" value={form.model} onChange={e => setForm({...form, model: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent" />
                <input placeholder="Serial Number" value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent col-span-2" />

                {assetType === 'employee' && (
                  <select value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}
                    className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent col-span-2">
                    <option value="">-- Not Assigned --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                )}

                <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent" />
                <input type="number" placeholder="Price (Rs)" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent" />
                <textarea placeholder="Notes" value={notesDisplay(form.notes)} onChange={e => setForm({...form, notes: assetType === 'site' ? '[SITE] ' + e.target.value : e.target.value})}
                  className="border border-[var(--border)] px-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--orange)] bg-transparent col-span-2" rows={2} />
              </div>

              <div className="flex gap-2 mt-5 justify-end">
                <button onClick={() => { setShowModal(false); setEditingAsset(null); }}
                  className="px-5 py-2 border border-[var(--border)] rounded-xl text-[13px] font-semibold cursor-pointer hover:bg-[var(--surface2)] transition-colors bg-transparent">Cancel</button>
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

function AssetGrid({ assets, viewMode, onEdit, onDelete, siteMode = false }: {
  assets: any[]; viewMode: 'grid' | 'list'; onEdit: (a: any) => void; onDelete: (id: string) => void; siteMode?: boolean;
}) {
  const notesDisplay = (notes: string) => notes?.replace(/^\[SITE\]\s*/, '') || '';

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--surface2)] border-b border-[var(--border)]">
            <tr>{['', 'Name', 'Tag', 'Category', 'Status', 'Assigned To', 'Price', ''].map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--surface2)] transition-colors">
                <td className="px-4 py-2.5">
                  {a.photoUrl
                    ? <img src={a.photoUrl} alt="" className="w-9 h-9 object-cover rounded-lg" />
                    : <div className="w-9 h-9 bg-[var(--surface2)] rounded-lg flex items-center justify-center"><Package size={13} className="text-[var(--muted)]" /></div>
                  }
                </td>
                <td className="px-4 py-2.5 font-semibold text-[var(--text)] text-[13px]">{a.name}</td>
                <td className="px-4 py-2.5 text-[var(--muted)] text-[12px]">{a.tagId || '—'}</td>
                <td className="px-4 py-2.5 text-[var(--muted)] text-[12px]">{a.category}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${STATUS_BADGE[a.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{a.status}</span>
                </td>
                <td className="px-4 py-2.5 text-blue-600 text-[12px]">{a.assignedUser?.name || '—'}</td>
                <td className="px-4 py-2.5 text-emerald-700 font-semibold text-[12px]">{a.purchasePrice ? `Rs ${parseFloat(a.purchasePrice).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => onEdit(a)} className="text-[var(--orange)] text-[11px] font-semibold mr-3 bg-transparent border-none cursor-pointer hover:underline">Edit</button>
                  <button onClick={() => onDelete(a.id)} className="text-red-500 text-[11px] font-semibold bg-transparent border-none cursor-pointer hover:underline">Delete</button>
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
              : <div className="w-full h-32 bg-[var(--surface2)] flex items-center justify-center"><Package size={28} className="text-[var(--subtle)]" /></div>
            }
            <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-lg ${STATUS_CARD[a.status] || 'bg-gray-400 text-white'}`}>{a.status}</span>
          </div>
          <div className="p-3">
            <div className="font-bold text-[13px] text-[var(--text)] truncate">{a.name}</div>
            <div className="text-[11px] text-[var(--muted)] mb-1">{a.tagId ? `${a.tagId} · ` : ''}{a.category}</div>
            {a.brand && <div className="text-[11px] text-[var(--muted)]">{a.brand}</div>}
            {a.purchasePrice && <div className="text-[12px] font-bold text-emerald-600 mt-1">Rs {parseFloat(a.purchasePrice).toLocaleString()}</div>}
            {!siteMode && (a.assignedUser
              ? <div className="text-[11px] text-blue-600 mt-1 truncate">Assigned: {a.assignedUser.name}</div>
              : <div className="text-[11px] text-[var(--subtle)] mt-1">Not assigned</div>
            )}
            <div className="flex gap-3 mt-2 pt-2 border-t border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(a)} className="text-[var(--orange)] text-[11px] font-semibold bg-transparent border-none cursor-pointer hover:underline">Edit</button>
              <button onClick={() => onDelete(a.id)} className="text-red-500 text-[11px] font-semibold bg-transparent border-none cursor-pointer hover:underline">Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-soft px-5 py-16 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <div className="text-[14px] font-semibold text-[var(--text)]">{text}</div>
    </div>
  );
}
