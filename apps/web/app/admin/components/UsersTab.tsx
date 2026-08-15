import React, { useEffect, useState } from 'react';

export default function UsersTab({ session }: { session: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchUsers = async (p = 1, s = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/users?page=${p}&limit=20${s ? `&search=${encodeURIComponent(s)}` : ''}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const d = await res.json();
      setData(d.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [session, page]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Search by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchUsers(1, search)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white', width: '300px' }}
        />
        <button onClick={() => fetchUsers(1, search)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}>
          Search
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
           {[1,2,3].map(i => <div key={i} style={{ height: '60px', background: 'var(--bg-surface)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <table className="responsiveTable" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>User</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Joined</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Plan</th>
            </tr>
          </thead>
          <tbody>
            {data.map(u => {
              const sub = u.subscriptions?.[0];
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td data-label="User" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.email}</div>
                  </td>
                  <td data-label="Joined" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td data-label="Plan" style={{ padding: '1rem' }}>
                    {sub?.status === 'active' ? (
                      <span style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Premium</span>
                    ) : (
                      <span style={{ backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Free</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: '#334155', color: 'white', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
        <span style={{ padding: '0.5rem' }}>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: '#334155', color: 'white', border: 'none', cursor: 'pointer' }}>Next</button>
      </div>
    </div>
  );
}
