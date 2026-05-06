'use client';
import { useState, useEffect } from 'react';

export default function MyAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('assets');
  const [form, setForm] = useState({
    type: 'NEW_REQUEST',
    assetId: '',
    description: ''
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, r] = await Promise.all([
      fetch('/api/assets').then(r => r.json()),
      fetch('/api/asset-requests').then(r => r.json())
    ]);
    setAssets(a);
    setRequests(r);
  }

  async function submitRequest() {
    if (!form.description.trim()) {
      alert('Please describe your request');
      return;
    }
    await fetch('/api/asset-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setShowModal(false);
    setForm({ type: 'NEW_REQUEST', assetId: '', description: '' });
    loadData();
    alert('Request submitted!');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Assets</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + New Request
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setActiveTab('assets')} className={`px-4 py-2 ${activeTab === 'assets' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}>
          My Assets ({assets.length})
        </button>
        <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 ${activeTab === 'requests' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}>
          My Requests ({requests.length})
        </button>
      </div>

      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map(a => (
            <div key={a.id} className="bg-white rounded-lg shadow p-5 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{a.name}</h3>
                <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">{a.category}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {a.brand && <p><strong>Brand:</strong> {a.brand}</p>}
                {a.model && <p><strong>Model:</strong> {a.model}</p>}
                {a.serialNumber && <p><strong>Serial:</strong> {a.serialNumber}</p>}
                <p><strong>Condition:</strong> {a.condition}</p>
                {a.assignedAt && <p className="text-xs text-gray-500 mt-2">Assigned: {new Date(a.assignedAt).toLocaleDateString()}</p>}
              </div>
              <button
                onClick={() => { setForm({ type: 'ISSUE_REPORT', assetId: a.id, description: '' }); setShowModal(true); }}
                className="mt-3 text-sm text-red-600 hover:underline"
              >
                Report Issue
              </button>
            </div>
          ))}
          {assets.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-12">
              <p>No assets assigned to you yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{r.type.replace('_', ' ')}</h3>
                  <p className="text-sm text-gray-600">{r.asset?.name || 'New Asset Request'}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  r.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>{r.status}</span>
              </div>
              <p className="text-gray-700 text-sm mb-2">{r.description}</p>
              {r.adminNote && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <strong>Admin:</strong> {r.adminNote}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {requests.length === 0 && <p className="text-center text-gray-500 py-8">No requests yet</p>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">New Request</h2>
            <div className="space-y-3">
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="border p-2 rounded w-full">
                <option value="NEW_REQUEST">Request New Asset</option>
                <option value="ISSUE_REPORT">Report Issue</option>
                <option value="REPAIR">Need Repair</option>
              </select>
              {form.type !== 'NEW_REQUEST' && (
                <select value={form.assetId} onChange={e => setForm({...form, assetId: e.target.value})} className="border p-2 rounded w-full">
                  <option value="">Select Asset</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <textarea
                placeholder="Describe your request in detail..."
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="border p-2 rounded w-full"
                rows={5}
              />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={submitRequest} className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}