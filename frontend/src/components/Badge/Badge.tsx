import type { ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  pulse = false,
  children,
  className = '',
}: BadgeProps) {
  const cls = [
    styles.badge,
    styles[variant],
    styles[size],
    pulse ? styles.pulse : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls}>
      <span className={styles.dot} />
      <span>{children}</span>
    </span>
  );
}
