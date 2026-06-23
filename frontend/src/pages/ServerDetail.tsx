import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchServer, fetchMetrics, startServer, stopServer, restartServer } from '../services/api';
import { Button } from '../components/Button/Button';
import { Badge } from '../components/Badge/Badge';
import { Card } from '../components/Card/Card';
import { MetricChart } from '../components/MetricChart/MetricChart';
import { Console } from '../components/Console/Console';
import { StatusDot } from '../components/StatusDot/StatusDot';
import styles from './ServerDetail.module.css';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  STARTING: 'warning',
  RUNNING: 'success',
  STOPPING: 'warning',
  STOPPED: 'neutral',
  SLEEPING: 'info',
  ERROR: 'error',
};

function useMetricsPolling(serverId: string, enabled: boolean) {
  const [history, setHistory] = useState<{ tps: { time: string; value: number }[]; players: { time: string; value: number }[]; memory: { time: string; value: number }[] }>({
    tps: [], players: [], memory: [],
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics', serverId],
    queryFn: () => fetchMetrics(serverId),
    refetchInterval: enabled ? 5000 : false,
    enabled,
  });

  if (metrics) {
    const now = new Date().toLocaleTimeString();
    setHistory((prev) => ({
      tps: [...prev.tps.slice(-20), { time: now, value: metrics.tps }],
      players: [...prev.players.slice(-20), { time: now, value: metrics.playersOnline }],
      memory: [...prev.memory.slice(-20), { time: now, value: Math.round(metrics.memoryUsedBytes / (1024 * 1024)) }],
    }));
  }

  return history;
}

export function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: server, isLoading, error } = useQuery({
    queryKey: ['server', id],
    queryFn: () => fetchServer(id!),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const isLive = server?.status === 'RUNNING';
  const metrics = useMetricsPolling(id!, isLive);

  const handleAction = useCallback(async (action: string, fn: () => Promise<unknown>) => {
    setActionLoading(action);
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    } finally {
      setActionLoading(null);
    }
  }, [id, queryClient]);

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
          <p className={styles.errorText}>Server not found</p>
          <Button variant="ghost" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/')}>← Back</button>

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
            <span className={styles.type}>{server.gameType.replace('_', ' ')}</span>
            <span className={styles.separator}>|</span>
            <span className={styles.region}>{server.region}</span>
          </div>
        </div>

        {server.connectAddress && (
          <Card variant="glass" padding="sm" className={styles.addressCard}>
            <span className={styles.addressLabel}>Connect</span>
            <span className={styles.addressValue}>{server.connectAddress}</span>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(server.connectAddress!)}
              title="Copy address"
            >
              📋
            </button>
          </Card>
        )}
      </div>

      <div className={styles.actions}>
        {server.status === 'RUNNING' && (
          <>
            <Button variant="danger" size="sm" loading={actionLoading === 'stop'} onClick={() => handleAction('stop', () => stopServer(server.id))}>Stop</Button>
            <Button variant="secondary" size="sm" loading={actionLoading === 'restart'} onClick={() => handleAction('restart', () => restartServer(server.id))}>Restart</Button>
          </>
        )}
        {(server.status === 'STOPPED' || server.status === 'SLEEPING') && (
          <Button size="sm" loading={actionLoading === 'start'} onClick={() => handleAction('start', () => startServer(server.id))}>Start</Button>
        )}
      </div>

      <div className={styles.metricsGrid}>
        <MetricChart
          title="TPS"
          data={metrics.tps}
          color="#10b981"
          formatValue={(v) => v.toFixed(1)}
        />
        <MetricChart
          title="Players"
          data={metrics.players}
          color="#3b82f6"
        />
        <MetricChart
          title="Memory"
          data={metrics.memory}
          color="#8b5cf6"
          unit="MB"
        />
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
