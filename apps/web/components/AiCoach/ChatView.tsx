import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AiCoach.module.css';
import { sendChatMessage } from '../../lib/ai-api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatView({ token, submissionId }: { token: string, submissionId: string }) {
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
      const data = await sendChatMessage(userMessage, conversationId, submissionId, token);
      
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
      // Remove the optimistic user message on failure so they can try again if they want, 
      // or just show error. Let's just show error.
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

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>Ask AI Coach</div>
      
      {messages.length > 0 && (
        <div className={styles.chatMessages}>
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
        <div className={styles.chatInputWrapper}>
          <textarea
            className={styles.chatInput}
            placeholder="Ask a question about this code... (e.g. 'Can I optimize this?')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={MAX_CHARS + 10} // Allow typing to see limit
          />
          <button 
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || input.length > MAX_CHARS || isLoading}
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
