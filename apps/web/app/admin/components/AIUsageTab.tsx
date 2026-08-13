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
        <div style={{ color: '#94a3b8' }}>Loading AI usage...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#0f172a' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>User Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Daily Used</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Monthly Used</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Last Request</th>
            </tr>
          </thead>
          <tbody>
            {data.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '1rem' }}>{u.email || u.user_id}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {u.current_plan === 'free' ? (
                      <>
                        <div style={{ width: '100px', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((u.daily_used / (u.analysis_limit || 5)) * 100, 100)}%`, height: '100%', backgroundColor: u.daily_used >= (u.analysis_limit || 5) ? '#ef4444' : '#0ea5e9' }} />
                        </div>
                        <span>{u.daily_used} / {u.analysis_limit || 5}</span>
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Unlimited</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {u.current_plan === 'premium' ? (
                      <>
                        <div style={{ width: '100px', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((u.monthly_used / (u.analysis_limit || 50)) * 100, 100)}%`, height: '100%', backgroundColor: u.monthly_used >= (u.analysis_limit || 50) ? '#ef4444' : '#3b82f6' }} />
                        </div>
                        <span>{u.monthly_used} / {u.analysis_limit || 50}</span>
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>N/A</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{u.last_request ? new Date(u.last_request).toLocaleDateString() : 'N/A'}</td>
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
