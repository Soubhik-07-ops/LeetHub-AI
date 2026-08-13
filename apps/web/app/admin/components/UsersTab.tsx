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
        <div style={{ color: '#94a3b8' }}>Loading users...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#0f172a' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Email / ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Joined</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Plan</th>
            </tr>
          </thead>
          <tbody>
            {data.map(u => {
              const sub = u.subscriptions?.[0];
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{u.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.id}</div>
                  </td>
                  <td style={{ padding: '1rem', color: '#94a3b8' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {sub?.status === 'active' ? (
                      <span style={{ backgroundColor: '#8b5cf6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Premium</span>
                    ) : (
                      <span style={{ backgroundColor: '#334155', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Free</span>
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
