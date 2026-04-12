import { useState, useEffect, useRef } from 'react';
import { getLogBuffer, getLogText } from '../../utils/debugLog';
import type { LogEntry } from '../../utils/debugLog';

interface DebugLogPanelProps {
  visible: boolean;
  onClose: () => void;
}

const btnStyle: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  borderRadius: '4px',
  border: '1px solid #4A9AD9',
  background: 'transparent',
  color: '#4A9AD9',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.75rem',
};

export default function DebugLogPanel({ visible, onClose }: DebugLogPanelProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    setEntries(getLogBuffer());
    const id = setInterval(() => setEntries(getLogBuffer()), 500);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getLogText());
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: '50vh',
      backgroundColor: '#1a1a2e',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      fontSize: '0.75rem',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      borderTop: '2px solid #4A9AD9',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid #333',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700 }}>Debug Log ({entries.length})</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleCopy} style={btnStyle}>
            {copyFeedback ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={onClose} style={btnStyle}>Close</button>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem' }}>
        {entries.map((e, i) => (
          <div key={i} style={{
            color: e.level === 'error' ? '#E53E3E' : e.level === 'warn' ? '#D69E2E' : '#e0e0e0',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.4,
          }}>
            [{e.timestamp}] {e.message}
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ color: '#718096', fontStyle: 'italic' }}>No log entries yet.</div>
        )}
      </div>
    </div>
  );
}
