import React, { useEffect, useState } from 'react';

export default function PaymentsTab({ session }: { session: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPayments = async (p = 1, stat = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/payments?page=${p}&limit=20${stat ? `&status=${stat}` : ''}`, {
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
    fetchPayments(page, statusFilter);
  }, [session, page, statusFilter]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/admin/payments/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ admin_note: adminNote })
      });
      if (res.ok) {
        setAdminNote("");
        fetchPayments(page, statusFilter);
      } else {
        const d = await res.json();
        alert(d.detail || "Action failed");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8' }}>Loading payments...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#0f172a' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>User Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Amount</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Transaction / UTR</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Submitted</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #334155' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '1rem' }}>{p.user?.email || p.user_id}</td>
                <td style={{ padding: '1rem' }}>₹{p.amount / 100}</td>
                <td style={{ padding: '1rem' }}>
                  <div>{p.upi_reference}</div>
                  {p.proof_url && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.75rem', textDecoration: 'none' }}>View Screenshot</a>
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: p.status === 'pending' ? '#f59e0b' : p.status === 'approved' ? '#10b981' : '#ef4444'
                  }}>
                    {p.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {p.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                      <input 
                        type="text" 
                        placeholder="Admin Note (optional)"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '0.75rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          disabled={actionLoading === p.id}
                          onClick={() => handleAction(p.id, 'approve')}
                          style={{ padding: '0.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1, fontSize: '0.75rem' }}>
                          Approve
                        </button>
                        <button 
                          disabled={actionLoading === p.id}
                          onClick={() => handleAction(p.id, 'reject')}
                          style={{ padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1, fontSize: '0.75rem' }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                  {p.status !== 'pending' && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.admin_note || "No notes"}</span>}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No payment requests found.</td>
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
