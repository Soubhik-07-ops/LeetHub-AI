import React, { useEffect, useState } from 'react';

export default function AuditLogsTab({ session }: { session: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/logs?page=${p}&limit=20`, {
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
    fetchLogs(page);
  }, [session, page]);

  return (
    <div>
      {loading ? (
        <div style={{ color: '#94a3b8' }}>Loading audit logs...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#0f172a' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Timestamp</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Admin</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Action</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Target</th>
            </tr>
          </thead>
          <tbody>
            {data.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString()}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{log.admin?.email || log.admin_user_id}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: log.action.includes('reject') ? '#7f1d1d' : log.action.includes('approve') ? '#064e3b' : '#1e3a8a',
                    color: log.action.includes('reject') ? '#fca5a5' : log.action.includes('approve') ? '#6ee7b7' : '#93c5fd'
                  }}>
                    {log.action.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                  <div><span style={{ color: '#64748b' }}>Type:</span> {log.target_type}</div>
                  <div><span style={{ color: '#64748b' }}>ID:</span> {log.target_id}</div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No logs found.</td>
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
