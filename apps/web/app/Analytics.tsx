"use client";
import { useState, useEffect } from "react";
import styles from "./Analytics.module.css";

export default function Analytics({ session }: { session: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/analytics/overview", {
      headers: { "Authorization": `Bearer ${session.access_token}` }
    })
    .then(r => {
      if (!r.ok) throw new Error("Failed to load analytics");
      return r.json();
    })
    .then(d => {
      setData(d);
      setLoading(false);
    })
    .catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [session]);

  if (loading) return <div style={{ color: "#94a3b8" }}>Loading analytics...</div>;
  if (error) return <div style={{ color: "#ef4444" }}>{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className={styles.analyticsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Unique Problems</div>
          <div className={styles.statValue}>{data.unique_problems || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Acceptance Rate</div>
          <div className={styles.statValue}>{data.acceptance_rate || 0}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Current Streak</div>
          <div className={`${styles.statValue} ${data.current_streak > 0 ? styles.green : ''}`}>{data.current_streak || 0} 🔥</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Longest Streak</div>
          <div className={styles.statValue}>{data.longest_streak || 0} 🔥</div>
        </div>
      </div>

      {data.recent_submissions && data.recent_submissions.length > 0 && (
        <div className={styles.recentSection}>
          <h2 className={styles.recentTitle}>Recent Submissions</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>GitHub Sync</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_submissions.slice(0, 5).map((sub: any, i: number) => (
                  <tr key={i}>
                    <td>{sub.problemTitle || sub.problemSlug}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[sub.status.toLowerCase()] || ''}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[sub.githubSyncStatus?.toLowerCase()] || ''}`}>
                        {sub.githubSyncStatus || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
