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
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
           {[1,2,3].map(i => <div key={i} style={{ height: '60px', background: 'var(--bg-surface)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <table className="responsiveTable" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Timestamp</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Admin</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Action</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Target</th>
            </tr>
          </thead>
          <tbody>
            {data.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="Time" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString('en-GB')}</td>
                <td data-label="Admin" style={{ padding: '1rem', fontWeight: '500', overflowWrap: 'anywhere' }}>{log.admin?.email || log.admin_user_id}</td>
                <td data-label="Action" style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: log.action.includes('reject') ? 'rgba(239, 68, 68, 0.1)' : log.action.includes('approve') ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface-hover)',
                    color: log.action.includes('reject') ? 'var(--status-error)' : log.action.includes('approve') ? 'var(--status-success)' : 'var(--text-primary)'
                  }}>
                    {log.action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </td>
                <td data-label="Target" style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', overflowWrap: 'anywhere' }}>
                  <div style={{ fontFamily: 'monospace' }}>Type: {log.target_type}</div>
                  <div style={{ fontFamily: 'monospace' }}>ID: {log.target_id.slice(0, 8)}...</div>
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
