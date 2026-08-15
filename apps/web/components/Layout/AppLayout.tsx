"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import styles from './AppLayout.module.css';
import sidebarStyles from './Sidebar.module.css';

interface AppLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
  email: string | undefined;
  onSignOut: () => void;
}

export default function AppLayout({ children, currentTab, onTabChange, email, onSignOut }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
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

  return (
    <div className={styles.layout}>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className={sidebarStyles.mobileOverlay} 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - rendered directly to avoid wrapper duplication */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={handleTabChange} 
        email={email} 
        onSignOut={onSignOut} 
        isOpen={mobileMenuOpen}
      />

      <div className={styles.mainContent}>
        <header className={styles.mobileHeader}>
          <div className={styles.mobileLogo}>LeetBranch</div>
          <button 
            className={styles.menuBtn}
            onClick={() => setMobileMenuOpen(true)}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </header>
        
        <main className={styles.pageContainer} style={{ minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
