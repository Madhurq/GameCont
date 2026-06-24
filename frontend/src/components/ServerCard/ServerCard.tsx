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

const gameTypeIcons: Record<string, string> = {
  MINECRAFT_VANILLA: '⛏',
  MINECRAFT_MODDED: '⚡',
  CUSTOM: '⚙',
};

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  STARTING: 'warning',
  RUNNING: 'success',
  STOPPING: 'warning',
  STOPPED: 'neutral',
  SLEEPING: 'info',
  ERROR: 'error',
};

const statusLabels: Record<string, string> = {
  STARTING: 'Starting',
  RUNNING: 'Running',
  STOPPING: 'Stopping',
  STOPPED: 'Stopped',
  SLEEPING: 'Sleeping',
  ERROR: 'Error',
};

const CPU_OPTIONS_MC = [250, 500, 1000, 2000, 4000];
const MEM_OPTIONS_MB = [512, 1024, 2048, 4096, 8192];

function parseMemory(mem: string): number {
  const match = mem.match(/(\d+)(Mi|Gi)/);
  if (!match) return 0;
  const val = parseInt(match[1]);
  return match[2] === 'Gi' ? val * 1024 : val;
}

function parseCpu(cpu: string): number {
  const match = cpu.match(/(\d+)m/);
  if (!match) return 0;
  return parseInt(match[1]);
}

export function ServerCard({ server }: ServerCardProps) {
  const navigate = useNavigate();
  const memMb = parseMemory(server.memoryLimit);
  const cpuMc = parseCpu(server.cpuLimit);
  const memBarWidth = (memMb / Math.max(...MEM_OPTIONS_MB)) * 100;
  const cpuBarWidth = (cpuMc / Math.max(...CPU_OPTIONS_MC)) * 100;

  return (
    <Card
      hoverable
      padding="md"
      className={styles.card}
      onClick={() => navigate(`/servers/${server.id}`)}
    >
      <div className={styles.top}>
        <span className={styles.gameIcon}>{gameTypeIcons[server.gameType]}</span>
        <Badge variant={statusBadgeVariant[server.status]} pulse={server.status === 'STARTING' || server.status === 'STOPPING'}>
          {statusLabels[server.status]}
        </Badge>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{server.name}</h3>
        <span className={styles.type}>{gameTypeLabels[server.gameType]} · {server.region}</span>
      </div>

      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>CPU</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${cpuBarWidth}%` }} />
          </div>
          <span className={styles.barValue}>{server.cpuLimit}</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>RAM</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${memBarWidth}%`, background: 'linear-gradient(90deg, #8b5cf6, #d946ef)' }} />
          </div>
          <span className={styles.barValue}>{server.memoryLimit}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.stat}>
          <span className={styles.statIcon}>👤</span>
          <span className={styles.statValue}>{server.maxPlayers} players</span>
        </div>
        <StatusDot status={server.status} size="sm" />
      </div>
    </Card>
  );
}
