import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { registerUser, setSimulatorMode } from '../services/api';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Card } from '../components/Card/Card';
import styles from './Register.module.css';

export function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ username: false, email: false, password: false });
  const [showOffline, setShowOffline] = useState(false);

  const usernameError = touched.username && !username ? 'Username is required'
    : touched.username && username.length > 0 && username.length < 3 ? 'Min 3 characters'
    : '';
  const emailError = touched.email && !email ? 'Email is required' : '';
  const passwordError = touched.password && password.length > 0 && password.length < 8
    ? 'Password must be at least 8 characters'
    : touched.password && !password
    ? 'Password is required'
    : '';

  const isValid = username.length >= 3 && email && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true });
    setError('');
    if (!username || !email || password.length < 8) {
      setError('Please check the form for errors');
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser({ username, email, password });
      login(res.token, res.userId, res.username, res.email);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === 'BACKEND_OFFLINE') {
        setShowOffline(true);
        setError('Backend server is offline');
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSimulator = () => {
    setSimulatorMode(true);
    login('sim-jwt-' + Date.now(), 'sim-user-1', username || 'operator', email || 'operator@gamecont.local');
    navigate('/dashboard');
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.bgGlow2} />
      <div className={styles.scanLine} />

      <Card variant="glass" padding="lg" className={`${styles.card} cyber-frame`}>
        <div className={styles.header}>
          <span className={styles.logo}>◈</span>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>&gt; </span>
            Create Identity
          </h1>
          <p className={styles.subtitle}>
            <span className={styles.blinkDot} />
            Initialize your GameCont profile
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
            label="Username"
            placeholder="Choose a callsign (3+ chars)"
            value={username}
            error={usernameError}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
          />
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
            placeholder="At least 8 characters"
            value={password}
            error={passwordError}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          />
          {error && <span className={styles.error}>[ERR] {error}</span>}
          <Button type="submit" fullWidth loading={loading} disabled={!isValid && touched.username && touched.email && touched.password}>
            <span className={styles.btnText}>&gt; Initialize Account</span>
          </Button>
        </form>
        <p className={styles.footer}>
          Already registered? <Link to="/login">&gt; Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
