package com.gamecont.platform.security;

import jakarta.annotation.PreDestroy;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
@Order(1)
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);
    private static final int WINDOW_MS = 60_000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleanupExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "rate-limit-cleanup");
        t.setDaemon(true);
        return t;
    });

    public RateLimitingFilter() {
        cleanupExecutor.scheduleAtFixedRate(this::cleanupStaleBuckets, 60, 60, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void destroy() {
        cleanupExecutor.shutdownNow();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String clientIp = getClientIp(request);

        String group = resolveGroup(path, request.getMethod());
        if (group == null) {
            filterChain.doFilter(request, response);
            return;
        }

        int limit = getLimit(group);
        String key = clientIp + ":" + group;
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(limit, WINDOW_MS));

        if (!bucket.tryConsume()) {
            log.warn("Rate limit exceeded for {} on {}", clientIp, path);
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Please slow down.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveGroup(String path, String method) {
        if (path.startsWith("/api/auth/")) return "auth";
        if (path.startsWith("/api/servers/") && method.equals("POST")) return "servers";
        if (path.startsWith("/api/servers/") && path.endsWith("/command")) return "command";
        if (path.startsWith("/api/servers/") && path.contains("/files")) return "files";
        return null;
    }

    private int getLimit(String group) {
        return switch (group) {
            case "auth" -> 10;
            case "servers" -> 30;
            case "command" -> 20;
            case "files" -> 60;
            default -> 60;
        };
    }

    private void cleanupStaleBuckets() {
        long now = System.currentTimeMillis();
        buckets.entrySet().removeIf(e -> now - e.getValue().windowStart > e.getValue().windowMs);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class Bucket {
        private int count;
        private final int limit;
        private final long windowMs;
        private long windowStart;

        Bucket(int limit, long windowMs) {
            this.limit = limit;
            this.windowMs = windowMs;
            this.windowStart = System.currentTimeMillis();
        }

        synchronized boolean tryConsume() {
            long now = System.currentTimeMillis();
            if (now - windowStart > windowMs) {
                count = 0;
                windowStart = now;
            }
            count++;
            return count <= limit;
        }
    }
}
