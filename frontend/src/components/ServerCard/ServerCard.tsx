import { useNavigate } from 'react-router-dom';
import type { GameServer } from '../../types';
import { Card } from '../Card/Card';
import { Badge } from '../Badge/Badge';
import { StatusDot } from '../StatusDot/StatusDot';
import styles from './ServerCard.module.css';

interface ServerCardProps {
  server: GameServer;
}

const gameTypeLabels: Record<string, string> = {
  MINECRAFT_VANILLA: 'Vanilla',
  MINECRAFT_MODDED: 'Modded',
  CUSTOM: 'Custom',
};

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  STARTING: 'warning',
  RUNNING: 'success',
  STOPPING: 'warning',
  STOPPED: 'neutral',
  SLEEPING: 'info',
  ERROR: 'error',
};

export function ServerCard({ server }: ServerCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      hoverable
      padding="md"
      className={styles.card}
      onClick={() => navigate(`/servers/${server.id}`)}
    >
      <div className={styles.top}>
        <div className={styles.gameIcon}>
          {server.gameType === 'MINECRAFT_VANILLA' && '⛏'}
          {server.gameType === 'MINECRAFT_MODDED' && '⚡'}
          {server.gameType === 'CUSTOM' && '⚙'}
        </div>
        <Badge variant={statusBadgeVariant[server.status]} pulse={server.status === 'STARTING' || server.status === 'STOPPING'}>
          {server.status === 'STARTING' ? 'Starting' :
           server.status === 'RUNNING' ? 'Running' :
           server.status === 'STOPPING' ? 'Stopping' :
           server.status === 'STOPPED' ? 'Stopped' :
           server.status === 'SLEEPING' ? 'Sleeping' : 'Error'}
        </Badge>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{server.name}</h3>
        <span className={styles.type}>{gameTypeLabels[server.gameType]}</span>
      </div>

      <div className={styles.footer}>
        <div className={styles.stat}>
          <span className={styles.statIcon}>👤</span>
          <span className={styles.statValue}>{server.maxPlayers}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>💾</span>
          <span className={styles.statValue}>{server.cpuLimit}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.devider} />
        </div>
        <StatusDot status={server.status} size="sm" />
      </div>
    </Card>
  );
}
