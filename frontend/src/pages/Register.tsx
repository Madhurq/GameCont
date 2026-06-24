import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
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

  const usernameError = touched.username && !username ? 'Username is required' : '';
  const emailError = touched.email && !email ? 'Email is required' : '';
  const passwordError = touched.password && password.length > 0 && password.length < 6
    ? 'Password must be at least 6 characters'
    : touched.password && !password
    ? 'Password is required'
    : '';

  const isValid = username && email && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true });
    setError('');
    if (!username || !email || password.length < 6) {
      setError('Please check the form for errors');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    login('mock-jwt-token', 'user-1', username, email);
    navigate('/');
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.bgGlow2} />
      <Card variant="glass" padding="lg" className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>◈</span>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Get started with GameCont</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Username"
            placeholder="Choose a username"
            value={username}
            error={usernameError}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            error={emailError}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            error={passwordError}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          />
          {error && <span className={styles.error}>{error}</span>}
          <Button type="submit" fullWidth loading={loading} disabled={!isValid && touched.username && touched.email && touched.password}>
            Create Account
          </Button>
        </form>
        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
