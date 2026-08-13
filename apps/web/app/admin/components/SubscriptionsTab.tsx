import React, { useEffect, useState } from 'react';

export default function SubscriptionsTab({ session }: { session: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchSubscriptions = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/subscriptions?page=${p}&limit=20`, {
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
    fetchSubscriptions(page);
  }, [session, page]);

  return (
    <div>
      {loading ? (
        <div style={{ color: '#94a3b8' }}>Loading subscriptions...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#0f172a' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>User Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Plan ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Start Date</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '1rem' }}>{s.user?.email || s.user_id}</td>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{s.plan_id}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: s.status === 'active' ? '#10b981' : '#64748b'
                  }}>
                    {s.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{new Date(s.current_period_start).toLocaleDateString()}</td>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{new Date(s.current_period_end).toLocaleDateString()}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No subscriptions found.</td>
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
