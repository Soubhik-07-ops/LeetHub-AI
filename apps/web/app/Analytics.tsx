"use client";
import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import styles from "./Analytics.module.css";
import AiCoachPanel from '../components/AiCoach/AiCoachPanel';

const DIFFICULTY_COLORS = {
  Easy: '#10b981',
  Medium: '#f59e0b',
  Hard: '#ef4444',
  Unknown: '#64748b'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function Analytics({ session }: { session: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'DETAILS' | 'AI_COACH'>('DETAILS');

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

  if (loading) return <div style={{ color: "#94a3b8" }}>Loading analytics engine...</div>;
  if (error) return <div style={{ color: "#ef4444" }}>{error}</div>;
  if (!data) return null;

  const { overview, topics, difficulty, languages, contests, heatmap, usage } = data;

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

  return (
    <div>
      {/* Overview Stats */}
      <div className={styles.analyticsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Total Solved</div>
          <div className={styles.statValue}>{overview.unique_problems || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Acceptance Rate</div>
          <div className={styles.statValue}>{overview.acceptance_rate || 0}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Current Streak</div>
          <div className={`${styles.statValue} ${overview.current_streak > 0 ? styles.green : ''}`}>{overview.current_streak || 0} 🔥</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Longest Streak</div>
          <div className={styles.statValue}>{overview.longest_streak || 0} 🔥</div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* AI Usage Widget */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <span style={{ textTransform: 'capitalize' }}>{usage.plan}</span> AI Usage
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Analysis</span>
                <span>{usage.analysis.used} / {usage.analysis.limit} {usage.analysis.period === 'daily' ? 'today' : 'this month'}</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#334155', height: '8px', borderRadius: '4px', marginTop: '4px' }}>
                <div style={{ width: `${Math.min(100, (usage.analysis.used / usage.analysis.limit) * 100)}%`, backgroundColor: usage.analysis.used >= usage.analysis.limit ? '#ef4444' : '#3b82f6', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Chat</span>
                <span>{usage.chat.used} / {usage.chat.limit} {usage.chat.period === 'daily' ? 'today' : 'this month'}</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#334155', height: '8px', borderRadius: '4px', marginTop: '4px' }}>
                <div style={{ width: `${Math.min(100, (usage.chat.used / usage.chat.limit) * 100)}%`, backgroundColor: usage.chat.used >= usage.chat.limit ? '#ef4444' : '#10b981', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
            {usage.plan === 'free' ? (
              <button onClick={() => alert("Premium coming soon!")} style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Upgrade to Premium
              </button>
            ) : (
              <button onClick={() => alert("Membership management coming soon!")} style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Manage Membership
              </button>
            )}
          </div>
        </div>

        {/* Topic Radar */}
        {topics.topics.length > 2 && (
          <div className={styles.chartContainer}>
            <div className={styles.chartHeader}>Topic Proficiency</div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <RadarChart data={topics.topics.slice(0, 6)}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Acceptance %" dataKey="acceptance_rate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Difficulty Pie */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>Difficulty Distribution</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={difficulty.difficulties}
                  dataKey="accepted"
                  nameKey="difficulty"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                >
                  {difficulty.difficulties.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={(DIFFICULTY_COLORS as any)[entry.difficulty] || DIFFICULTY_COLORS.Unknown} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Language Bar Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>Language Mastery</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={languages.languages.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="language" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc' }} />
                <Bar dataKey="accepted" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Solved" barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contest Bar Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>Contest Performance</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={contests.contests}>
                <XAxis dataKey="contest_type" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc' }} />
                <Bar dataKey="accepted" fill="#10b981" radius={[4, 4, 0, 0]} name="Solved" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className={styles.dashboardSection}>
        <div className={styles.sectionTitle}>Activity Heatmap</div>
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
            <table className={styles.table}>
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
                    <td>{t.topic}</td>
                    <td>{t.acceptance_rate}%</td>
                    <td>
                      <span className={`${styles.badge} ${styles[t.strength] || ''}`}>
                        {t.strength}
                      </span>
                    </td>
                    <td>
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

      {/* Recent Submissions */}
      {overview.recent_submissions && overview.recent_submissions.length > 0 && (
        <div className={styles.dashboardSection} style={{ marginTop: '2rem' }}>
          <div className={styles.sectionTitle}>Recent Submissions</div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
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
