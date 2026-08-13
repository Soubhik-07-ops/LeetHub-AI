import React from 'react';
import { supabase } from '@/lib/supabase';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: any;
}

const TABS = [
  'Dashboard',
  'Users',
  'Payments',
  'Subscriptions',
  'AI Usage',
  'Settings',
  'Audit Logs'
];

export default function AdminLayout({ children, activeTab, setActiveTab, session }: AdminLayoutProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#3b82f6' }}>LeetHub-AI Admin</h2>
        </div>
        
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                background: activeTab === tab ? '#334155' : 'transparent',
                color: activeTab === tab ? '#f8fafc' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
        
        <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid #334155', fontSize: '0.875rem' }}>
          <div style={{ color: '#94a3b8', marginBottom: '1rem', wordBreak: 'break-all' }}>
            {session?.user?.email}
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#94a3b8', padding: '0.5rem 0', cursor: 'pointer', marginBottom: '0.5rem' }}
          >
            ← Back to App
          </button>
          <button 
            onClick={handleSignOut}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', padding: '0.5rem 0', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{ height: '70px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 2rem', backgroundColor: '#1e293b' }}>
          <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '600' }}>{activeTab}</h1>
        </header>
        
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
