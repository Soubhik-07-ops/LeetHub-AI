import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './AdminLayout.module.css';
import sidebarStyles from '../../../components/Layout/Sidebar.module.css';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className={sidebarStyles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarStyles.sidebar} ${mobileMenuOpen ? sidebarStyles.open : ''}`} style={{ width: '250px' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>LeetBranch Admin</h2>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                textAlign: 'left',
                padding: '0.625rem 0.75rem',
                borderRadius: '6px',
                background: activeTab === tab ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? '600' : '500',
                transition: 'all 0.2s ease',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
          <div style={{ color: 'var(--text-primary)', marginBottom: '1rem', wordBreak: 'break-all', fontWeight: '500', padding: '0 0.5rem' }}>
            {session?.user?.email}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '0.5rem', cursor: 'pointer', marginBottom: '0.25rem', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            ← Back to App
          </button>
          <button
            onClick={handleSignOut}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--status-error)', padding: '0.5rem', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Top Header */}
        <header className={styles.topHeader}>
          <button
            className={styles.menuBtn}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Admin Menu"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>{activeTab}</h1>
        </header>

        <div className={styles.pageContainer}>
          <div className={styles.pageContent}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
