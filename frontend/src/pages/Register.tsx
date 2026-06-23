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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 1000));
    if (username && email && password.length >= 6) {
      login('mock-jwt-token', 'user-1', username, email);
      navigate('/');
    } else {
      setError('Password must be at least 6 characters');
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <Card variant="glass" padding="lg" className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>◈</span>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Get started with GameCont</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
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
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <span className={styles.error}>{error}</span>}
          <Button type="submit" fullWidth loading={loading}>
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
