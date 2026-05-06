'use client';
import { useState, useEffect } from 'react';

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('assets');
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', category: 'Laptop', brand: '', model: '', serialNumber: '',
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
    setForm({ name: '', category: 'Laptop', brand: '', model: '', serialNumber: '', condition: 'Good', assignedTo: '', purchaseDate: '', purchasePrice: '', notes: '' });
    loadData();
  }

  async function deleteAsset(id: string) {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function updateRequest(id: string, status: string, adminNote: string = '') {
    await fetch('/api/asset-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, adminNote }) });
    loadData();
  }

  function openEdit(asset: any) {
    setEditingAsset(asset);
    setForm({
      name: asset.name, category: asset.category, brand: asset.brand || '', model: asset.model || '',
      serialNumber: asset.serialNumber || '', condition: asset.condition, assignedTo: asset.assignedTo || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchasePrice: asset.purchasePrice || '', notes: asset.notes || ''
    });
    setShowModal(true);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Asset Management</h1>
        <button onClick={() => { setEditingAsset(null); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Add Asset</button>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setActiveTab('assets')} className={`px-4 py-2 ${activeTab === 'assets' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}>All Assets ({assets.length})</button>
        <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 ${activeTab === 'requests' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}>Requests ({requests.filter(r => r.status === 'PENDING').length})</button>
      </div>

      {activeTab === 'assets' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Serial</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Assigned To</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3">{a.category}</td>
                  <td className="p-3 text-sm text-gray-600">{a.serialNumber || '-'}</td>
                  <td className="p-3"><span className={`px-2 py-1 text-xs rounded ${a.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{a.status}</span></td>
                  <td className="p-3">{a.assignedUser?.name || '-'}</td>
                  <td className="p-3">
                    <button onClick={() => openEdit(a)} className="text-blue-600 mr-3">Edit</button>
                    <button onClick={() => deleteAsset(a.id)} className="text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{r.user.name} - {r.type}</h3>
                  <p className="text-sm text-gray-600">{r.asset?.name || 'New Asset Request'}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : r.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
              </div>
              <p className="text-gray-700 mb-3">{r.description}</p>
              {r.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => updateRequest(r.id, 'APPROVED')} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Approve</button>
                  <button onClick={() => updateRequest(r.id, 'REJECTED')} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Reject</button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-center text-gray-500 py-8">No requests yet</p>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Asset Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border p-2 rounded" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border p-2 rounded">
                <option>Laptop</option><option>Desktop</option><option>Phone</option><option>Chair</option><option>Monitor</option><option>Headphones</option><option>Keyboard</option><option>Mouse</option><option>Other</option>
              </select>
              <input placeholder="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Model" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Serial Number" value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})} className="border p-2 rounded" />
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="border p-2 rounded">
                <option>New</option><option>Good</option><option>Fair</option><option>Poor</option>
              </select>
              <select value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})} className="border p-2 rounded col-span-2">
                <option value="">-- Not Assigned --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="border p-2 rounded" />
              <input type="number" placeholder="Purchase Price" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} className="border p-2 rounded" />
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border p-2 rounded col-span-2" rows={3} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowModal(false); setEditingAsset(null); }} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={saveAsset} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}