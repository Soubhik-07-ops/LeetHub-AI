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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
      <StatCard title="Total Users" value={stats.total_users} color="#3b82f6" />
      <StatCard title="Active Premium" value={stats.premium_users} color="#8b5cf6" />
      <StatCard title="Free Users" value={stats.free_users} color="#94a3b8" />
      <StatCard title="Pending Payments" value={stats.pending_payments} color="#f59e0b" />
      <StatCard title="Approved Payments" value={stats.approved_payments} color="#10b981" />
      <StatCard title="Rejected Payments" value={stats.rejected_payments} color="#ef4444" />
      <StatCard title="AI Requests (Today)" value={stats.ai_requests_today} color="#06b6d4" />
      <StatCard title="AI Requests (Month)" value={stats.ai_requests_month} color="#0ea5e9" />
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: number, color: string }) {
  return (
    <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
      <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>{title}</h3>
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem', color }}>
        {value}
      </div>
    </div>
  );
}
