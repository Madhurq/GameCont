import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button/Button';
import styles from './Landing.module.css';

const features = [
  {
    icon: '⚡',
    title: 'One-Click Deploy',
    desc: 'Spin up game servers in seconds. Support for Minecraft, Valheim, Terraria, and more with pre-configured templates.',
  },
  {
    icon: '📊',
    title: 'Live Monitoring',
    desc: 'Real-time CPU, memory, and player metrics. Know exactly what your servers are doing at a glance.',
  },
  {
    icon: '🛡️',
    title: 'DDoS Protection',
    desc: 'Enterprise-grade mitigation built in. Your players stay connected no matter what.',
  },
  {
    icon: '🔄',
    title: 'Auto Backups',
    desc: 'Scheduled snapshots with one-click restore. Never lose your world saves again.',
  },
  {
    icon: '🌍',
    title: 'Global Regions',
    desc: 'Deploy across北美, Europe, Asia, and Australia. Low latency for every player.',
  },
  {
    icon: '🎮',
    title: 'Console Access',
    desc: 'Full terminal console with live output. Execute commands, monitor logs, manage plugins.',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '15ms', label: 'Avg Ping' },
  { value: '50K+', label: 'Servers' },
  { value: '2M+', label: 'Players' },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◈</span>
            <span className={styles.logoText}>GameCont</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#stats" className={styles.navLink}>Stats</a>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
          <div className={styles.orb3} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot} />
            Game Server Control Platform
          </div>
          <h1 className={styles.heroTitle}>
            Command Your{' '}
            <span className={styles.heroHighlight}>Game Servers</span>
            <br />
            From One Place
          </h1>
          <p className={styles.heroSub}>
            Deploy, monitor, and manage game servers across the globe with
            blazing-fast performance, DDoS protection, and real-time insights.
          </p>
          <div className={styles.heroActions}>
            <Button size="lg" onClick={() => navigate('/register')}>
              Start Free Trial
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
          <div className={styles.heroMeta}>
            <span>No credit card required</span>
            <span className={styles.metaSep}>•</span>
            <span>Free tier included</span>
            <span className={styles.metaSep}>•</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className={styles.stats}>
        <div className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Everything you need to{' '}
            <span className={styles.sectionHighlight}>dominate</span>
          </h2>
          <p className={styles.sectionSub}>
            From indie servers to massive networks — GameCont scales with you.
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaBg}>
          <div className={styles.ctaOrb} />
        </div>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to take control?</h2>
          <p className={styles.ctaSub}>
            Join thousands of server owners. Deploy your first server in under a minute.
          </p>
          <Button size="lg" onClick={() => navigate('/register')}>
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.footerLogo}>◈ GameCont</span>
            <span className={styles.footerCopy}>
              © {new Date().getFullYear()} GameCont. All rights reserved.
            </span>
          </div>
          <div className={styles.footerLinks}>
            <a href="#" className={styles.footerLink}>Docs</a>
            <a href="#" className={styles.footerLink}>API</a>
            <a href="#" className={styles.footerLink}>Status</a>
            <a href="#" className={styles.footerLink}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
