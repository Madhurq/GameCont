import { useEffect, useRef, useState } from 'react';
import { Card } from '../Card/Card';
import { setupWebSocket } from '../../services/websocket';
import styles from './Console.module.css';

interface ConsoleProps {
  serverId: string;
  initialLogs?: string[];
}

interface LogEntry {
  text: string;
  time: string;
}

const levelColors: Record<string, string> = {
  INFO: '#06b6d4',
  WARN: '#f59e0b',
  ERROR: '#ef4444',
  DEBUG: '#6b7280',
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString();
}

export function Console({ serverId, initialLogs = [] }: ConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>(
    initialLogs.map((text) => ({ text, time: formatTime(new Date()) }))
  );
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanup = setupWebSocket(serverId, (msg) => {
      setLogs((prev) => [...prev.slice(-200), { text: msg, time: formatTime(new Date()) }]);
    });
    return cleanup;
  }, [serverId]);

  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, paused]);

  const parseLevel = (line: string): { level: string; rest: string } => {
    const match = line.match(/^\[(\w+)\]\s*(.*)/);
    if (match) {
      return { level: match[1], rest: match[2] };
    }
    return { level: '', rest: line };
  };

  return (
    <Card variant="glass" padding="sm" className={styles.console}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Console</span>
          <span className={styles.status}>● Live</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.logCount}>{logs.length} lines</span>
          <button
            className={`${styles.pauseBtn} ${paused ? styles.paused : ''}`}
            onClick={() => setPaused(!paused)}
            type="button"
          >
            {paused ? '▶ Resume' : '❚❚ Pause'}
          </button>
          <button className={styles.clearBtn} onClick={() => setLogs([])} type="button">
            Clear
          </button>
        </div>
      </div>
      <div className={styles.output}>
        {logs.length === 0 && (
          <div className={styles.empty}>
            Waiting for server output...
            <span className={styles.blink}>_</span>
          </div>
        )}
        {logs.map((entry, i) => {
          const { level, rest } = parseLevel(entry.text);
          const color = levelColors[level] || undefined;
          return (
            <div key={i} className={styles.line}>
              <span className={styles.timestamp}>{entry.time}</span>
              {level && (
                <span className={styles.level} style={{ color }}>
                  [{level}]
                </span>
              )}
              <span className={styles.msg}>{rest || entry.text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
        {logs.length > 0 && <span className={styles.cursor}>_</span>}
      </div>
    </Card>
  );
}
