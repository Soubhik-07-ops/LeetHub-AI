"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Analytics from "./Analytics";
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
        <main className={styles.main} style={{ display: 'flex', alignItems: 'center' }}>
          <div className={styles.centeredCard}>
            <h1 className={styles.centeredTitle}>Email Verification Required</h1>
            <p className={styles.centeredText}>
              Please verify your email address (<span className={styles.verifyEmailHighlight}>{session.user?.email}</span>) to access the dashboard.
            </p>
            <p className={styles.centeredText} style={{ fontSize: '0.875rem' }}>
              Check your inbox for a verification link.
            </p>
            <button 
              onClick={handleLogout}
              className={styles.signOutBtn}
              style={{ marginTop: '1rem' }}
            >
              Sign Out
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>LeetHub-AI Dashboard</h1>
        <div className={styles.userInfo}>
          <span className={styles.email}>{session.user.email}</span>
          <button 
            onClick={handleLogout}
            className={styles.signOutBtn}
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Analytics session={session} />
        <Integrations session={session} />
      </main>
    </div>
  );
}
