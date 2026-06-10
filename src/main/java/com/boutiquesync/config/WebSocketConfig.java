package com.boutiquesync.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuration WebSocket avec STOMP over SockJS.
 * Permet la communication temps réel entre le backend et le frontend React.
 * Utilisé pour pousser les mises à jour du dashboard et les alertes stock.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${FRONTEND_URL:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Préfixe pour les topics de diffusion (serveur → client)
        config.enableSimpleBroker("/topic");
        // Préfixe pour les messages envoyés par le client
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Point d'entrée WebSocket avec fallback SockJS
        registry.addEndpoint("/ws")
                .setAllowedOrigins(frontendUrl, "https://app.boutiquesync.cm")
                .withSockJS();
    }
}
