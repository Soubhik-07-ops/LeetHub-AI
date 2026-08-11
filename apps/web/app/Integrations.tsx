"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";

export default function Integrations({ session }: { session: any }) {
  const [extStatus, setExtStatus] = useState<any>(null);
  const [pairingCode, setPairingCode] = useState("");
  
  const [ghConfig, setGhConfig] = useState<any>(null);
  const [ghRepos, setGhRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchState = () => {
    fetch("/api/v1/extension/status", {
      headers: { "Authorization": `Bearer ${session.access_token}` }
    })
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d) setExtStatus(d);
    });

    fetch("/api/v1/integrations/github/connection", {
      headers: { "Authorization": `Bearer ${session.access_token}` }
    })
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d && !d.detail) {
        setGhConfig(d);
        setSelectedRepoId(d.repository_id || "");
        if (d.installation_id) {
          fetch("/api/v1/integrations/github/repositories", {
            headers: { "Authorization": `Bearer ${session.access_token}` }
          })
          .then(r2 => r2.ok ? r2.json() : [])
          .then(repos => setGhRepos(repos));
        }
      }
    });
  };

  useEffect(() => {
    fetchState();
  }, [session]);

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
        setMsg("Enter this code in the extension popup within 10 minutes.");
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
    <div className={styles.section} style={{ marginTop: '32px' }}>
      <h2>Integrations</h2>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Extension Connection */}
        <div className={styles.card} style={{ flex: 1, minWidth: '300px' }}>
          <h3>Chrome Extension</h3>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>
            Securely connect your LeetHub-AI extension to this account.
          </p>
          {extStatus?.connected ? (
             <div style={{ textAlign: 'center' }}>
               <div style={{ color: '#3fb950', fontWeight: 'bold', marginBottom: '16px' }}>✓ Extension Connected</div>
               <button 
                onClick={disconnectExtension} 
                disabled={loading}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#da3633', color: '#fff', border: 'none', borderRadius: '6px' }}
              >
                Disconnect
              </button>
             </div>
          ) : pairingCode ? (
            <div style={{ textAlign: 'center', padding: '16px', background: '#161b22', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', letterSpacing: '4px', fontWeight: 'bold' }}>{pairingCode}</div>
              <button 
                onClick={generateCode} 
                disabled={loading}
                style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px' }}
              >
                Generate New Code
              </button>
            </div>
          ) : (
            <button 
              onClick={generateCode} 
              disabled={loading}
              style={{ padding: '8px 16px', cursor: 'pointer', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px' }}
            >
              Generate Pairing Code
            </button>
          )}
        </div>

        {/* GitHub Connection */}
        <div className={styles.card} style={{ flex: 1, minWidth: '300px' }}>
          <h3>GitHub Repository</h3>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>
            Configure your personal repository for automated syncing via GitHub App.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!ghConfig?.installation_id ? (
               <button 
                onClick={connectGithub}
                disabled={loading}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px' }}
              >
                Connect GitHub
              </button>
            ) : (
              <>
                <div style={{ color: '#3fb950', fontWeight: 'bold' }}>✓ GitHub App Installed ({ghConfig.github_account_login})</div>
                <select 
                  value={selectedRepoId} 
                  onChange={e => setSelectedRepoId(e.target.value)}
                  style={{ padding: '8px', background: '#161b22', border: '1px solid #30363d', color: '#fff', borderRadius: '4px', marginTop: '8px' }}
                >
                  <option value="" disabled>Select a repository to sync to</option>
                  {ghRepos.map(r => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={saveGithub}
                    disabled={loading || !selectedRepoId}
                    style={{ flex: 1, padding: '8px 16px', cursor: 'pointer', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px' }}
                  >
                    Save Repository
                  </button>
                  <button 
                    onClick={disconnectGithub}
                    disabled={loading}
                    style={{ padding: '8px 16px', cursor: 'pointer', background: '#da3633', color: '#fff', border: 'none', borderRadius: '6px' }}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
      {msg && <div style={{ marginTop: '16px', color: '#58a6ff', fontSize: '14px' }}>{msg}</div>}
    </div>
  );
}
