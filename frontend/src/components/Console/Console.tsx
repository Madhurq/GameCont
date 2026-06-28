import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Card } from '../Card/Card';
import { setupWebSocket } from '../../services/websocket';
import styles from './Console.module.css';

interface ConsoleProps {
  serverId: string;
  initialLogs?: string[];
  onSendCommand?: (command: string) => void;
  commandSending?: boolean;
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

export function Console({ serverId, initialLogs = [], onSendCommand, commandSending }: ConsoleProps) {
  const parseLevel = (line: string): { level: string; rest: string } => {
    const m = line.match(/^(\[\d{2}:\d{2}:\d{2}\]\s*(\[[^\]]*\/)?)?(INFO|WARN|ERROR|FATAL|DEBUG)\]?:?\s*(.*)/i);
    if (m) return { level: m[3].toUpperCase(), rest: m[4] };
    return { level: '', rest: line };
  };

  const [logs, setLogs] = useState<LogEntry[]>(
    initialLogs.filter(l => parseLevel(l).level !== 'DEBUG').map((text) => ({ text, time: formatTime(new Date()) }))
  );
  const [paused, setPaused] = useState(false);
  const [command, setCommand] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cleanup = setupWebSocket(serverId, (msg) => {
      const { level } = parseLevel(msg);
      if (level === 'DEBUG') return;
      setLogs((prev) => [...prev.slice(-200), { text: msg, time: formatTime(new Date()) }]);
    });
    return cleanup;
  }, [serverId]);

  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, paused]);

  const sendCommand = () => {
    const trimmed = command.trim();
    if (!trimmed || !onSendCommand || commandSending) return;
    onSendCommand(trimmed);
    setLogs((prev) => [...prev, { text: `> ${trimmed}`, time: formatTime(new Date()) }]);
    setCommand('');
  };

  const handleCommand = (e: FormEvent) => {
    e.preventDefault();
    sendCommand();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCommand();
    }
  };

  // Sync initialLogs prop changes once (prevents form reset on refetch)
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && initialLogs.length > 0) {
      setLogs(initialLogs.filter(l => parseLevel(l).level !== 'DEBUG').map((text) => ({ text, time: formatTime(new Date()) })));
      initialized.current = true;
    }
  }, [initialLogs]);

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

      {onSendCommand && (
        <form className={styles.inputBar} onSubmit={handleCommand}>
          <span className={styles.inputPrefix}>{'>'}</span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Enter command..."
            disabled={commandSending}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!command.trim() || commandSending}
          >
            {commandSending ? '...' : 'Send'}
          </button>
        </form>
      )}
    </Card>
  );
}
