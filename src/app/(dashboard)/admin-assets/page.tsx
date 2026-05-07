'use client';
import { useState, useEffect } from 'react';

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('assets');
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState({
    name: '', tagId: '', photoUrl: '', category: 'Laptop', brand: '', model: '', serialNumber: '',
    condition: 'Good', assignedTo: '', purchaseDate: '', purchasePrice: '', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, u, r] = await Promise.all([
      fetch('/api/assets').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()).catch(() => []),
      fetch('/api/asset-requests').then(r => r.json())
    ]);
    setAssets(a);
    setUsers(Array.isArray(u) ? u : []);
    setRequests(r);
  }

  async function saveAsset() {
    const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
    const method = editingAsset ? 'PATCH' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowModal(false); setEditingAsset(null);
    setForm({ name: '', tagId: '', photoUrl: '', category: 'Laptop', brand: '', model: '', serialNumber: '', condition: 'Good', assignedTo: '', purchaseDate: '', purchasePrice: '', notes: '' });
    loadData();
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
      purchasePrice: asset.purchasePrice || '', notes: asset.notes || ''
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
    const matchStatus = filterStatus === 'All' || a.status === filterStatus;
    const matchUser = filterUser === 'All' || 
      (filterUser === 'unassigned' ? !a.assignedTo : a.assignedTo === filterUser);
    return matchSearch && matchCategory && matchStatus && matchUser;
  });

  const activeAssets = assets.filter(a => a.status !== 'Disposed');
  const totalValue = activeAssets.reduce((sum, a) => sum + (parseFloat(a.purchasePrice) || 0), 0);
  const disposedValue = assets.filter(a => a.status === 'Disposed').reduce((sum, a) => sum + (parseFloat(a.purchasePrice) || 0), 0);
  const filteredValue = filteredAssets.reduce((sum, a) => sum + (parseFloat(a.purchasePrice) || 0), 0);
  const assignedCount = assets.filter(a => a.assignedTo).length;
  const availableCount = assets.filter(a => a.status === 'Available').length;
  const dartAssets = assets.filter(a => !a.assignedTo && a.status === 'Available');
  const categories = Array.from(new Set(assets.map(a => a.category)));
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;

  // Group by user (for "By Employee" view)
  const byUser = users.map(u => ({
    user: u,
    assets: assets.filter(a => a.assignedTo === u.id),
    value: assets.filter(a => a.assignedTo === u.id).reduce((s, a) => s + (parseFloat(a.purchasePrice) || 0), 0)
  })).filter(g => g.assets.length > 0).sort((a, b) => b.assets.length - a.assets.length);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-sm text-gray-500">Manage company assets and assignments</p>
        </div>
        <button onClick={() => { setEditingAsset(null); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Add Asset
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Total Assets</div>
          <div className="text-xl font-bold">{assets.length}</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Active Value</div>
          <div className="text-xl font-bold text-green-700">Rs {(totalValue/1000).toFixed(0)}K</div>
          {disposedValue > 0 && <div className="text-xs text-red-500">-Rs {(disposedValue/1000).toFixed(0)}K disposed</div>}
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Assigned</div>
          <div className="text-xl font-bold text-blue-600">{assignedCount}</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Available</div>
          <div className="text-xl font-bold text-green-600">{availableCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab('assets')} className={`px-4 py-1.5 text-sm rounded ${activeTab === 'assets' ? 'bg-white shadow-sm font-semibold' : 'text-gray-600'}`}>
          All Assets
        </button>
        <button onClick={() => setActiveTab('byUser')} className={`px-4 py-1.5 text-sm rounded ${activeTab === 'byUser' ? 'bg-white shadow-sm font-semibold' : 'text-gray-600'}`}>
          By Employee
        </button>
        <button onClick={() => setActiveTab('dartAssets')} className={`px-4 py-1.5 text-sm rounded ${activeTab === 'dartAssets' ? 'bg-white shadow-sm font-semibold' : 'text-gray-600'}`}>
          🎯 Dart Assets
        </button>
        <button onClick={() => setActiveTab('requests')} className={`px-4 py-1.5 text-sm rounded ${activeTab === 'requests' ? 'bg-white shadow-sm font-semibold' : 'text-gray-600'}`}>
          Requests {pendingRequests > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">{pendingRequests}</span>}
        </button>
      </div>

      {activeTab === 'assets' && (
        <>
          {/* Filters */}
          <div className="bg-white p-3 rounded-lg shadow-sm border mb-4 flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="🔍 Search name, tag, brand, employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border p-2 rounded text-sm flex-1 min-w-[200px]"
            />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border p-2 rounded text-sm">
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border p-2 rounded text-sm">
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="Under Repair">Under Repair</option>
              <option value="Disposed">Disposed</option>
            </select>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="border p-2 rounded text-sm">
              <option value="All">All Users</option>
              <option value="unassigned">⚠️ Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="flex gap-1 border rounded">
              <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : ''} rounded-l`}>⊞</button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : ''} rounded-r`}>☰</button>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-3">
            Showing <strong>{filteredAssets.length}</strong> of {assets.length} assets · Total value: <strong className="text-green-700">Rs {filteredValue.toLocaleString()}</strong>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredAssets.map(a => (
                <div key={a.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition group">
                  <div className="relative">
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt={a.name} className="w-full h-32 object-cover bg-gray-100" />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                    <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                      a.status === 'Available' ? 'bg-green-500 text-white' :
                      a.status === 'Assigned' ? 'bg-blue-500 text-white' :
                      a.status === 'Under Repair' ? 'bg-yellow-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>{a.status}</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate" title={a.name}>{a.name}</h3>
                    <div className="text-xs text-gray-500 mb-1">{a.tagId} · {a.category}</div>
                    {a.brand && <div className="text-xs text-gray-600">{a.brand}</div>}
                    {a.purchasePrice && <div className="text-xs font-semibold text-green-700 mt-1">Rs {parseFloat(a.purchasePrice).toLocaleString()}</div>}
                    {a.assignedUser ? (
                      <div className="text-xs text-blue-600 mt-1 truncate">👤 {a.assignedUser.name}</div>
                    ) : (
                      <div className="text-xs text-gray-400 mt-1">Not assigned</div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(a)} className="text-blue-600 text-xs">Edit</button>
                      <button onClick={() => deleteAsset(a.id)} className="text-red-600 text-xs">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2"></th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Tag</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Assigned To</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {a.photoUrl ? (
                          <img src={a.photoUrl} alt="" className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded"></div>
                        )}
                      </td>
                      <td className="p-2 font-medium">{a.name}</td>
                      <td className="p-2 text-gray-600">{a.tagId || '-'}</td>
                      <td className="p-2 text-gray-600">{a.category}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          a.status === 'Available' ? 'bg-green-100 text-green-800' :
                          a.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                          a.status === 'Under Repair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{a.status}</span>
                      </td>
                      <td className="p-2 text-blue-600">{a.assignedUser?.name || '-'}</td>
                      <td className="p-2 text-green-700 font-medium">{a.purchasePrice ? `Rs ${parseFloat(a.purchasePrice).toLocaleString()}` : '-'}</td>
                      <td className="p-2">
                        <button onClick={() => openEdit(a)} className="text-blue-600 mr-2 text-xs">Edit</button>
                        <button onClick={() => deleteAsset(a.id)} className="text-red-600 text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {/* Dart Assets Tab */}
      {activeTab === 'dartAssets' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold">🎯 Dart Assets</h2>
            <p className="text-sm text-gray-500">Company owned assets not assigned to any employee</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dartAssets.map(a => (
              <div key={a.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition group">
                <div className="relative">
                  {a.photoUrl ? (
                    <img src={a.photoUrl} alt={a.name} className="w-full h-32 object-cover bg-gray-100" />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  )}
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-500 text-white">Available</span>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate">{a.name}</h3>
                  <div className="text-xs text-gray-500 mb-1">{a.tagId} · {a.category}</div>
                  {a.brand && <div className="text-xs text-gray-600">{a.brand}</div>}
                  {a.purchasePrice && <div className="text-xs font-semibold text-green-700 mt-1">Rs {parseFloat(a.purchasePrice).toLocaleString()}</div>}
                  <div className="flex gap-2 mt-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(a)} className="text-blue-600 text-xs">Edit</button>
                    <button onClick={() => deleteAsset(a.id)} className="text-red-600 text-xs">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {dartAssets.length === 0 && (
              <div className="col-span-4 text-center py-12 text-gray-500 text-sm">No unassigned assets available</div>
            )}
          </div>
        </div>
      )}

      {/* By Employee View */}
      {activeTab === 'byUser' && (
        <div className="space-y-3">
          {byUser.map(g => (
            <div key={g.user.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-semibold">{g.user.name}</h3>
                  <p className="text-xs text-gray-500">{g.user.email} · {g.user.jobTitle || 'Employee'}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{g.assets.length} assets</div>
                  <div className="text-xs text-green-700">Rs {g.value.toLocaleString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {g.assets.map(a => (
                  <div key={a.id} className="border rounded p-2 text-xs flex gap-2 items-center">
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt="" className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded"></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-gray-500">{a.tagId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{r.user.name} · {r.type.replace('_', ' ')}</h3>
                  <p className="text-xs text-gray-500">{r.asset?.name || 'New Asset Request'}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded ${r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : r.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{r.description}</p>
              {r.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => updateRequest(r.id, 'APPROVED')} className="bg-green-600 text-white px-3 py-1 rounded text-xs">Approve</button>
                  <button onClick={() => updateRequest(r.id, 'REJECTED')} className="bg-red-600 text-white px-3 py-1 rounded text-xs">Reject</button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No requests yet</p>}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Asset Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border p-2 rounded text-sm" />
              <input placeholder="Tag ID" value={form.tagId} onChange={e => setForm({...form, tagId: e.target.value})} className="border p-2 rounded text-sm" />
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-700 block mb-2">Photo</label>
                <div className="flex gap-2 items-start">
                  {form.photoUrl && (
                    <img src={form.photoUrl} alt="Preview" className="w-20 h-20 object-cover rounded border" />
                  )}
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="photo-upload"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        const btn = document.getElementById('upload-btn');
                        if (btn) btn.textContent = '⏳ Uploading...';
try {
                          const res = await fetch('/api/upload', { method: 'POST', body: fd });
                          const data = await res.json();
                          if (data.url) {
                            setForm(prev => ({ ...prev, photoUrl: data.url }));
                            alert('✅ Photo uploaded! Now fill the rest and click Save.');
                          } else {
                            alert('Upload failed: ' + (data.error || 'Unknown'));
                          }
                        } catch (err: any) {
                          alert('Upload error: ' + err.message);
                        } finally {
                          if (btn) btn.textContent = '📷 Take Photo / Upload';
                        }
                      }}
                    />
                    <label
                      htmlFor="photo-upload"
                      id="upload-btn"
                      className="cursor-pointer bg-blue-600 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-700"
                    >
                      📷 Take Photo / Upload
                    </label>
                    <input
                      placeholder="Or paste image URL"
                      value={form.photoUrl}
                      onChange={e => setForm({...form, photoUrl: e.target.value})}
                      className="border p-2 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border p-2 rounded text-sm">
                <option>Laptop</option><option>Desktop</option><option>Phone</option><option>Tablet</option>
                <option>Monitor</option><option>Headphones</option><option>Keyboard</option><option>Mouse</option>
                <option>Camera</option><option>Speaker</option><option>Network</option><option>Storage</option>
                <option>UPS</option><option>Printer</option><option>Accessory</option><option>Other</option>
              </select>
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="border p-2 rounded text-sm">
                <option>New</option><option>Good</option><option>Fair</option><option>Poor</option>
              </select>
              <input placeholder="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="border p-2 rounded text-sm" />
              <input placeholder="Model" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="border p-2 rounded text-sm" />
              <input placeholder="Serial Number" value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})} className="border p-2 rounded text-sm col-span-2" />
              <select value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})} className="border p-2 rounded text-sm col-span-2">
                <option value="">-- Not Assigned --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="border p-2 rounded text-sm" />
              <input type="number" placeholder="Price (Rs)" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} className="border p-2 rounded text-sm" />
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border p-2 rounded text-sm col-span-2" rows={3} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowModal(false); setEditingAsset(null); }} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={saveAsset} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}