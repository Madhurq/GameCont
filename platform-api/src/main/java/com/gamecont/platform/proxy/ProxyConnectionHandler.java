package com.gamecont.platform.proxy;

import com.gamecont.platform.config.GameContProperties;
import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.model.ServerStatus;
import com.gamecont.platform.repository.GameServerRepository;
import com.gamecont.platform.service.KubernetesService;
import com.gamecont.platform.service.WakeOnConnectProxy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

public class ProxyConnectionHandler {

    private static final Logger log = LoggerFactory.getLogger(ProxyConnectionHandler.class);
    private static final int POLL_INTERVAL_MS = 2000;
    private static final int BUFFER_SIZE = 8192;

    private final String serverId;
    private final Socket clientSocket;
    private final GameServerRepository serverRepo;
    private final WakeOnConnectProxy wakeProxy;
    private final KubernetesService kubeService;
    private final int wakeTimeoutSeconds;

    public ProxyConnectionHandler(String serverId, Socket clientSocket,
                                  GameServerRepository serverRepo,
                                  WakeOnConnectProxy wakeProxy,
                                  KubernetesService kubeService,
                                  GameContProperties properties) {
        this.serverId = serverId;
        this.clientSocket = clientSocket;
        this.serverRepo = serverRepo;
        this.wakeProxy = wakeProxy;
        this.kubeService = kubeService;
        this.wakeTimeoutSeconds = properties.getProxy().getWakeTimeoutSeconds();
    }

    public void handle() {
        String clientAddr = clientSocket.getRemoteSocketAddress().toString();
        log.info("Proxy connection from {} for server {}", clientAddr, serverId);

        try (clientSocket) {
            Optional<GameServer> opt = serverRepo.findByServerId(serverId);
            if (opt.isEmpty()) {
                log.warn("Server {} not found, closing proxy connection from {}", serverId, clientAddr);
                return;
            }

            GameServer server = opt.get();
            ServerStatus status = server.getStatus();

            switch (status) {
                case RUNNING -> forwardToServer(clientAddr);
                case SLEEPING -> handleSleeping(clientAddr);
                case STARTING -> waitForReadyAndForward(clientAddr);
                default -> {
                    log.info("Server {} is {} (not connectable), closing proxy connection from {}",
                            serverId, status, clientAddr);
                }
            }
        } catch (Exception e) {
            log.error("Proxy connection error for server {}: {}", serverId, e.getMessage());
        }
    }

    private void handleSleeping(String clientAddr) {
        log.info("Server {} is SLEEPING, triggering wake-on-connect for {}", serverId, clientAddr);
        boolean woken = wakeProxy.wakeServer(serverId);
        if (woken) {
            forwardToServer(clientAddr);
        } else {
            log.warn("Failed to wake server {}, closing proxy connection from {}", serverId, clientAddr);
        }
    }

    private void waitForReadyAndForward(String clientAddr) {
        log.info("Server {} is STARTING, waiting for readiness for {}", serverId, clientAddr);
        Instant deadline = Instant.now().plusSeconds(wakeTimeoutSeconds);
        while (Instant.now().isBefore(deadline)) {
            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            Optional<GameServer> opt = serverRepo.findByServerId(serverId);
            if (opt.isPresent() && opt.get().getStatus() == ServerStatus.RUNNING) {
                log.info("Server {} is now RUNNING, forwarding connection from {}", serverId, clientAddr);
                forwardToServer(clientAddr);
                return;
            }
        }
        log.warn("Server {} did not become ready within {}s, closing proxy connection from {}",
                serverId, wakeTimeoutSeconds, clientAddr);
    }

    private void forwardToServer(String clientAddr) {
        String host = kubeService.getNodeExternalIp();
        Optional<GameServer> opt = serverRepo.findByServerId(serverId);
        if (opt.isEmpty() || opt.get().getNodePort() == null) {
            log.warn("Cannot forward for server {}: no node port available", serverId);
            return;
        }
        int nodePort = opt.get().getNodePort();
        log.info("Proxying connection from {} to {}:{} for server {}", clientAddr, host, nodePort, serverId);

        try (Socket backendSocket = new Socket(host, nodePort)) {
            backendSocket.setSoTimeout(0);
            clientSocket.setSoTimeout(0);

            Thread c2s = Thread.startVirtualThread(() -> pipe(clientSocket, backendSocket));
            Thread s2c = Thread.startVirtualThread(() -> pipe(backendSocket, clientSocket));

            c2s.join();
            s2c.join();
        } catch (IOException e) {
            log.warn("Proxy forwarding failed for server {}: {}", serverId, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void pipe(Socket from, Socket to) {
        try (InputStream in = from.getInputStream(); OutputStream out = to.getOutputStream()) {
            byte[] buf = new byte[BUFFER_SIZE];
            int read;
            while ((read = in.read(buf)) != -1) {
                out.write(buf, 0, read);
                out.flush();
            }
        } catch (IOException ignored) {
        }
    }
}
