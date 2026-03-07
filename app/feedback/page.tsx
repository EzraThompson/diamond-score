'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeedbackItem {
  id: number;
  message: string;
  page: string | null;
  gameId: string | null;
  resolved: boolean;
  createdAt: string;
}

export default function FeedbackAdmin() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter === 'open') params.set('resolved', 'false');
      if (filter === 'resolved') params.set('resolved', 'true');

      const res = await fetch(`/api/feedback?${params}`, {
        headers: { 'x-admin-key': key },
      });
      if (res.status === 401) {
        setAuthed(false);
        setError('Invalid admin key');
        return;
      }
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [key, filter]);

  useEffect(() => {
    if (authed) fetchFeedback();
  }, [authed, filter, fetchFeedback]);

  async function handleResolve(id: number, resolved: boolean) {
    await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ resolved }),
    });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, resolved } : i)));
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this feedback?')) return;
    await fetch(`/api/feedback/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': key },
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setAuthed(true);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <h1 className="text-lg font-bold text-gray-700 mb-4">Feedback Inbox</h1>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin key"
            className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 text-sm"
          >
            Log in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-700">Feedback Inbox</h1>
        <button
          onClick={() => { setAuthed(false); setKey(''); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Log out
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {(['open', 'resolved', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={fetchFeedback}
          className="ml-auto px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No feedback yet.</p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className={`bg-white rounded-xl border p-4 ${item.resolved ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{item.message}</p>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleResolve(item.id, !item.resolved)}
                  className={`text-xs px-2 py-1 rounded ${
                    item.resolved
                      ? 'text-yellow-600 hover:bg-yellow-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  title={item.resolved ? 'Reopen' : 'Mark resolved'}
                >
                  {item.resolved ? 'Reopen' : 'Resolve'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-50"
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
              <span>{new Date(item.createdAt).toLocaleString()}</span>
              {item.page && <span>Tab: {item.page}</span>}
              {item.gameId && <span>Game: {item.gameId}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
