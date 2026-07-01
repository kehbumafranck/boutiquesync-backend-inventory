package com.boutiquesync.config;

import com.boutiquesync.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuration Spring Security.
 * - Authentification stateless via JWT transmis par cookies HttpOnly
 * - CORS configuré pour le frontend React, avec credentials autorisés
 * - Headers de sécurité renforcés
 * - Autorisation basée sur les rôles (RBAC)
 * - 401 pour les requêtes non authentifiées, 403 pour les accès refusés
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${FRONTEND_URL:http://localhost:3000}")
    private String frontendUrl;

    // URLs supplémentaires séparées par des virgules (ex: prod + staging)
    @Value("${FRONTEND_EXTRA_URLS:}")
    private String frontendExtraUrls;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                // 401 quand le token est absent/invalide (non authentifié)
                .authenticationEntryPoint(unauthorizedEntryPoint())
                // 403 quand le user est authentifié mais n'a pas le bon rôle
                .accessDeniedHandler(accessDeniedHandler())
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/register-admin",
                    "/api/auth/2fa/verify",
                    "/api/auth/refresh",
                    "/api/auth/password/forgot",
                    "/api/auth/password/reset",
                    "/api/employees/invite/verify",
                    "/api/employees/invite/complete",
                    "/ws/**",
                    "/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/actuator/health"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .headers(headers -> headers
                .contentTypeOptions(contentType -> {})
                .frameOptions(frame -> frame.deny())
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true))
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    /**
     * Retourne HTTP 401 (Unauthorized) quand la requête n'a pas de token valide.
     * Sans ce bean, Spring renvoie 403 par défaut, ce qui empêche l'intercepteur
     * Axios de distinguer "token expiré" (401 → refresh) de "accès refusé" (403).
     */
    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"success\":false,\"message\":\"Non authentifié\",\"errorCode\":\"UNAUTHORIZED\"}"
            );
        };
    }

    /**
     * Retourne HTTP 403 (Forbidden) quand l'utilisateur est authentifié
     * mais n'a pas les permissions requises.
     */
    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"success\":false,\"message\":\"Accès refusé\",\"errorCode\":\"ACCESS_DENIED\"}"
            );
        };
    }

    /**
     * Configuration CORS pour autoriser le frontend React.
     * allowCredentials=true est obligatoire pour que le navigateur
     * envoie/accepte les cookies HttpOnly cross-origin.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Origines autorisées : localhost dev + URL configurée en production
        List<String> origins = new java.util.ArrayList<>(List.of(
            "http://localhost:3000",
            "http://localhost:5173",
            frontendUrl
        ));
        // URLs supplémentaires depuis la variable d'environnement FRONTEND_EXTRA_URLS
        if (frontendExtraUrls != null && !frontendExtraUrls.isBlank()) {
            for (String url : frontendExtraUrls.split(",")) {
                String trimmed = url.trim();
                if (!trimmed.isEmpty()) origins.add(trimmed);
            }
        }
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}