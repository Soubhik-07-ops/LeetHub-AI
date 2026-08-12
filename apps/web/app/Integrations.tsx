"use client";
import { useState, useEffect } from "react";
import styles from "./Integrations.module.css";

export default function Integrations({ session }: { session: any }) {
  const [extStatus, setExtStatus] = useState<any>(null);
  const [pairingCode, setPairingCode] = useState("");
  
  const [ghConfig, setGhConfig] = useState<any>(null);
  const [ghRepos, setGhRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  const fetchState = async () => {
    try {
      const r = await fetch("/api/v1/extension/status", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setExtStatus(d);
        if (d.connected) {
          setPairingCode("");
          setMsg("");
          setTimeLeft(0);
        }
      }
    } catch (e) {}

    try {
      const r = await fetch("/api/v1/integrations/github/connection", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      if (r.ok) {
        const d = await r.json();
        if (d && !d.detail) {
          setGhConfig(d);
          setSelectedRepoId(d.repository_id || "");
          if (d.installation_id) {
            const r2 = await fetch("/api/v1/integrations/github/repositories", {
              headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            if (r2.ok) {
              const repos = await r2.json();
              setGhRepos(repos);
            }
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchState();
  }, [session]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pairingCode && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
        // Also poll status while code is active
        if (timeLeft % 5 === 0) fetchState();
      }, 1000);
    } else if (timeLeft === 0 && pairingCode) {
      setPairingCode("");
      setMsg("Pairing code expired. Please generate a new one.");
    }
    return () => clearInterval(interval);
  }, [pairingCode, timeLeft]);

  const generateCode = async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/v1/extension/pairing-code", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const d = await r.json();
      if (r.ok) {
        setPairingCode(d.code);
        setTimeLeft(600); // 10 minutes
        setMsg("");
      } else {
        setMsg("Error generating code: " + d.detail);
      }
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
    setLoading(false);
  };

  const disconnectExtension = async () => {
    setLoading(true);
    try {
      await fetch("/api/v1/extension/disconnect", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      setExtStatus({ connected: false });
      setPairingCode("");
      setMsg("Extension disconnected.");
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
    setLoading(false);
  };

  const connectGithub = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/integrations/github/install", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        setMsg(d.detail || "Error connecting to GitHub.");
      }
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
    setLoading(false);
  };

  const saveGithub = async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/v1/integrations/github/connection", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repository_id: selectedRepoId,
          default_branch: "main"
        })
      });
      const d = await r.json();
      if (r.ok) {
        setGhConfig(d);
        setMsg("GitHub repository linked successfully.");
      } else {
        setMsg("Error saving config: " + d.detail);
      }
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
    setLoading(false);
  };

  const disconnectGithub = async () => {
    setLoading(true);
    try {
      await fetch("/api/v1/integrations/github/connection", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      setGhConfig(null);
      setGhRepos([]);
      setMsg("GitHub disconnected.");
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Integrations</h2>
      <div className={styles.cardsGrid}>
        
        {/* Extension Connection */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Chrome Extension</h3>
          <p className={styles.cardDesc}>
            Securely connect your LeetHub-AI extension to this account.
          </p>
          <div className={styles.contentWrapper}>
            {extStatus?.connected ? (
               <div>
                 <div className={styles.statusSuccess}>✓ Extension Connected</div>
                 <button 
                  onClick={disconnectExtension} 
                  disabled={loading}
                  className={styles.btnDanger}
                >
                  Disconnect
                </button>
               </div>
            ) : pairingCode ? (
              <div>
                <div className={styles.pairingCodeBox}>
                  <div className={styles.pairingCode}>{pairingCode}</div>
                  <div style={{ marginTop: '12px', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Expires in {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                <button 
                  onClick={generateCode} 
                  disabled={loading}
                  className={styles.btnSecondary}
                >
                  Generate New Code
                </button>
              </div>
            ) : (
              <button 
                onClick={generateCode} 
                disabled={loading}
                className={styles.btnPrimary}
              >
                Generate Pairing Code
              </button>
            )}
          </div>
        </div>

        {/* GitHub Connection */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>GitHub Repository</h3>
          <p className={styles.cardDesc}>
            Configure your personal repository for automated syncing via GitHub App.
          </p>
          
          <div className={styles.contentWrapper}>
            {!ghConfig?.installation_id ? (
               <button 
                onClick={connectGithub}
                disabled={loading}
                className={styles.btnPrimary}
              >
                Connect GitHub
              </button>
            ) : (
              <>
                <div className={styles.statusSuccess}>
                  ✓ GitHub App Installed ({ghConfig.github_account_login})
                </div>
                <select 
                  value={selectedRepoId} 
                  onChange={e => setSelectedRepoId(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="" disabled>Select a repository to sync to</option>
                  {ghRepos.map(r => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
                <div className={styles.buttonGroup} style={{ marginTop: '1rem' }}>
                  <button 
                    onClick={saveGithub}
                    disabled={loading || !selectedRepoId}
                    className={styles.btnPrimary}
                  >
                    Save Repository
                  </button>
                  <button 
                    onClick={disconnectGithub}
                    disabled={loading}
                    className={styles.btnDanger}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
      {msg && <div className={styles.globalMessage}>{msg}</div>}
    </div>
  );
}
