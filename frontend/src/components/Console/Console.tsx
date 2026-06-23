import { useEffect, useRef, useState } from 'react';
import { Card } from '../Card/Card';
import { setupWebSocket } from '../../services/websocket';
import styles from './Console.module.css';

interface ConsoleProps {
  serverId: string;
  initialLogs?: string[];
}

export function Console({ serverId, initialLogs = [] }: ConsoleProps) {
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanup = setupWebSocket(serverId, (msg) => {
      setLogs((prev) => [...prev.slice(-200), msg]);
    });
    return cleanup;
  }, [serverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <Card variant="glass" padding="sm" className={styles.console}>
      <div className={styles.header}>
        <span className={styles.title}>Console</span>
        <span className={styles.status}>● Live</span>
      </div>
      <div className={styles.output}>
        {logs.map((line, i) => (
          <div key={i} className={styles.line}>
            <span className={styles.timestamp}>{new Date().toLocaleTimeString()}</span>
            <span className={styles.msg}>{line}</span>
          </div>
        ))}
        <div ref={bottomRef} />
        <span className={styles.cursor}>_</span>
      </div>
    </Card>
  );
}
