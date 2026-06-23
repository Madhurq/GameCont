import type { ReactNode, HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: ReactNode;
}

export function Card({
  variant = 'glass',
  padding = 'md',
  hoverable = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const cls = [
    styles.card,
    styles[variant],
    styles[`pad-${padding}`],
    hoverable ? styles.hoverable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
