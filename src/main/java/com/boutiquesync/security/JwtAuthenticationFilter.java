package com.boutiquesync.security;

import com.boutiquesync.model.User;
import com.boutiquesync.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filtre d'authentification JWT.
 * Intercepte chaque requête HTTP pour extraire et valider le token JWT,
 * d'abord depuis le cookie "accessToken", puis depuis le header
 * Authorization (Bearer) en repli (utile pour Swagger/Postman/clients API).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/auth/login",
        "/api/auth/register-admin",
        "/api/auth/2fa/verify",
        "/api/auth/refresh",
        "/api/auth/password/forgot",
        "/api/auth/password/reset",
        "/api/employees/invite/verify",
        "/api/employees/invite/complete",
        "/swagger-ui",
        "/api-docs",
        "/actuator/health"
    );

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getServletPath();
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (StringUtils.hasText(token)) {
            try {
                Claims claims = jwtTokenProvider.validateToken(token);

                if ("2FA_TEMP".equals(claims.get("type", String.class))) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String userId = claims.getSubject();
                String role = claims.get("role", String.class);

                if (userId != null && role != null) {
                    User user = userRepository.findById(userId).orElse(null);
                    if (user != null && user.isActive()) {
                        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                        var authentication = new UsernamePasswordAuthenticationToken(
                                new UserPrincipal(
                                    user.getId(),
                                    user.getEmail(),
                                    user.getRole().name(),
                                    user.getFirstName() + " " + user.getLastName()
                                ),
                                null,
                                authorities
                        );
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (JwtException e) {
                log.debug("Token JWT invalide: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extrait le token JWT : priorité au cookie "accessToken",
     * sinon repli sur le header Authorization: Bearer ...
     */
    private String extractToken(HttpServletRequest request) {
        String cookieToken = jwtTokenProvider.getAccessTokenFromCookies(request);
        if (StringUtils.hasText(cookieToken)) {
            return cookieToken;
        }

        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}