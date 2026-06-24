import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchServers } from '../services/api';
import { ServerCard } from '../components/ServerCard/ServerCard';
import { Button } from '../components/Button/Button';
import { ServerCardSkeleton } from '../components/Skeleton/Skeleton';
import styles from './Dashboard.module.css';

function DashboardSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }, (_, i) => (
        <ServerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: servers, isLoading, error } = useQuery({
    queryKey: ['servers'],
    queryFn: fetchServers,
    refetchInterval: 10000,
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Servers</h1>
          <p className={styles.subtitle}>Manage and monitor all your game servers</p>
        </div>
        <Button onClick={() => navigate('/servers/create')} icon={<span>+</span>}>
          New Server
        </Button>
      </div>

      {isLoading && <DashboardSkeleton />}

      {error && (
        <div className={styles.center}>
          <div className={styles.errorCard}>
            <span className={styles.errorIcon}>⚠</span>
            <p className={styles.errorText}>Failed to load servers</p>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {servers && servers.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyGlow} />
          <span className={styles.emptyIcon}>🎮</span>
          <h3 className={styles.emptyTitle}>No servers yet</h3>
          <p className={styles.emptyText}>Create your first game server to get started</p>
          <Button onClick={() => navigate('/servers/create')}>Create Server</Button>
        </div>
      )}

      {servers && servers.length > 0 && (
        <div className={styles.grid}>
          {servers.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}
