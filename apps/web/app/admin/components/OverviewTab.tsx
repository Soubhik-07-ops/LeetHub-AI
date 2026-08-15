import React, { useEffect, useState } from 'react';

export default function OverviewTab({ session }: { session: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading overview metrics...</div>;
  if (!stats) return <div style={{ color: '#ef4444' }}>Failed to load metrics.</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard title="Total Users" value={stats.total_users} color="var(--accent-primary)" />
        <StatCard title="Active Premium" value={stats.premium_users} color="var(--accent-secondary)" />
        <StatCard title="Approved Payments" value={stats.approved_payments} color="var(--status-success)" />
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Operational Metrics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <StatCard title="Free Users" value={stats.free_users} color="var(--text-secondary)" />
        <StatCard title="Pending Payments" value={stats.pending_payments} color="var(--status-warning)" />
        <StatCard title="Rejected Payments" value={stats.rejected_payments} color="var(--status-error)" />
        <StatCard title="AI Requests (Today)" value={stats.ai_requests_today} color="#06b6d4" />
        <StatCard title="AI Requests (Month)" value={stats.ai_requests_month} color="#0ea5e9" />
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: number, color: string }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>{title}</h3>
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem', color }}>
        {value}
      </div>
    </div>
  );
}
