"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGuard({ children, session }: { children: React.ReactNode, session: any }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.access_token) {
      router.push("/");
      return;
    }

    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/v1/admin/dashboard", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (res.ok) {
          setAuthorized(true);
        } else {
          router.push("/");
        }
      } catch (e) {
        router.push("/");
      }
    };

    checkAdmin();
  }, [session, router]);

  if (authorized === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#cbd5e1' }}>Verifying admin access...</div>;
  }

  return <>{children}</>;
}
