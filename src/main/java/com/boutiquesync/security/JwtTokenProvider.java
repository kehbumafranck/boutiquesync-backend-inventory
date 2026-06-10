package com.boutiquesync.security;

import com.boutiquesync.config.SecurityProperties;
import com.boutiquesync.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * Fournisseur de tokens JWT.
 * Gère la génération, la validation et l'extraction des claims des tokens.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    private final SecurityProperties securityProperties;
    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        // Décoder la clé depuis base64
        String secret = securityProperties.getJwt().getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "JWT_SECRET non configuré. Générez une clé avec: openssl rand -base64 32");
        }
        try {
            byte[] decodedKey = Base64.getDecoder().decode(secret);
            if (decodedKey.length < 32) {
                throw new IllegalStateException(
                    "JWT_SECRET trop court (" + decodedKey.length * 8 + " bits). Minimum requis: 256 bits.");
            }
            this.secretKey = Keys.hmacShaKeyFor(decodedKey);
            log.info("JWT Secret key initialized (size: {} bits)", decodedKey.length * 8);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                "JWT_SECRET invalide (pas du base64 valide). Générez une clé avec: openssl rand -base64 32", e);
        }
    }

    /**
     * Génère un token d'accès JWT pour un utilisateur.
     *
     * @param user L'utilisateur authentifié
     * @return Le token JWT signé
     */
    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + securityProperties.getJwt().getAccessTokenExpiry() * 1000);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getId())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuer(securityProperties.getJwt().getIssuer())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Génère un refresh token JWT.
     *
     * @param user L'utilisateur authentifié
     * @return Le refresh token signé avec son JTI
     */
    public TokenPair generateRefreshToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + securityProperties.getJwt().getRefreshTokenExpiry() * 1000);
        String jti = UUID.randomUUID().toString();

        String token = Jwts.builder()
                .id(jti)
                .subject(user.getId())
                .issuer(securityProperties.getJwt().getIssuer())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();

        return new TokenPair(token, jti);
    }

    /**
     * Génère un token temporaire pour le flux 2FA (15 minutes).
     *
     * @param user L'utilisateur en cours d'authentification 2FA
     * @return Le token temporaire
     */
    public String generateTempToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getId())
                .claim("type", "2FA_TEMP")
                .issuer(securityProperties.getJwt().getIssuer())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Valide un token JWT et retourne les claims.
     *
     * @param token Le token à valider
     * @return Les claims du token
     * @throws JwtException si le token est invalide
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .requireIssuer(securityProperties.getJwt().getIssuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extrait l'ID utilisateur d'un token.
     */
    public String getUserIdFromToken(String token) {
        return validateToken(token).getSubject();
    }

    /**
     * Extrait le rôle d'un token.
     */
    public String getRoleFromToken(String token) {
        return validateToken(token).get("role", String.class);
    }

    /**
     * Vérifie si un token est un token temporaire 2FA.
     */
    public boolean isTempToken(String token) {
        Claims claims = validateToken(token);
        return "2FA_TEMP".equals(claims.get("type", String.class));
    }

    /**
     * Paire token + JTI pour le refresh token.
     */
    public record TokenPair(String token, String jti) {}
}
