-- ═══════════════════════════════════════════════════════════════
-- GameCont — Initial Database Schema
-- ═══════════════════════════════════════════════════════════════
-- Production target: AWS RDS PostgreSQL db.t3.micro (Free Tier)
--   - 20 GB gp2 storage
--   - 750 hrs/month
--   - Single-AZ only
--
-- This migration creates the core tables for user management,
-- game server tracking, and audit logging.

-- ── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(36)  PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Game Servers ────────────────────────────────────────────
-- Each row maps 1:1 to a set of K8s resources (Deployment + Service + PVC + ConfigMap).
-- The server_id column is the K8s resource name prefix (e.g., "gs-a1b2c3d4").
CREATE TABLE IF NOT EXISTS game_servers (
    id              VARCHAR(36)  PRIMARY KEY,
    server_id       VARCHAR(20)  NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    game_type       VARCHAR(30)  NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    max_players     INTEGER      NOT NULL DEFAULT 10,
    region          VARCHAR(20),
    cpu_limit       VARCHAR(10)  DEFAULT '500m',
    memory_limit    VARCHAR(10)  DEFAULT '512Mi',
    storage_gb      INTEGER      DEFAULT 2,
    game_port       INTEGER      DEFAULT 25565,
    node_port       INTEGER,
    owner_id        VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at  TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_server_owner ON game_servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_server_status ON game_servers(status);
CREATE INDEX IF NOT EXISTS idx_server_id_unique ON game_servers(server_id);

-- ── Audit Logs ──────────────────────────────────────────────
-- Immutable event log for all platform actions.
-- Used for debugging, compliance, and usage analytics.
CREATE TABLE IF NOT EXISTS audit_logs (
    id              VARCHAR(36)  PRIMARY KEY,
    action          VARCHAR(50)  NOT NULL,
    server_id       VARCHAR(20),
    user_id         VARCHAR(36),
    details         TEXT,
    source          VARCHAR(50),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_server ON audit_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(created_at);
