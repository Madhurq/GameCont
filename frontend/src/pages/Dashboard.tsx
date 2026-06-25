import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchServers, isSimulatorMode, setSimulatorMode } from '../services/api';
import { ServerCard } from '../components/ServerCard/ServerCard';
import { Button } from '../components/Button/Button';
import { ServerCardSkeleton } from '../components/Skeleton/Skeleton';
import styles from './Dashboard.module.css';
import { useState } from 'react';

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
  const [simToggled, setSimToggled] = useState(isSimulatorMode());

  const { data: servers, isLoading, error, refetch } = useQuery({
    queryKey: ['servers'],
    queryFn: fetchServers,
    refetchInterval: 10000,
    retry: 1,
  });

  const handleEnableSimulator = () => {
    setSimulatorMode(true);
    setSimToggled(true);
    refetch();
  };

  const offline = error && !simToggled;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>&gt; </span>
            Your Servers
          </h1>
          <p className={styles.subtitle}>Manage and monitor all deployed game instances</p>
        </div>
        <Button onClick={() => navigate('/servers/create')} icon={<span>+</span>}>
          Deploy Server
        </Button>
      </div>

      {/* Simulator banner */}
      {isSimulatorMode() && (
        <div className="simulator-banner">
          <span className="sim-icon">⚡</span>
          <div className="sim-text">
            <span className="sim-label">Simulator Mode</span> — Displaying mock data. Start your backend to see live servers.
          </div>
        </div>
      )}

      {/* Offline diagnostics */}
      {offline && (
        <div className={styles.offlinePanel}>
          <div className={styles.offlineTerminal}>
            <div className={styles.offlineHeader}>
              <span className={styles.offlineDot} />
              <span className={styles.offlineTitle}>CONNECTION DIAGNOSTIC</span>
            </div>
            <div className={styles.offlineBody}>
              <div className={styles.offlineLine}>
                <span className={styles.prompt}>$</span>
                <span className={styles.cmd}> curl http://localhost:8080/api/servers</span>
              </div>
              <div className={styles.offlineLine}>
                <span className={styles.errOut}>[ERR] Connection refused — ECONNREFUSED 127.0.0.1:8080</span>
              </div>
              <div className={styles.offlineLine}>
                <span className={styles.warnOut}>[WARN] Backend server is offline or unreachable</span>
              </div>
              <div className={styles.offlineLine}>
                <span className={styles.infoOut}>[INFO] Start your Spring Boot backend or enable Simulator Mode</span>
              </div>
            </div>
            <div className={styles.offlineActions}>
              <Button variant="secondary" size="sm" onClick={() => { refetch(); }}>
                &gt; Retry Connection
              </Button>
              <Button size="sm" onClick={handleEnableSimulator}>
                &gt; Enter Simulator
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <DashboardSkeleton />}

      {servers && servers.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyGlow} />
          <span className={styles.emptyIcon}>🎮</span>
          <h3 className={styles.emptyTitle}>&gt; No servers deployed</h3>
          <p className={styles.emptyText}>Initialize your first game server to get started</p>
          <Button onClick={() => navigate('/servers/create')}>&gt; Deploy Server</Button>
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
