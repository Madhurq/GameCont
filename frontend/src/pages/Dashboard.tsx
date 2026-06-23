import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchServers } from '../services/api';
import { ServerCard } from '../components/ServerCard/ServerCard';
import { Button } from '../components/Button/Button';
import styles from './Dashboard.module.css';

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
        <Button onClick={() => navigate('/servers/new')} icon={<span>+</span>}>
          New Server
        </Button>
      </div>

      {isLoading && (
        <div className={styles.center}>
          <span className={styles.spinner} />
        </div>
      )}

      {error && (
        <div className={styles.center}>
          <p className={styles.errorText}>Failed to load servers</p>
        </div>
      )}

      {servers && servers.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎮</span>
          <h3 className={styles.emptyTitle}>No servers yet</h3>
          <p className={styles.emptyText}>Create your first game server to get started</p>
          <Button onClick={() => navigate('/servers/new')}>Create Server</Button>
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
