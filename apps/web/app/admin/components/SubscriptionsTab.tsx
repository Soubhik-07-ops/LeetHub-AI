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
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
           {[1,2,3].map(i => <div key={i} style={{ height: '60px', background: 'var(--bg-surface)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <table className="responsiveTable" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>User Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Plan</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Start Date</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="User" style={{ padding: '1rem', overflowWrap: 'anywhere' }}>{s.user?.email || s.user_id}</td>
                <td data-label="Plan" style={{ padding: '1rem', color: 'var(--accent-secondary)', fontWeight: 500 }}>Premium</td>
                <td data-label="Status" style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: s.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface-hover)',
                    color: s.status === 'active' ? 'var(--status-success)' : 'var(--text-secondary)'
                  }}>
                    {s.status.toUpperCase()}
                  </span>
                </td>
                <td data-label="Start" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  {new Date(s.current_period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td data-label="Expiry" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  {new Date(s.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
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
