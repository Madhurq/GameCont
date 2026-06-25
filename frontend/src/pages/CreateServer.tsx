import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createServer, isSimulatorMode } from '../services/api';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Card } from '../components/Card/Card';
import { useToast } from '../hooks/useToast';
import type { GameType, CreateServerRequest } from '../types';
import styles from './CreateServer.module.css';

const gameTypes: { value: GameType; label: string; icon: string; desc: string }[] = [
  { value: 'MINECRAFT_VANILLA', label: 'Minecraft Vanilla', icon: '⛏', desc: 'Pure Minecraft experience' },
  { value: 'MINECRAFT_MODDED', label: 'Minecraft Modded', icon: '⚡', desc: 'With mod support' },
  { value: 'CUSTOM', label: 'Custom Game', icon: '⚙', desc: 'Docker-based custom server' },
];

const cpuOptions = ['250m', '500m', '1000m', '2000m', '4000m'];
const memOptions = ['512Mi', '1024Mi', '2048Mi', '4096Mi', '8192Mi'];
const regionOptions = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU West (Ireland)' },
  { value: 'eu-central-1', label: 'EU Central (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
];

const cpuLabels: Record<string, string> = {
  '250m': '0.25 vCPU',
  '500m': '0.5 vCPU',
  '1000m': '1 vCPU',
  '2000m': '2 vCPU',
  '4000m': '4 vCPU',
};

const memLabels: Record<string, string> = {
  '512Mi': '512 MB',
  '1024Mi': '1 GB',
  '2048Mi': '2 GB',
  '4096Mi': '4 GB',
  '8192Mi': '8 GB',
};

export function CreateServer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState<GameType>('MINECRAFT_VANILLA');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [region, setRegion] = useState('us-east-1');
  const [cpu, setCpu] = useState('500m');
  const [mem, setMem] = useState('1024Mi');
  const [storage, setStorage] = useState(5);

  const mutation = useMutation({
    mutationFn: (data: CreateServerRequest) => createServer(data),
    onSuccess: () => {
      toast('Server deployed successfully!', 'success');
      navigate('/dashboard');
    },
    onError: () => {
      toast('Failed to deploy server. Please try again.', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast('Please enter a server name', 'error');
      return;
    }
    mutation.mutate({
      name, gameType, maxPlayers, region, cpuLimit: cpu, memoryLimit: mem, storageGb: storage,
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>&gt; </span>
            Deploy Server
          </h1>
          <p className={styles.subtitle}>Provision a new K8s game server instance</p>
        </div>
      </div>

      {isSimulatorMode() && (
        <div className="simulator-banner">
          <span className="sim-icon">⚡</span>
          <div className="sim-text">
            <span className="sim-label">Simulator Mode</span> — Server will be created in local simulation.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Card variant="glass" padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Game Type</h2>
          <div className={styles.gameGrid}>
            {gameTypes.map((gt) => (
              <button
                key={gt.value}
                type="button"
                className={`${styles.gameCard} ${gameType === gt.value ? styles.gameActive : ''}`}
                onClick={() => setGameType(gt.value)}
              >
                <span className={styles.gameIcon}>{gt.icon}</span>
                <span className={styles.gameLabel}>{gt.label}</span>
                <span className={styles.gameDesc}>{gt.desc}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card variant="glass" padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <div className={styles.fieldRow}>
            <Input
              label="Server Name"
              placeholder="My Awesome Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.nameField}
            />
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Max Players</label>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>{maxPlayers}</span>
              </div>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Region</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {regionOptions.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <span className={styles.selectArrow}>▼</span>
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Resources</h2>
          <div className={styles.resGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>CPU</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                >
                  {cpuOptions.map((o) => (
                    <option key={o} value={o}>{cpuLabels[o]}</option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▼</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Memory</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={mem}
                  onChange={(e) => setMem(e.target.value)}
                >
                  {memOptions.map((o) => (
                    <option key={o} value={o}>{memLabels[o]}</option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▼</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Storage</label>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={storage}
                  onChange={(e) => setStorage(Number(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>{storage}GB</span>
              </div>
            </div>
          </div>
        </Card>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>&gt; Cancel</Button>
          <Button type="submit" loading={mutation.isPending} icon={<span>🚀</span>}>
            &gt; Deploy Server
          </Button>
        </div>
      </form>
    </div>
  );
}
