import React from 'react';
import styles from './AiCoach.module.css';

export default function AnalysisView({ data, isCached }: { data: any, isCached?: boolean }) {
  if (!data) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>AI Analysis</span>
        {isCached && <span className={styles.cachedBadge}>Cached analysis</span>}
      </div>
      
      <div className={styles.card}>
        <div className={styles.cardTitle}>Overview & Quality</div>
        <div className={styles.overviewText}>
          {data.overall_quality}
        </div>
      </div>

      <div className={styles.analysisGrid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Time Complexity</div>
          <div className={styles.complexityBadge}>{data.time_complexity}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Space Complexity</div>
          <div className={styles.complexityBadge}>{data.space_complexity}</div>
        </div>
      </div>

      {data.mistakes && data.mistakes.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Identified Issues</div>
          <div className={styles.mistakeList}>
            {data.mistakes.map((mistake: any, i: number) => (
              <div key={i} className={`${styles.mistakeItem} ${styles[mistake.severity] || ''}`}>
                <div className={styles.mistakeHeader}>
                  <span>Issue {i + 1}</span>
                  <span style={{ textTransform: 'capitalize', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {mistake.severity} severity
                  </span>
                </div>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.5 }}>
                  {mistake.description}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  <strong>Fix:</strong> {mistake.suggestion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.hints && data.hints.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Optimization Hints</div>
          <ul className={styles.hintList}>
            {data.hints.map((hint: string, i: number) => (
              <li key={i} className={styles.hintItem}>
                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{i + 1}.</span>
                <span style={{ fontSize: '0.9375rem', lineHeight: 1.4 }}>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
