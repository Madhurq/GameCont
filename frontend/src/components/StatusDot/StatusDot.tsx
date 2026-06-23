import type { ServerStatus } from '../../types';
import styles from './StatusDot.module.css';

interface StatusDotProps {
  status: ServerStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<ServerStatus, { color: string; label: string }> = {
  STARTING: { color: '#f59e0b', label: 'Starting' },
  RUNNING: { color: '#10b981', label: 'Running' },
  STOPPING: { color: '#f59e0b', label: 'Stopping' },
  STOPPED: { color: '#6b7280', label: 'Stopped' },
  SLEEPING: { color: '#8b5cf6', label: 'Sleeping' },
  ERROR: { color: '#ef4444', label: 'Error' },
};

export function StatusDot({ status, size = 'md' }: StatusDotProps) {
  const config = statusConfig[status];
  const animate = status === 'STARTING' || status === 'STOPPING';

  return (
    <span
      className={`${styles.dot} ${styles[size]} ${animate ? styles.pulse : ''}`}
      style={{ backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}40` }}
      title={config.label}
    />
  );
}
