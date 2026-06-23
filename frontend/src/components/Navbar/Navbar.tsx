import { useAuthStore } from '../../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../Button/Button';
import styles from './Navbar.module.css';

export function Navbar() {
  const { username, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) return null;

  return (
    <nav className={`${styles.nav} glass`}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <a className={styles.logo} onClick={() => navigate('/')}>
            <span className={styles.logoIcon}>◈</span>
            <span className={styles.logoText}>GameCont</span>
          </a>
          <div className={styles.links}>
            <a
              className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}
              onClick={() => navigate('/')}
            >
              Dashboard
            </a>
          </div>
        </div>
        <div className={styles.right}>
          <span className={styles.username}>{username}</span>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
