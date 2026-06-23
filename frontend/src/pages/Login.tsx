import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 800));
    if (email && password) {
      login('mock-jwt-token', 'user-1', email.split('@')[0], email);
      navigate('/');
    } else {
      setError('Please fill in all fields');
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <Card variant="glass" padding="lg" className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>◈</span>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to manage your game servers</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <span className={styles.error}>{error}</span>}
          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>
        <p className={styles.footer}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </Card>
    </div>
  );
}
