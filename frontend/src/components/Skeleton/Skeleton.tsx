import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ variant = 'text', width, height, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`${styles.skeleton} ${styles[variant]}`}
          style={{ width, height }}
        />
      ))}
    </>
  );
}

export function ServerCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={80} height={20} />
      </div>
      <div className={styles.cardBody}>
        <Skeleton variant="text" width="70%" height={22} />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
      <div className={styles.cardFooter}>
        <Skeleton variant="text" width={60} height={16} />
        <Skeleton variant="text" width={60} height={16} />
        <Skeleton variant="circular" width={10} height={10} />
      </div>
    </div>
  );
}

export function MetricChartSkeleton() {
  return (
    <div className={styles.chart}>
      <div className={styles.chartHeader}>
        <Skeleton variant="text" width={60} height={16} />
        <Skeleton variant="text" width={80} height={24} />
      </div>
      <Skeleton variant="rectangular" width="100%" height={120} />
    </div>
  );
}
