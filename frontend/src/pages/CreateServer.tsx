import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createServer } from '../services/api';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Card } from '../components/Card/Card';
import type { GameType, CreateServerRequest } from '../types';
import styles from './CreateServer.module.css';

const gameTypes: { value: GameType; label: string; icon: string; desc: string }[] = [
  { value: 'MINECRAFT_VANILLA', label: 'Minecraft Vanilla', icon: '⛏', desc: 'Pure Minecraft experience' },
  { value: 'MINECRAFT_MODDED', label: 'Minecraft Modded', icon: '⚡', desc: 'With mod support' },
  { value: 'CUSTOM', label: 'Custom Game', icon: '⚙', desc: 'Docker-based custom server' },
];

const cpuOptions = ['250m', '500m', '1000m', '2000m', '4000m'];
const memOptions = ['512Mi', '1024Mi', '2048Mi', '4096Mi', '8192Mi'];
const regionOptions = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1'];

export function CreateServer() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState<GameType>('MINECRAFT_VANILLA');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [region, setRegion] = useState('us-east-1');
  const [cpu, setCpu] = useState('500m');
  const [mem, setMem] = useState('1024Mi');
  const [storage, setStorage] = useState(5);

  const mutation = useMutation({
    mutationFn: (data: CreateServerRequest) => createServer(data),
    onSuccess: () => navigate('/'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name, gameType, maxPlayers, region, cpuLimit: cpu, memoryLimit: mem, storageGb: storage,
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Create Server</h1>
          <p className={styles.subtitle}>Provision a new game server</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
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
            <select
              className={styles.select}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {regionOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </Card>

        <Card variant="glass" padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Resources</h2>
          <div className={styles.resGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>CPU: {cpu}</label>
              <select
                className={styles.select}
                value={cpu}
                onChange={(e) => setCpu(e.target.value)}
              >
                {cpuOptions.map((o) => (
                  <option key={o} value={o}>{o === '1000m' ? '1 vCPU' : o === '2000m' ? '2 vCPU' : o === '4000m' ? '4 vCPU' : o}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Memory: {mem}</label>
              <select
                className={styles.select}
                value={mem}
                onChange={(e) => setMem(e.target.value)}
              >
                {memOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Storage: {storage}GB</label>
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
          <Button variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending} icon={<span>🚀</span>}>
            Deploy Server
          </Button>
        </div>
      </form>
    </div>
  );
}
