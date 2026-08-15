import React, { useEffect, useState } from 'react';

export default function SettingsTab({ session }: { session: any }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upiSettings, setUpiSettings] = useState({
    upi_id: '',
    display_name: '',
    description: '',
    price: 69,
    qr_url: ''
  });
  const [uploadingQR, setUploadingQR] = useState(false);

  useEffect(() => {
    fetch('/api/v1/admin/settings', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.upi_config) {
          setUpiSettings(data.upi_config);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/upi_config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(upiSettings)
      });
      if (res.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings.");
      }
    } catch (e) {
      alert("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQR(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/admin/settings/upload-qr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setUpiSettings({ ...upiSettings, qr_url: data.url });
      } else {
        alert("Failed to upload QR code.");
      }
    } catch (err) {
      alert("Error uploading QR code.");
    } finally {
      setUploadingQR(false);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Payment Settings (UPI)</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Premium Price (₹)</label>
            <input
              type="number"
              value={upiSettings.price || 69}
              onChange={e => setUpiSettings({...upiSettings, price: Number(e.target.value)})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>UPI ID</label>
            <input
              type="text"
              value={upiSettings.upi_id}
              onChange={e => setUpiSettings({...upiSettings, upi_id: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Display Name</label>
            <input
              type="text"
              value={upiSettings.display_name}
              onChange={e => setUpiSettings({...upiSettings, display_name: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description</label>
            <input
              type="text"
              value={upiSettings.description}
              onChange={e => setUpiSettings({...upiSettings, description: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Custom QR Code</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleQRUpload}
                disabled={uploadingQR}
                style={{ color: 'var(--text-secondary)', padding: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: '6px', width: '100%' }}
              />
              {uploadingQR && <span style={{ color: 'var(--accent-secondary)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Uploading...</span>}
            </div>
            {upiSettings.qr_url && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                <img src={upiSettings.qr_url} alt="QR Code Preview" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                <button
                  onClick={() => setUpiSettings({...upiSettings, qr_url: ''})}
                  style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  Remove QR Code
                </button>
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
              If no QR code is uploaded, a generic one will be generated based on your UPI ID and Amount.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '1rem', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '1rem', transition: 'background-color 0.2s'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
