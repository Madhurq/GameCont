package com.gamecont.platform.config;

import com.gamecont.platform.security.JwtTokenProvider;
import com.gamecont.platform.repository.GameServerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    private final JwtTokenProvider jwtTokenProvider;
    private final GameServerRepository serverRepo;

    public WebSocketAuthInterceptor(JwtTokenProvider jwtTokenProvider,
                                     GameServerRepository serverRepo) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.serverRepo = serverRepo;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        StompCommand command = accessor.getCommand();
        if (command == null) return message;

        switch (command) {
            case CONNECT:
                return handleConnect(accessor, message);
            case SUBSCRIBE:
                return handleSubscribe(accessor, message);
            default:
                return message;
        }
    }

    private Message<?> handleConnect(StompHeaderAccessor accessor, Message<?> message) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            log.warn("WebSocket CONNECT without Authorization header");
            return null;
        }

        String token = authHeaders.get(0).replace("Bearer ", "");
        if (!jwtTokenProvider.validateToken(token)) {
            log.warn("WebSocket CONNECT with invalid JWT token");
            return null;
        }

        String userId = jwtTokenProvider.getUserIdFromToken(token);
        Principal user = () -> userId;
        accessor.setUser(user);
        return message;
    }

    private Message<?> handleSubscribe(StompHeaderAccessor accessor, Message<?> message) {
        Principal user = accessor.getUser();
        if (user == null) return null;

        String destination = accessor.getDestination();
        if (destination == null) return null;

        if (destination.startsWith("/topic/logs/")) {
            String serverId = destination.substring("/topic/logs/".length());
            if (!ownsServer(serverId, user.getName())) {
                log.warn("User {} denied subscription to /topic/logs/{} (not owner)", user.getName(), serverId);
                return null;
            }
        }

        return message;
    }

    private boolean ownsServer(String serverId, String userId) {
        return serverRepo.findOwnerIdById(serverId)
                .map(ownerId -> ownerId.equals(userId))
                .orElse(false);
    }
}
