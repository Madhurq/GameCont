import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startServer, stopServer, restartServer, deleteServer, sendCommand } from '../services/api';

export function useServerActions(serverId: string) {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commandSending, setCommandSending] = useState(false);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['server', serverId] });
    queryClient.invalidateQueries({ queryKey: ['servers'] });
  }, [queryClient, serverId]);

  const start = useCallback(async () => {
    setActionLoading('start');
    try {
      await startServer(serverId);
      invalidate();
    } finally {
      setActionLoading(null);
    }
  }, [serverId, invalidate]);

  const stop = useCallback(async () => {
    setActionLoading('stop');
    try {
      await stopServer(serverId);
      invalidate();
    } finally {
      setActionLoading(null);
    }
  }, [serverId, invalidate]);

  const restart = useCallback(async () => {
    setActionLoading('restart');
    try {
      await restartServer(serverId);
      invalidate();
    } finally {
      setActionLoading(null);
    }
  }, [serverId, invalidate]);

  const remove = useCallback(async () => {
    setActionLoading('delete');
    try {
      await deleteServer(serverId);
      invalidate();
    } finally {
      setActionLoading(null);
    }
  }, [serverId, invalidate]);

  const send = useCallback(async (command: string) => {
    setCommandSending(true);
    try {
      await sendCommand(serverId, command);
    } finally {
      setCommandSending(false);
    }
  }, [serverId]);

  return { actionLoading, commandSending, start, stop, restart, remove, send };
}
