import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServer, updateServer } from '../services/api';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Card } from '../components/Card/Card';
import { useToast } from '../hooks/useToast';
import styles from './EditServer.module.css';

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
  '250m': '0.25 vCPU', '500m': '0.5 vCPU', '1000m': '1 vCPU',
  '2000m': '2 vCPU', '4000m': '4 vCPU',
};

const memLabels: Record<string, string> = {
  '512Mi': '512 MB', '1024Mi': '1 GB', '2048Mi': '2 GB',
  '4096Mi': '4 GB', '8192Mi': '8 GB',
};

export function EditServer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [region, setRegion] = useState('us-east-1');
  const [cpu, setCpu] = useState('500m');
  const [mem, setMem] = useState('1024Mi');
  const [storage, setStorage] = useState(5);

  const { data: server, isLoading } = useQuery({
    queryKey: ['server', id],
    queryFn: () => fetchServer(id!),
    enabled: !!id,
  });

  const initialRef = useRef(false);
  useEffect(() => {
    if (server && !initialRef.current) {
      setName(server.name);
      setMaxPlayers(server.maxPlayers);
      setRegion(server.region);
      setCpu(server.cpuLimit);
      setMem(server.memoryLimit);
      setStorage(server.storageGb);
      initialRef.current = true;
    }
  }, [server]);

  const mutation = useMutation({
    mutationFn: (data: { name: string; maxPlayers: number; region: string; cpuLimit: string; memoryLimit: string; storageGb: number }) =>
      updateServer(id!, data),
    onSuccess: () => {
      toast('Server updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      navigate(`/servers/${id}`);
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to update server.', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}><span className={styles.spinner} /></div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.errorText}>Server not found</p>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>&gt; Back</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast('Server name is required', 'error');
      return;
    }
    mutation.mutate({ name, maxPlayers, region, cpuLimit: cpu, memoryLimit: mem, storageGb: storage });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titlePrefix}>&gt; </span>
          Edit: {server.name}
        </h1>
        <p className={styles.subtitle}>Modify server configuration</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
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
                  min={1} max={100}
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
              <select className={styles.select} value={region} onChange={(e) => setRegion(e.target.value)}>
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
                <select className={styles.select} value={cpu} onChange={(e) => setCpu(e.target.value)}>
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
                <select className={styles.select} value={mem} onChange={(e) => setMem(e.target.value)}>
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
                  type="range" min={1} max={50}
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
          <Button variant="ghost" onClick={() => navigate(`/servers/${id}`)}>&gt; Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>&gt; Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
