import React from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  email: string | undefined;
  onSignOut: () => void;
  isOpen?: boolean;
}

const Icons = {
  Dashboard: () => <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Analytics: () => <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  AskAI: () => <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Integrations: () => <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>,
};

export default function Sidebar({ currentTab, onTabChange, email, onSignOut, isOpen = false }: SidebarProps) {
  const tabs = [
    { id: 'OVERVIEW', label: 'Dashboard', icon: Icons.Dashboard },
    { id: 'ANALYTICS', label: 'Analytics', icon: Icons.Analytics },
    { id: 'ASK_AI', label: 'Ask AI Coach', icon: Icons.AskAI },
    { id: 'INTEGRATIONS', label: 'Integrations', icon: Icons.Integrations },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.logoContainer}>
        <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        <span className={styles.logoText}>LeetBranch</span>
      </div>

      <nav className={styles.nav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.navItem} ${currentTab === tab.id ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userProfile}>
          <span className={styles.userEmail}>{email}</span>
          <button onClick={onSignOut} className={styles.signOutBtn}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
