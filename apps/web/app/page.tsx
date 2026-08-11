"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Integrations from "./Integrations";
import styles from "./page.module.css";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return <div className={styles.page}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  // Check Email Verification
  if (!session.user?.email_confirmed_at) {
    return (
      <div className={styles.page}>
        <main className={styles.main} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '40px', background: '#161b22', borderRadius: '8px', border: '1px solid #30363d' }}>
            <h1 style={{ color: '#fff', marginBottom: '16px' }}>Email Verification Required</h1>
            <p style={{ color: '#8b949e', marginBottom: '24px' }}>
              Please verify your email address ({session.user?.email}) to access the dashboard.
            </p>
            <p style={{ color: '#8b949e', marginBottom: '24px', fontSize: '14px' }}>
              Check your inbox for a verification link.
            </p>
            <button 
              onClick={handleLogout}
              style={{ padding: '8px 16px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d', paddingBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#fff' }}>LeetHub-AI Dashboard</h1>
        <div>
          <span style={{ color: '#8b949e', marginRight: '16px' }}>{session.user.email}</span>
          <button 
            onClick={handleLogout}
            style={{ padding: '6px 12px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <main style={{ marginTop: '40px' }}>
        <Integrations session={session} />
      </main>
    </div>
  );
}
