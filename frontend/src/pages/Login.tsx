import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { loginUser, setSimulatorMode } from '../services/api';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Card } from '../components/Card/Card';
import styles from './Login.module.css';

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showOffline, setShowOffline] = useState(false);

  const emailError = touched.email && !email ? 'Email is required' : '';
  const passwordError = touched.password && !password ? 'Password is required' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      login(res.token, res.userId, res.username, res.email);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === 'BACKEND_OFFLINE') {
        setShowOffline(true);
        setError('Backend server is offline');
      } else {
        setError(err.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSimulator = () => {
    setSimulatorMode(true);
    login('sim-jwt-' + Date.now(), 'sim-user-1', email.split('@')[0] || 'operator', email || 'operator@gamecont.local');
    navigate('/dashboard');
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.bgGlow2} />

      {/* Ambient scan line */}
      <div className={styles.scanLine} />

      <Card variant="glass" padding="lg" className={`${styles.card} cyber-frame`}>
        <div className={styles.header}>
          <span className={styles.logo}>◈</span>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>&gt; </span>
            Access Terminal
          </h1>
          <p className={styles.subtitle}>
            <span className={styles.blinkDot} />
            Authenticate to control your servers
          </p>
        </div>

        {showOffline && (
          <div className="simulator-banner">
            <span className="sim-icon">⚡</span>
            <div className="sim-text">
              <span className="sim-label">Backend Offline</span> — Server at localhost:8080 is unreachable.
            </div>
            <Button variant="ghost" size="sm" onClick={handleSimulator}>
              Enter Simulator
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="operator@gamecont.io"
            value={email}
            error={emailError}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            error={passwordError}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          />
          {error && <span className={styles.error}>[ERR] {error}</span>}
          <Button type="submit" fullWidth loading={loading}>
            <span className={styles.btnText}>&gt; Authenticate</span>
          </Button>
        </form>
        <p className={styles.footer}>
          No account? <Link to="/register">&gt; Create one</Link>
        </p>
      </Card>
    </div>
  );
}
