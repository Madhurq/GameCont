import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button/Button';
import styles from './Landing.module.css';

const features = [
  {
    icon: '⚡',
    title: 'One-Click Deploy',
    desc: 'Spin up game servers in seconds. Pre-configured templates for Minecraft, Valheim, and more.',
  },
  {
    icon: '📡',
    title: 'Live Monitoring',
    desc: 'Real-time CPU, memory, TPS and player metrics. Complete server telemetry at a glance.',
  },
  {
    icon: '🛡️',
    title: 'DDoS Protection',
    desc: 'Enterprise-grade traffic mitigation built in. Your players stay connected no matter what.',
  },
  {
    icon: '⏱',
    title: 'Auto-Sleep & Wake',
    desc: 'Servers auto-hibernate when idle and wake on player connect. Zero-cost downtime.',
  },
  {
    icon: '🌐',
    title: 'Global Regions',
    desc: 'Deploy across North America, Europe, and Asia Pacific. Sub-20ms latency guaranteed.',
  },
  {
    icon: '🖥️',
    title: 'Terminal Console',
    desc: 'Full STOMP WebSocket console with live log streaming. Execute commands in real-time.',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<15ms', label: 'Avg Latency' },
  { value: '50K+', label: 'Servers Deployed' },
  { value: '2M+', label: 'Players Online' },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* ── Nav ────────────────────────────────────────────────── */}
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

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
          <div className={styles.orb3} />
          <div className={styles.gridLines} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot} />
            <span className={styles.badgeText}>Game Server Control Platform</span>
          </div>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroLine1}>Command Your</span>
            <span className={styles.heroHighlight}>Game Servers</span>
            <span className={styles.heroLine2}>From One Terminal</span>
          </h1>
          <p className={styles.heroSub}>
            Deploy, monitor, and manage game servers across the globe with
            Kubernetes orchestration, real-time WebSocket logs, and zero-downtime updates.
          </p>
          <div className={styles.heroTerminal}>
            <div className={styles.termHeader}>
              <span className={styles.termDot} style={{ background: '#ff5f57' }} />
              <span className={styles.termDot} style={{ background: '#febc2e' }} />
              <span className={styles.termDot} style={{ background: '#28c840' }} />
              <span className={styles.termTitle}>gamecont-cli</span>
            </div>
            <div className={styles.termBody}>
              <span className={styles.termPrompt}>$</span>
              <span className={styles.termCmd}> gamecont deploy --game minecraft --region us-east-1</span>
              <br />
              <span className={styles.termOutput}>✓ Server "survival-world" deployed in 4.2s</span>
              <br />
              <span className={styles.termOutput}>✓ Connect: gamecont.io:30001</span>
              <span className={styles.termCursor} />
            </div>
          </div>
          <div className={styles.heroActions}>
            <Button size="lg" onClick={() => navigate('/register')}>
              &gt; Start Free Trial
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
          <div className={styles.heroMeta}>
            <span>No credit card required</span>
            <span className={styles.metaSep}>·</span>
            <span>Free tier included</span>
            <span className={styles.metaSep}>·</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section id="stats" className={styles.stats}>
        <div className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} className={`${styles.statCard} cyber-frame`}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
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
            <div key={f.title} className={`${styles.featureCard} cyber-frame`}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.ctaBg}>
          <div className={styles.ctaOrb} />
        </div>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>&gt; Ready to take control?</h2>
          <p className={styles.ctaSub}>
            Join thousands of server operators. Deploy your first server in under a minute.
          </p>
          <Button size="lg" onClick={() => navigate('/register')}>
            &gt; Initialize Server
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
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
