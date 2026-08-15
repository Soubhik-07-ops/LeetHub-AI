import React, { useEffect, useState } from 'react';

export default function PaymentsTab({ session }: { session: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{id: string, action: 'approve' | 'reject'} | null>(null);

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
      setConfirmModal(null);
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
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
           {[1,2,3].map(i => <div key={i} style={{ height: '60px', background: 'var(--bg-surface)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <table className="responsiveTable" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>User Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Amount</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Transaction / UTR</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Submitted</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="User" style={{ padding: '1rem', overflowWrap: 'anywhere' }}>{p.user?.email || p.user_id}</td>
                <td data-label="Amount" style={{ padding: '1rem' }}>₹{p.amount / 100}</td>
                <td data-label="Transaction" style={{ padding: '1rem', overflowWrap: 'anywhere' }}>
                  <div style={{ fontFamily: 'monospace' }}>{p.upi_reference}</div>
                  {p.proof_url && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 600 }}>View Screenshot</a>
                    </div>
                  )}
                </td>
                <td data-label="Submitted" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td data-label="Status" style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: p.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : p.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: p.status === 'pending' ? 'var(--status-warning)' : p.status === 'approved' ? 'var(--status-success)' : 'var(--status-error)'
                  }}>
                    {p.status.toUpperCase()}
                  </span>
                </td>
                <td data-label="Actions" style={{ padding: '1rem' }}>
                  {p.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                      <input
                        type="text"
                        placeholder="Admin Note (optional)"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'white', fontSize: '0.75rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          disabled={actionLoading === p.id}
                          onClick={() => setConfirmModal({id: p.id, action: 'approve'})}
                          style={{ padding: '0.5rem', backgroundColor: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                          Approve
                        </button>
                        <button
                          disabled={actionLoading === p.id}
                          onClick={() => setConfirmModal({id: p.id, action: 'reject'})}
                          style={{ padding: '0.5rem', backgroundColor: 'var(--status-error)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                  {p.status !== 'pending' && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.admin_note || "No notes"}</span>}
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

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem' }}>Confirm Action</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to <strong>{confirmModal.action}</strong> this payment? This action is irreversible.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                disabled={actionLoading === confirmModal.id}
                onClick={() => handleAction(confirmModal.id, confirmModal.action)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: confirmModal.action === 'approve' ? 'var(--status-success)' : 'var(--status-error)',
                  color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                }}
              >
                {actionLoading === confirmModal.id ? 'Processing...' : `Yes, ${confirmModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
