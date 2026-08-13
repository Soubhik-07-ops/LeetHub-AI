import React, { useState } from 'react';
import styles from './AiCoach.module.css';
import { analyzeSubmission } from '../../lib/ai-api';
import AnalysisView from './AnalysisView';
import ChatView from './ChatView';

type CoachState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

export default function AiCoachPanel({ submissionId, token }: { submissionId: string, token: string }) {
  const [status, setStatus] = useState<CoachState>('IDLE');
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // We determine if it was cached by checking if it returned very quickly,
  // or we can just assume if we have data we show it. The backend actually doesn't return
  // a `cached` boolean in the payload. We could just say it's analyzed.
  // We'll leave `isCached` out of the UI unless the backend explicitly sends it,
  // but to satisfy the requirement subtly, if the response takes < 500ms we can guess it's cached.
  // A better way is to just let the backend handle it. We won't fake it.

  const handleAnalyze = async () => {
    setStatus('LOADING');
    setErrorMsg(null);
    try {
      const result = await analyzeSubmission(submissionId, token);
      setData(result);
      setStatus('SUCCESS');
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
        <button className={styles.analyzeBtn} onClick={handleAnalyze}>
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
        <button className={styles.analyzeBtn} onClick={handleAnalyze}>Try Again</button>
      </div>
    );
  }

  return (
    <div>
      <AnalysisView data={data} />
      <ChatView token={token} submissionId={submissionId} />
    </div>
  );
}
