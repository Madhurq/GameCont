import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchServer } from '../services/api';
import { useMetricsPolling } from '../hooks/useMetricsPolling';
import { useServerActions } from '../hooks/useServerActions';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/Button/Button';
import { Badge } from '../components/Badge/Badge';
import { Card } from '../components/Card/Card';
import { MetricChart } from '../components/MetricChart/MetricChart';
import { Console } from '../components/Console/Console';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { ConfirmModal } from '../components/ConfirmModal/ConfirmModal';
import { MetricChartSkeleton } from '../components/Skeleton/Skeleton';
import styles from './ServerDetail.module.css';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  STARTING: 'warning',
  RUNNING: 'success',
  STOPPING: 'warning',
  STOPPED: 'neutral',
  SLEEPING: 'info',
  ERROR: 'error',
};

export function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { actionLoading, start, stop, restart } = useServerActions(id!);
  const [confirmAction, setConfirmAction] = useState<'stop' | 'restart' | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: server, isLoading, error } = useQuery({
    queryKey: ['server', id],
    queryFn: () => fetchServer(id!),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const isLive = server?.status === 'RUNNING';
  const metrics = useMetricsPolling(id!, isLive);

  const handleStop = async () => {
    await stop();
    toast('Server stopped successfully', 'success');
    setConfirmAction(null);
  };

  const handleRestart = async () => {
    await restart();
    toast('Server restarted successfully', 'success');
    setConfirmAction(null);
  };

  const handleStart = async () => {
    await start();
    toast('Server started successfully', 'success');
  };

  const handleConfirm = async () => {
    if (confirmAction === 'stop') await handleStop();
    else if (confirmAction === 'restart') await handleRestart();
  };

  const handleCopy = async () => {
    if (server?.connectAddress) {
      await navigator.clipboard.writeText(server.connectAddress);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}><span className={styles.spinner} /></div>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <span className={styles.errorIcon}>⚠</span>
          <p className={styles.errorText}>Server not found</p>
          <Button variant="ghost" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/')}>← Back</button>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction === 'stop' ? 'Stop' : 'Restart'}
        message="This action will temporarily disconnect all players. Are you sure you want to proceed?"
        confirmLabel={confirmAction === 'stop' ? 'Stop' : 'Restart'}
        confirmVariant="danger"
        loading={!!confirmAction && actionLoading === confirmAction}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <StatusDot status={server.status} size="lg" />
            <h1 className={styles.title}>{server.name}</h1>
          </div>
          <div className={styles.meta}>
            <Badge variant={statusBadgeVariant[server.status]} pulse={server.status === 'STARTING' || server.status === 'STOPPING'}>
              {server.status}
            </Badge>
            <span className={styles.separator}>|</span>
            <span className={styles.type}>{server.gameType.replace(/_/g, ' ')}</span>
            <span className={styles.separator}>|</span>
            <span className={styles.region}>{server.region}</span>
          </div>
        </div>

        {server.connectAddress && (
          <Card variant="glass" padding="sm" className={styles.addressCard}>
            <span className={styles.addressLabel}>Connect</span>
            <span className={styles.addressValue}>{server.connectAddress}</span>
            <button className={styles.copyBtn} onClick={handleCopy} title="Copy address">
              <span className={`${styles.copyIcon} ${copied ? styles.copied : ''}`}>
                {copied ? '✓' : '📋'}
              </span>
            </button>
          </Card>
        )}
      </div>

      <div className={styles.actions}>
        {server.status === 'RUNNING' && (
          <>
            <Button variant="danger" size="sm" loading={actionLoading === 'stop'} onClick={() => setConfirmAction('stop')}>
              Stop
            </Button>
            <Button variant="secondary" size="sm" loading={actionLoading === 'restart'} onClick={() => setConfirmAction('restart')}>
              Restart
            </Button>
          </>
        )}
        {(server.status === 'STOPPED' || server.status === 'SLEEPING') && (
          <Button size="sm" loading={actionLoading === 'start'} onClick={handleStart}>Start</Button>
        )}
        {server.status === 'STARTING' && (
          <span className={styles.startingNote}>Server is starting up...</span>
        )}
      </div>

      <div className={styles.metricsGrid}>
        {metrics.tps.length === 0 ? (
          <>
            <MetricChartSkeleton />
            <MetricChartSkeleton />
            <MetricChartSkeleton />
          </>
        ) : (
          <>
            <MetricChart title="TPS" data={metrics.tps} color="#10b981" formatValue={(v) => v.toFixed(1)} />
            <MetricChart title="Players" data={metrics.players} color="#3b82f6" />
            <MetricChart title="Memory" data={metrics.memory} color="#8b5cf6" unit="MB" />
          </>
        )}
      </div>

      <div className={styles.resources}>
        <Card variant="glass" padding="md" className={styles.resCard}>
          <span className={styles.resLabel}>CPU Limit</span>
          <span className={styles.resValue}>{server.cpuLimit}</span>
        </Card>
        <Card variant="glass" padding="md" className={styles.resCard}>
          <span className={styles.resLabel}>Memory Limit</span>
          <span className={styles.resValue}>{server.memoryLimit}</span>
        </Card>
        <Card variant="glass" padding="md" className={styles.resCard}>
          <span className={styles.resLabel}>Storage</span>
          <span className={styles.resValue}>{server.storageGb} GB</span>
        </Card>
        <Card variant="glass" padding="md" className={styles.resCard}>
          <span className={styles.resLabel}>Max Players</span>
          <span className={styles.resValue}>{server.maxPlayers}</span>
        </Card>
      </div>

      {server.status !== 'STOPPED' && server.status !== 'ERROR' && (
        <Console serverId={server.id} />
      )}
    </div>
  );
}
