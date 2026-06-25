package com.gamecont.platform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket configuration for real-time features:
 *
 * - Log streaming: subscribe to /topic/logs/{serverId}
 * - Server status updates: subscribe to /topic/servers/{serverId}/status
 * - Player count updates: subscribe to /topic/servers/{serverId}/players
 *
 * Uses Spring's built-in simple in-memory message broker (zero overhead).
 * If scaling beyond a single instance, swap to an external STOMP broker
 * (RabbitMQ supports STOMP protocol natively).
 *
 * Frontend connects to: ws://host:8080/ws
 * Then subscribes to topics via STOMP protocol.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    public WebSocketConfig(WebSocketAuthInterceptor webSocketAuthInterceptor) {
        this.webSocketAuthInterceptor = webSocketAuthInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple in-memory broker for /topic destinations
        // (server → client push for logs, status, metrics)
        config.enableSimpleBroker("/topic");

        // Prefix for messages FROM clients TO server
        // e.g., /app/server/{id}/command  (sending console commands)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint that clients connect to
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // CORS — restrict in production
                .withSockJS();                   // Fallback for older browsers
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // JWT authentication interceptor for STOMP CONNECT and SUBSCRIBE
        registration.interceptors(webSocketAuthInterceptor);
    }
}
