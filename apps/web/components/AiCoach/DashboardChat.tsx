import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AiCoach.module.css';
import { sendChatMessage } from '../../lib/ai-api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function DashboardChat({ token, usage, refreshUsage }: { token: string, usage: any, refreshUsage: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_CHARS = 1000;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || input.length > MAX_CHARS || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Send message with null for submissionId
      const data = await sendChatMessage(userMessage, conversationId, null, token);
      
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
      refreshUsage();
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const SUGGESTIONS = [
    "Explain the optimal solution",
    "Review my approach",
    "Give me a hint",
    "Analyze my complexity",
    "Find bugs in my code"
  ];

  return (
    <div className={styles.chatContainer} style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
      <header className="pageHeader">
        <h1 className="pageHeaderTitle">AI Developer Coach</h1>
      </header>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        Your personal coding mentor. Ask questions about algorithms, data structures, complexity, debugging, optimization, or code review.
      </p>
      
      {messages.length === 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {SUGGESTIONS.map(s => (
            <button 
              key={s} 
              onClick={() => setInput(s)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-surface-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      
      {messages.length > 0 && (
        <div className={styles.chatMessages} style={{ maxHeight: '600px', backgroundColor: 'var(--bg-base)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.chatMessage} ${styles[msg.role] || ''}`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.chatMessage} ${styles.assistant}`}>
              <div className={styles.loadingSpinner} style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0 }}></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {error && <div className={styles.errorText} style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      <div className={styles.chatInputContainer}>
        {usage && usage.chat.remaining <= 0 && (
          <div style={{ marginBottom: '0.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
            You've reached your free AI chat limit. Upgrade to Premium for 300 messages/month.
          </div>
        )}
        <div className={styles.chatInputWrapper}>
          <textarea
            className={styles.chatInput}
            placeholder="Ask a question... (e.g. 'Can you explain dynamic programming?')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || (usage && usage.chat.remaining <= 0)}
            maxLength={MAX_CHARS + 10}
            style={{ minHeight: '80px' }}
          />
          <button 
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || input.length > MAX_CHARS || isLoading || (usage && usage.chat.remaining <= 0)}
          >
            Send
          </button>
        </div>
        <div className={`${styles.charCount} ${input.length > MAX_CHARS ? styles.limit : ''}`}>
          {input.length} / {MAX_CHARS}
        </div>
      </div>
    </div>
  );
}
