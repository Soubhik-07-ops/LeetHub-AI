"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AdminGuard from "../../components/AdminGuard";
import AdminLayout from "./components/AdminLayout";
import OverviewTab from "./components/OverviewTab";
import UsersTab from "./components/UsersTab";
import PaymentsTab from "./components/PaymentsTab";
import SubscriptionsTab from "./components/SubscriptionsTab";
import AIUsageTab from "./components/AIUsageTab";
import SettingsTab from "./components/SettingsTab";
import AuditLogsTab from "./components/AuditLogsTab";

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  if (!session) return null;

  return (
    <AdminGuard session={session}>
      <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab} session={session}>
        {activeTab === 'Dashboard' && <OverviewTab session={session} />}
        {activeTab === 'Users' && <UsersTab session={session} />}
        {activeTab === 'Payments' && <PaymentsTab session={session} />}
        {activeTab === 'Subscriptions' && <SubscriptionsTab session={session} />}
        {activeTab === 'AI Usage' && <AIUsageTab session={session} />}
        {activeTab === 'Settings' && <SettingsTab session={session} />}
        {activeTab === 'Audit Logs' && <AuditLogsTab session={session} />}
      </AdminLayout>
    </AdminGuard>
  );
}
