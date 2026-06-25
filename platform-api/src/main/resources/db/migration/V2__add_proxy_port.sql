-- ═══════════════════════════════════════════════════════════════
-- GameCont — Add Proxy Port for TCP Wake-on-Connect Proxy
-- ═══════════════════════════════════════════════════════════════
--
-- The TCP proxy listens on proxy_port for each server.
-- When a player connects, if the server is SLEEPING, the proxy
-- triggers wake-on-connect before forwarding traffic.

ALTER TABLE game_servers ADD COLUMN proxy_port INTEGER;

CREATE INDEX IF NOT EXISTS idx_server_proxy_port ON game_servers(proxy_port);
