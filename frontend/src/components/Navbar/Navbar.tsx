import { useAuthStore } from '../../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../Button/Button';
import styles from './Navbar.module.css';

export function Navbar() {
  const { username, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const initial = username ? username[0].toUpperCase() : '?';

  return (
    <nav className={`${styles.nav} glass`}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <button className={styles.logo} onClick={() => navigate('/')} type="button">
            <span className={styles.logoIcon}>◈</span>
            <span className={styles.logoText}>GameCont</span>
          </button>
          <div className={styles.links}>
            <button
              className={`${styles.link} ${location.pathname === '/dashboard' || (location.pathname.startsWith('/servers') && location.pathname !== '/servers/create') ? styles.active : ''}`}
              onClick={() => navigate('/dashboard')}
              type="button"
            >
              Dashboard
            </button>
            <button
              className={`${styles.link} ${location.pathname === '/servers/create' ? styles.active : ''}`}
              onClick={() => navigate('/servers/create')}
              type="button"
            >
              + Deploy
            </button>
          </div>
        </div>
        <div className={styles.right}>
          <span className={styles.avatar}>{initial}</span>
          <span className={styles.username}>{username}</span>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
