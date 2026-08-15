import React, { useState } from 'react';
import styles from './AiCoach.module.css';
import { analyzeSubmission, getAiUsage } from '../../lib/ai-api';
import AnalysisView from './AnalysisView';
import ChatView from './ChatView';
import { useEffect } from 'react';

type CoachState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

export default function AiCoachPanel({ submissionId, token }: { submissionId: string, token: string }) {
  const [status, setStatus] = useState<CoachState>('IDLE');
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);

  const fetchUsage = async () => {
    try {
      const u = await getAiUsage(token);
      setUsage(u);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  // We determine if it was cached by checking if it returned very quickly,
  // or we can just assume if we have data we show it. The backend actually doesn't return
  // a `cached` boolean in the payload. We could just say it's analyzed.
  // We'll leave `isCached` out of the UI unless the backend explicitly sends it,
  // but to satisfy the requirement subtly, if the response takes < 500ms we can guess it's cached.
  // A better way is to just let the backend handle it. We won't fake it.

  const handleAnalyze = async (force: boolean = false) => {
    setStatus('LOADING');
    setErrorMsg(null);
    try {
      const result = await analyzeSubmission(submissionId, token, force);
      setData(result);
      setStatus('SUCCESS');
      await fetchUsage();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to analyze submission.");
      setStatus('ERROR');
    }
  };

  if (status === 'IDLE') {
    return (
      <div className={styles.idleState}>
        <div style={{ marginBottom: '1.5rem', color: '#94a3b8', fontSize: '1.125rem' }}>
          Ready to analyze your submission.
        </div>
        {usage && (
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: usage.analysis.remaining > 0 ? '#10b981' : '#ef4444' }}>
            {usage.analysis.remaining > 0
              ? `${usage.analysis.remaining} AI analyses remaining ${usage.analysis.period === 'daily' ? 'today' : 'this month'}`
              : `You've reached your free AI analysis limit. Upgrade to Premium for 500 analyses/month.`}
          </div>
        )}
        <button
          className={styles.analyzeBtn}
          onClick={() => handleAnalyze(false)}
          disabled={usage && usage.analysis.remaining <= 0}
          style={{ opacity: usage && usage.analysis.remaining <= 0 ? 0.5 : 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Analyze with AI
        </button>
      </div>
    );
  }

  if (status === 'LOADING') {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner}></div>
        <div style={{ color: '#94a3b8' }}>Analyzing your solution...</div>
      </div>
    );
  }

  if (status === 'ERROR') {
    return (
      <div className={styles.errorState}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div style={{ color: '#f8fafc', fontSize: '1.125rem', marginBottom: '0.5rem' }}>Analysis Failed</div>
        <div style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{errorMsg}</div>
        <button className={styles.analyzeBtn} onClick={() => handleAnalyze(false)}>Try Again</button>
      </div>
    );
  }

  return (
    <div>
      {usage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
          {usage.analysis.remaining} analyses, {usage.chat.remaining} chat messages left
        </div>
      )}
      {data?._is_cached && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
          padding: '0.5rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Using recent analysis</span>
          <button
            onClick={() => handleAnalyze(true)}
            style={{
              background: 'none',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Analyze Again
          </button>
        </div>
      )}
      <AnalysisView data={data} />
      <ChatView token={token} submissionId={submissionId} usage={usage} refreshUsage={fetchUsage} />
    </div>
  );
}
