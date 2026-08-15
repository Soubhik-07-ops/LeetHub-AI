"use client";
import { useState, useEffect } from "react";
import styles from "../../app/Analytics.module.css"; // Reuse analytics styles for consistency

export default function BillingPanel({ token, usage }: { token: string, usage: any }) {
  const [config, setConfig] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [upiRef, setUpiRef] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [userNote, setUserNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const fetchStatus = async () => {
    try {
      const [confRes, statRes] = await Promise.all([
        fetch("/api/v1/billing/config", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/v1/billing/status", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (confRes.ok) setConfig(await confRes.json());
      if (statRes.ok) setStatus(await statRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProof(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/billing/upload-proof', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setProofUrl(data.url);
      } else {
        alert("Failed to upload screenshot.");
      }
    } catch (err) {
      alert("Error uploading screenshot.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/billing/payment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ upi_reference: upiRef, user_note: userNote, proof_url: proofUrl })
      });
      if (res.ok) {
        setShowModal(false);
        fetchStatus();
      } else {
        const d = await res.json();
        alert(d.detail || "Failed to submit request.");
      }
    } catch (e: any) {
      alert("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ color: "#94a3b8" }}>Loading billing info...</div>;

  const isActive = status?.active_subscription;
  const latestReq = status?.latest_payment_request;
  const isPending = latestReq?.status === "pending";
  const isRejected = latestReq?.status === "rejected";

  return (
    <div className={styles.chartContainer} style={{ gridColumn: "1 / -1", minHeight: 'auto' }}>
      <div className={styles.chartHeader}>Membership & AI Usage</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '2rem', marginTop: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px', minWidth: 0 }}>
        {/* Left Side: AI Usage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'capitalize', color: isActive ? '#10b981' : '#cbd5e1' }}>
              {usage?.plan || 'Free'} Plan Usage
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
              <span>Analysis</span>
              <span>{usage?.analysis?.used} / {usage?.analysis?.limit} {usage?.analysis?.period === 'daily' ? 'today' : 'this month'}</span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#334155', height: '8px', borderRadius: '4px', marginTop: '4px' }}>
              <div style={{ width: `${Math.min(100, ((usage?.analysis?.used || 0) / (usage?.analysis?.limit || 1)) * 100)}%`, backgroundColor: (usage?.analysis?.used || 0) >= (usage?.analysis?.limit || 1) ? '#ef4444' : '#3b82f6', height: '100%', borderRadius: '4px' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
              <span>Chat</span>
              <span>{usage?.chat?.used} / {usage?.chat?.limit} {usage?.chat?.period === 'daily' ? 'today' : 'this month'}</span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#334155', height: '8px', borderRadius: '4px', marginTop: '4px' }}>
              <div style={{ width: `${Math.min(100, ((usage?.chat?.used || 0) / (usage?.chat?.limit || 1)) * 100)}%`, backgroundColor: (usage?.chat?.used || 0) >= (usage?.chat?.limit || 1) ? '#ef4444' : '#10b981', height: '100%', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>

        {/* Right Side: Billing Status */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {isActive ? (
            <div>
              <h3 style={{ color: '#10b981', margin: '0 0 1rem 0' }}>🟢 PREMIUM ACTIVE</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: '#cbd5e1' }}>
                <div><strong>Plan:</strong> ₹{config?.price || 69}/month</div>
                <div><strong>Active until:</strong> {new Date(isActive.current_period_end).toLocaleDateString()}</div>
                <div><strong>Status:</strong> <span style={{color: '#10b981'}}>Active</span></div>
              </div>
            </div>
          ) : isPending ? (
            <div>
              <h3 style={{ color: '#f59e0b', margin: '0 0 1rem 0' }}>🟡 PAYMENT VERIFICATION PENDING</h3>
              <p style={{ color: '#cbd5e1' }}>Your payment request is currently being verified by an admin.</p>
              <div style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                <div><strong>Transaction ID:</strong> {latestReq.upi_reference}</div>
                <div><strong>Submitted:</strong> {new Date(latestReq.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ) : isRejected ? (
            <div>
              <h3 style={{ color: '#ef4444', margin: '0 0 1rem 0' }}>🔴 PAYMENT REJECTED</h3>
              <p style={{ color: '#cbd5e1' }}>Your previous payment request was rejected.</p>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '1rem' }}>Reason: {latestReq.admin_note || 'Could not verify transaction.'}</p>
              <button 
                onClick={() => setShowModal(true)} 
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Submit New Payment
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ color: '#cbd5e1', margin: '0 0 0.5rem 0' }}>Upgrade your plan</h3>
              <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Get Premium for ₹{config?.price || 69}/month to unlock unlimited AI Developer Coach features.</p>
              <button 
                onClick={() => setShowModal(true)} 
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Upgrade to Premium
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && config && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)} style={{ zIndex: 1000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '500px', margin: '10vh auto' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Upgrade to Premium - ₹{config?.price || 69}/month</div>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className={styles.modalBody} style={{ textAlign: 'center' }}>
              <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>{config.description}</p>
              
              <div style={{ 
                backgroundColor: config.qr_url ? 'transparent' : 'white', 
                padding: config.qr_url ? '0' : '1rem', 
                display: 'flex', 
                justifyContent: 'center',
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                width: '100%'
              }}>
                <img 
                  src={config.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${config.upi_id}&pn=${encodeURIComponent(config.display_name)}&am=${config.price || 69}.00&cu=INR`} 
                  alt="UPI QR Code" 
                  style={config.qr_url 
                    ? { maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px' } 
                    : { width: '200px', height: '200px' }
                  }
                />
              </div>
              
              <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                {config.upi_id}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>Pay ₹{config?.price || 69} using any UPI app</p>
              
              <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Transaction / UTR ID *</label>
                  <input 
                    type="text" 
                    required 
                    minLength={6}
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
                    placeholder="12-digit UPI reference number"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Payment Screenshot *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleProofUpload}
                      disabled={uploadingProof}
                      style={{ color: '#cbd5e1' }}
                    />
                    {uploadingProof && <span style={{ color: '#8b5cf6', fontSize: '0.875rem' }}>Uploading...</span>}
                  </div>
                  {proofUrl && (
                    <div style={{ marginTop: '0.5rem', color: '#10b981', fontSize: '0.875rem', fontWeight: 'bold' }}>
                      ✓ Screenshot uploaded
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Note (Optional)</label>
                  <input 
                    type="text" 
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
                    placeholder="E.g., Paid via PhonePe"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submitting || upiRef.length < 6 || !proofUrl}
                  style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', backgroundColor: submitting ? '#475569' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: (submitting || !proofUrl) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  {submitting ? 'Submitting...' : 'Submit Payment for Review'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
