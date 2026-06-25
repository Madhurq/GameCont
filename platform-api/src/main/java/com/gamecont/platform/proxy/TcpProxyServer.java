package com.gamecont.platform.proxy;

import com.gamecont.platform.config.GameContProperties;
import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.repository.GameServerRepository;
import com.gamecont.platform.service.KubernetesService;
import com.gamecont.platform.service.WakeOnConnectProxy;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class TcpProxyServer {

    private static final Logger log = LoggerFactory.getLogger(TcpProxyServer.class);

    private final GameServerRepository serverRepo;
    private final WakeOnConnectProxy wakeProxy;
    private final KubernetesService kubeService;
    private final GameContProperties properties;

    private final Map<Integer, ServerSocket> serverSockets = new ConcurrentHashMap<>();
    private final Map<Integer, String> portToServerId = new ConcurrentHashMap<>();
    private final AtomicInteger nextPort;
    private final ExecutorService acceptorExecutor = new ThreadPoolExecutor(
            1, 4, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<>(8));
    private final ExecutorService connectionExecutor = new ThreadPoolExecutor(
            4, 50, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<>(100));
    private volatile boolean running = true;

    public TcpProxyServer(GameServerRepository serverRepo,
                          WakeOnConnectProxy wakeProxy,
                          KubernetesService kubeService,
                          GameContProperties properties) {
        this.serverRepo = serverRepo;
        this.wakeProxy = wakeProxy;
        this.kubeService = kubeService;
        this.properties = properties;
        this.nextPort = new AtomicInteger(properties.getProxy().getPortStart());
    }

    @PostConstruct
    public void init() {
        if (!properties.getProxy().isEnabled()) {
            log.info("TCP proxy is disabled");
            return;
        }
        List<GameServer> servers = serverRepo.findAll();
        for (GameServer server : servers) {
            if (server.getProxyPort() != null) {
                listenOnPort(server.getProxyPort(), server.getServerId());
            }
        }
        log.info("TCP proxy initialized, {} active ports", serverSockets.size());
    }

    public synchronized int allocatePort(String serverId) {
        int start = properties.getProxy().getPortStart();
        int end = properties.getProxy().getPortEnd();
        int port = nextPort.getAndUpdate(p -> p >= end ? start : p + 1);
        int attempts = 0;
        int maxAttempts = end - start + 1;
        while (attempts < maxAttempts) {
            if (!portToServerId.containsKey(port) && portAvailable(port)) {
                listenOnPort(port, serverId);
                return port;
            }
            port = nextPort.getAndUpdate(p -> p >= end ? start : p + 1);
            attempts++;
        }
        throw new IllegalStateException("No available proxy ports in range " + start + "-" + end);
    }

    public synchronized void freePort(int port) {
        ServerSocket socket = serverSockets.remove(port);
        if (socket != null) {
            try {
                socket.close();
            } catch (IOException e) {
                log.warn("Error closing proxy port {}: {}", port, e.getMessage());
            }
        }
        portToServerId.remove(port);
        log.info("Freed proxy port {}", port);
    }

    public String getServerIdForPort(int port) {
        return portToServerId.get(port);
    }

    private void listenOnPort(int port, String serverId) {
        try {
            ServerSocket serverSocket = new ServerSocket(port);
            serverSockets.put(port, serverSocket);
            portToServerId.put(port, serverId);
            acceptorExecutor.submit(() -> acceptConnections(port, serverSocket, serverId));
            log.info("Listening on proxy port {} for server {}", port, serverId);
        } catch (IOException e) {
            log.error("Failed to listen on proxy port {} for server {}: {}", port, serverId, e.getMessage());
        }
    }

    private void acceptConnections(int port, ServerSocket serverSocket, String serverId) {
        while (running && !serverSocket.isClosed()) {
            try {
                Socket clientSocket = serverSocket.accept();
                connectionExecutor.submit(() -> {
                    ProxyConnectionHandler handler = new ProxyConnectionHandler(
                            serverId, clientSocket, serverRepo, wakeProxy, kubeService, properties);
                    handler.handle();
                });
            } catch (IOException e) {
                if (running) {
                    log.warn("Accept failed on port {}: {}", port, e.getMessage());
                }
            }
        }
    }

    private boolean portAvailable(int port) {
        try (ServerSocket ignored = new ServerSocket(port)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    @PreDestroy
    public void shutdown() {
        running = false;
        for (ServerSocket socket : serverSockets.values()) {
            try {
                socket.close();
            } catch (IOException ignored) {}
        }
        serverSockets.clear();
        portToServerId.clear();
        acceptorExecutor.shutdownNow();
        connectionExecutor.shutdownNow();
        log.info("TCP proxy shut down");
    }
}
