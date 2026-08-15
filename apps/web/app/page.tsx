"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Analytics from "./Analytics";
import Integrations from "./Integrations";
import AppLayout from "../components/Layout/AppLayout";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("OVERVIEW");
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
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading LeetBranch...</div>;
  }

  if (!session) {
    return null;
  }

  // Check Email Verification
  if (!session.user?.email_confirmed_at) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
        <div style={{ padding: '3rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center', maxWidth: '480px' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>Email Verification Required</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Please verify your email address (<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{session.user?.email}</span>) to access the dashboard.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Check your inbox for a verification link.
          </p>
          <button
            onClick={handleLogout}
            style={{ padding: '0.625rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      currentTab={activeTab}
      onTabChange={setActiveTab}
      email={session.user.email}
      onSignOut={handleLogout}
    >
      {/* We pass the activeTab down to Analytics so it can split Dashboard/AskAI/Analytics.
          Wait, Analytics currently manages OVERVIEW and ASK_AI itself via a local tab.
          Let's pass the activeTab from the Sidebar into Analytics. */}

      <div style={{ display: (activeTab === 'OVERVIEW' || activeTab === 'ANALYTICS' || activeTab === 'ASK_AI') ? 'block' : 'none' }}>
         <Analytics session={session} externalTab={activeTab} />
      </div>

      <div style={{ display: activeTab === 'INTEGRATIONS' ? 'block' : 'none' }}>
         <Integrations session={session} />
      </div>

    </AppLayout>
  );
}
