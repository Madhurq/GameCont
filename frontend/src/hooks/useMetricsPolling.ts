import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMetrics } from '../services/api';

interface MetricPoint {
  time: string;
  value: number;
}

interface MetricsHistory {
  tps: MetricPoint[];
  players: MetricPoint[];
  memory: MetricPoint[];
}

export function useMetricsPolling(serverId: string, enabled: boolean) {
  const [history, setHistory] = useState<MetricsHistory>({
    tps: [],
    players: [],
    memory: [],
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics', serverId],
    queryFn: () => fetchMetrics(serverId),
    refetchInterval: enabled ? 5000 : false,
    enabled,
  });

  useEffect(() => {
    if (metrics) {
      const now = new Date().toLocaleTimeString();
      setHistory((prev) => ({
        tps: [...prev.tps.slice(-20), { time: now, value: metrics.tps }],
        players: [...prev.players.slice(-20), { time: now, value: metrics.playersOnline }],
        memory: [
          ...prev.memory.slice(-20),
          { time: now, value: Math.round(metrics.memoryUsedBytes / (1024 * 1024)) },
        ],
      }));
    }
  }, [metrics]);

  return history;
}
