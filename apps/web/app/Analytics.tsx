"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import styles from "./Analytics.module.css";
import AiCoachPanel from '../components/AiCoach/AiCoachPanel';
import BillingPanel from '../components/Billing/BillingPanel';
import DashboardChat from '../components/AiCoach/DashboardChat';

const DIFFICULTY_COLORS = {
  Easy: 'var(--status-success)',
  Medium: 'var(--status-warning)',
  Hard: 'var(--status-error)',
  Unclassified: 'var(--text-muted)'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function Analytics({ session, externalTab }: { session: any, externalTab: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'DETAILS' | 'AI_COACH'>('DETAILS');

  const [isMobile, setIsMobile] = useState(false);
  const [isVeryNarrow, setIsVeryNarrow] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsVeryNarrow(window.innerWidth < 480);
    };
    // Initialize on mount
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const headers = { "Authorization": `Bearer ${session.access_token}` };
        const [overviewRes, topicsRes, difficultyRes, languageRes, contestRes, heatmapRes, usageRes] = await Promise.all([
          fetch("/api/v1/analytics/overview", { headers }),
          fetch("/api/v1/analytics/intelligence/topics", { headers }),
          fetch("/api/v1/analytics/intelligence/difficulty", { headers }),
          fetch("/api/v1/analytics/intelligence/languages", { headers }),
          fetch("/api/v1/analytics/intelligence/contests", { headers }),
          fetch("/api/v1/analytics/intelligence/heatmap", { headers }),
          fetch("/api/v1/ai/usage", { headers })
        ]);

        if (!overviewRes.ok || !topicsRes.ok || !difficultyRes.ok || !languageRes.ok || !contestRes.ok || !heatmapRes.ok || !usageRes.ok) {
          throw new Error("Failed to load analytics data from server.");
        }

        setData({
          overview: await overviewRes.json(),
          topics: await topicsRes.json(),
          difficulty: await difficultyRes.json(),
          languages: await languageRes.json(),
          contests: await contestRes.json(),
          heatmap: await heatmapRes.json(),
          usage: await usageRes.json()
        });
        setLoading(false);
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    };
    fetchAll();
  }, [session]);

  const openModal = async (leetcodeId: string) => {
    setSelectedSubId(leetcodeId);
    setModalTab('DETAILS');
    setModalLoading(true);
    try {
      const headers = { "Authorization": `Bearer ${session.access_token}` };
      const res = await fetch(`/api/v1/analytics/submissions/${leetcodeId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch submission details");
      const subData = await res.json();
      setModalData(subData);
    } catch (e: any) {
      alert("Error loading details: " + e.message);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedSubId(null);
    setModalData(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ height: '40px', width: '200px', background: 'var(--bg-surface-hover)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '100px', background: 'var(--bg-surface-hover)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      </div>
    );
  }
  if (error) return (
    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)' }}>
      {error}
      <button onClick={() => window.location.reload()} style={{ display: 'block', marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--bg-surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>Try Again</button>
    </div>
  );
  if (!data) return null;

  const { overview, topics, difficulty, languages, contests, heatmap, usage } = data;

  const normalizedDifficulties = difficulty.difficulties.map((d: any) => ({
    ...d,
    difficulty: d.difficulty === 'Unknown' ? 'Unclassified' : d.difficulty
  }));

  const LANGUAGE_MAP: Record<string, string> = {
    'cpp': 'C++',
    'python3': 'Python',
    'golang': 'Go',
    'java': 'Java',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript'
  };
  const normalizedLanguages = languages.languages.map((l: any) => ({
    ...l,
    language: LANGUAGE_MAP[l.language] || l.language
  }));

  // Heatmap generation
  const today = new Date();
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const heatmapMap = heatmap.heatmap.reduce((acc: any, curr: any) => {
    acc[curr.activity_date] = curr.submissions;
    return acc;
  }, {});

  const generateRecommendations = () => {
    const recs = [];
    const weakTopics = topics.topics.filter((t: any) => t.strength === 'weak').slice(0, 2);
    weakTopics.forEach((t: any) => {
      recs.push(`Focus on ${t.topic}. You attempted ${t.attempted} problems with a ${t.acceptance_rate}% acceptance rate.`);
    });
    if (recs.length === 0 && topics.topics.length > 0) {
      recs.push(`Great job! You don't have any severe weak spots. Keep practicing ${topics.topics[0].topic} to maintain dominance.`);
    }
    return recs;
  };

  const recs = generateRecommendations();

  const refreshUsage = async () => {
    try {
      const headers = { "Authorization": `Bearer ${session.access_token}` };
      const usageRes = await fetch("/api/v1/ai/usage", { headers });
      if (usageRes.ok) {
        const newUsage = await usageRes.json();
        setData((prev: any) => ({ ...prev, usage: newUsage }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {externalTab === 'OVERVIEW' && (
      <div>
        <header className="pageHeader">
          <h1 className="pageHeaderTitle">Dashboard</h1>
        </header>
        {/* Overview Stats */}
        <div className={styles.analyticsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statTitle}>Total Solved</div>
            <div className={styles.statValue}>{overview.unique_problems || 0}</div>
            <div className={styles.statContext}>problems solved</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statTitle}>Acceptance Rate</div>
            <div className={styles.statValue}>{overview.acceptance_rate || 0}%</div>
            <div className={styles.statContext}>lifetime average</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statTitle}>Current Streak</div>
            <div className={`${styles.statValue} ${overview.current_streak > 0 ? styles.green : ''}`}>{overview.current_streak || 0}</div>
            <div className={styles.statContext}>{overview.current_streak > 0 ? 'active streak 🔥' : 'no active streak'}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statTitle}>Longest Streak</div>
            <div className={styles.statValue}>{overview.longest_streak || 0}</div>
            <div className={styles.statContext}>days in a row</div>
          </div>
        </div>
        <BillingPanel token={session.access_token} usage={usage} />

        {/* Recent Submissions */}
        {overview.recent_submissions && overview.recent_submissions.length > 0 && (
          <div className={styles.dashboardSection} style={{ marginTop: '2rem' }}>
            <div className={styles.sectionTitle}>Recent Submissions</div>
            <div className={styles.tableContainer}>
              <table className={`${styles.table} responsiveTable`}>
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Sync Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recent_submissions.slice(0, 10).map((sub: any, i: number) => (
                    <tr key={i} className={styles.clickableRow} onClick={() => openModal(sub.leetcodeSubmissionId)}>
                      <td data-label="Problem"><strong>{sub.problemTitle || sub.problemSlug}</strong></td>
                      <td data-label="Status">
                        <span className={`${styles.badge} ${styles[sub.status.toLowerCase()] || ''}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td data-label="Date" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td data-label="Sync">
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
      )}

      {externalTab === 'ANALYTICS' && (
      <div>
        <header className="pageHeader">
          <h1 className="pageHeaderTitle">Intelligence Analytics</h1>
        </header>
        <div className={styles.chartsGrid}>
        {/* Topic Radar */}
        {topics.topics.length > 2 && (
          <div className={styles.chartContainer}>
            <div className={styles.chartHeader}>Topic Proficiency</div>
            <div style={{ width: '100%', height: isVeryNarrow ? 240 : 300, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={topics.topics.slice(0, 6)} margin={{ top: 0, right: isVeryNarrow ? 10 : 30, bottom: 0, left: isVeryNarrow ? 10 : 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: '#94a3b8', fontSize: isVeryNarrow ? 10 : 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Acceptance %" dataKey="acceptance_rate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Tooltip allowEscapeViewBox={{ x: false, y: true }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Difficulty Pie */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            Difficulty Distribution
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Historical data may be unclassified</div>
          </div>
          <div style={{ width: '100%', height: isVeryNarrow ? 260 : 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={normalizedDifficulties}
                  dataKey="accepted"
                  nameKey="difficulty"
                  cx="50%"
                  cy="50%"
                  innerRadius={isVeryNarrow ? 40 : 60}
                  outerRadius={isVeryNarrow ? 70 : 100}
                  paddingAngle={5}
                >
                  {normalizedDifficulties.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={(DIFFICULTY_COLORS as any)[entry.difficulty] || DIFFICULTY_COLORS.Unclassified} />
                  ))}
                </Pie>
                <Tooltip allowEscapeViewBox={{ x: false, y: true }} contentStyle={{ backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Legend layout="horizontal" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Language Bar Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>Language Mastery</div>
          <div style={{ width: '100%', height: isVeryNarrow ? 260 : 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={normalizedLanguages.slice(0, 5)} layout="vertical" margin={{ left: isVeryNarrow ? 0 : 20, right: isVeryNarrow ? 10 : 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="language" type="category" width={isVeryNarrow ? 60 : 80} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: isVeryNarrow ? 10 : 12 }} />
                <Tooltip allowEscapeViewBox={{ x: false, y: true }} contentStyle={{ backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Bar dataKey="accepted" fill="var(--accent-secondary)" radius={[0, 4, 4, 0]} name="Solved" barSize={isVeryNarrow ? 16 : 24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contest Bar Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>Contest Performance</div>
          <div style={{ width: '100%', height: isVeryNarrow ? 260 : 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contests.contests} margin={{ left: isVeryNarrow ? -20 : 0, right: isVeryNarrow ? 10 : 20 }}>
                <XAxis dataKey="contest_type" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: isVeryNarrow ? 10 : 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: isVeryNarrow ? 10 : 12 }} axisLine={false} tickLine={false} />
                <Tooltip allowEscapeViewBox={{ x: false, y: true }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc' }} />
                <Bar dataKey="accepted" fill="#10b981" radius={[4, 4, 0, 0]} name="Solved" barSize={isVeryNarrow ? 24 : 32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className={styles.dashboardSection}>
        <div className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>
          Activity Heatmap
          <div className={styles.heatmapLegend}>
            <span>Less</span>
            <div className={`${styles.heatmapCell} ${styles.heat0}`} />
            <div className={`${styles.heatmapCell} ${styles.heat1}`} />
            <div className={`${styles.heatmapCell} ${styles.heat2}`} />
            <div className={`${styles.heatmapCell} ${styles.heat3}`} />
            <div className={`${styles.heatmapCell} ${styles.heat4}`} />
            <span>More</span>
          </div>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Last 12 months</div>
        <div className={styles.heatmapContainer}>
          <div className={styles.heatmapGrid}>
            {days.map((dateStr, i) => {
              const subs = heatmapMap[dateStr] || 0;
              let heatClass = styles.heat0;
              if (subs > 0 && subs <= 2) heatClass = styles.heat1;
              else if (subs > 2 && subs <= 4) heatClass = styles.heat2;
              else if (subs > 4 && subs <= 6) heatClass = styles.heat3;
              else if (subs > 6) heatClass = styles.heat4;

              return (
                <div
                  key={dateStr}
                  className={`${styles.heatmapCell} ${heatClass}`}
                  title={`${subs} submissions on ${dateStr}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Topics & Recommendations */}
      <div className={styles.chartsGrid}>
        <div className={styles.dashboardSection} style={{ marginBottom: 0 }}>
          <div className={styles.sectionTitle}>Targeted Recommendations</div>
          <div className={styles.recsContainer}>
            {overview.trend && overview.trend.classification !== 'insufficient data' && (
              <div className={styles.recItem} style={{ borderLeft: '4px solid #3b82f6' }}>
                <strong>Trend ({overview.trend.classification}):</strong> {overview.trend.recommendation}
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  Last 14 days: {overview.trend.recent_acceptance_rate}% win rate ({overview.trend.recent_attempted} problems)
                  <br/>
                  Previous 14 days: {overview.trend.previous_acceptance_rate}% win rate ({overview.trend.previous_attempted} problems)
                </div>
              </div>
            )}
            {recs.length > 0 ? recs.map((rec, i) => (
              <div key={i} className={styles.recItem}>{rec}</div>
            )) : <div style={{ color: '#94a3b8' }}>Not enough data for topic recommendations yet.</div>}
          </div>
        </div>

        <div className={styles.dashboardSection} style={{ marginBottom: 0 }}>
          <div className={styles.sectionTitle}>Weakness Engine</div>
          <div className={styles.tableContainer}>
            <table className={`${styles.table} responsiveTable`}>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Win Rate</th>
                  <th>Status</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {topics.topics.slice(0, 5).map((t: any, i: number) => (
                  <tr key={i}>
                    <td data-label="Topic"><strong>{t.topic}</strong></td>
                    <td data-label="Win Rate">{t.acceptance_rate}%</td>
                    <td data-label="Status">
                      <span className={`${styles.badge} ${styles[t.strength] || ''}`}>
                        {t.strength}
                      </span>
                    </td>
                    <td data-label="Confidence">
                      <span className={`${styles.badge} ${styles[t.confidence] || ''}`}>
                        {t.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
      )}

      <div style={{ display: externalTab === 'ASK_AI' ? 'block' : 'none' }}>
        <DashboardChat
          token={session.access_token}
          usage={usage}
          refreshUsage={refreshUsage}
        />
      </div>

      {/* Submission Detail Modal */}
      {selectedSubId && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {modalData ? modalData.problem_title : "Loading..."}
              </div>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
            </div>
            {modalLoading ? (
              <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>Fetching details securely...</div>
            ) : modalData ? (
              <div className={styles.modalBody}>
                <div className={styles.modalTabs}>
                  <button
                    className={`${styles.tabBtn} ${modalTab === 'DETAILS' ? styles.activeTab : ''}`}
                    onClick={() => setModalTab('DETAILS')}
                  >
                    Submission Details
                  </button>
                  <button
                    className={`${styles.tabBtn} ${modalTab === 'AI_COACH' ? styles.activeTab : ''}`}
                    onClick={() => setModalTab('AI_COACH')}
                  >
                    ✨ AI Coach
                  </button>
                </div>

                <div style={{ display: modalTab === 'DETAILS' ? 'block' : 'none' }}>
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Status</span>
                      <span className={`${styles.badge} ${styles[modalData.status.toLowerCase()] || ''}`} style={{ width: 'fit-content' }}>
                        {modalData.status}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Difficulty</span>
                      <span className={styles.metaValue}>{modalData.difficulty}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Language</span>
                      <span className={styles.metaValue}>{modalData.language}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Date</span>
                      <span className={styles.metaValue}>{new Date(modalData.submitted_at).toLocaleString()}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>GitHub Sync</span>
                      <span className={`${styles.badge} ${styles[modalData.github_sync_status?.toLowerCase()] || ''}`} style={{ width: 'fit-content' }}>
                        {modalData.github_sync_status}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Topics</span>
                      <span className={styles.metaValue}>{modalData.topics.join(', ') || 'None'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <span className={styles.metaLabel}>Source Code</span>
                    <div className={styles.codeBlock}>
                      {modalData.source_code}
                    </div>
                  </div>
                </div>

                <div style={{ display: modalTab === 'AI_COACH' ? 'block' : 'none' }}>
                  <AiCoachPanel submissionId={modalData.id} token={session.access_token} />
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', color: '#ef4444' }}>Failed to load submission data.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
