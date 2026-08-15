import React, { useEffect, useState } from 'react';

export default function AIUsageTab({ session }: { session: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchUsage = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/usage?page=${p}&limit=20`, {
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
    fetchUsage(page);
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
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Daily Used</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Monthly Used</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Last Request</th>
            </tr>
          </thead>
          <tbody>
            {data.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="User" style={{ padding: '1rem' }}>{u.email || u.user_id}</td>
                <td data-label="Daily" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {u.current_plan === 'free' ? (
                      <>
                        <div style={{ width: '100px', height: '8px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((u.daily_used / (u.analysis_limit || 5)) * 100, 100)}%`, height: '100%', backgroundColor: u.daily_used >= (u.analysis_limit || 5) ? 'var(--status-error)' : 'var(--accent-primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.875rem' }}>{u.daily_used} / {u.analysis_limit || 5}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Unlimited</span>
                    )}
                  </div>
                </td>
                <td data-label="Monthly" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {u.current_plan === 'premium' ? (
                      <>
                        <div style={{ width: '100px', height: '8px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((u.monthly_used / (u.analysis_limit || 50)) * 100, 100)}%`, height: '100%', backgroundColor: u.monthly_used >= (u.analysis_limit || 50) ? 'var(--status-error)' : 'var(--accent-secondary)' }} />
                        </div>
                        <span style={{ fontSize: '0.875rem' }}>{u.monthly_used} / {u.analysis_limit || 50}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                    )}
                  </div>
                </td>
                <td data-label="Last Request" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  {u.last_request ? new Date(u.last_request).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No AI usage found.</td>
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
