package com.boutiquesync.security;

import com.boutiquesync.config.SecurityProperties;
import com.boutiquesync.model.User;
import io.jsonwebtoken.Claims;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * Fournisseur de tokens JWT.
 * Gère la génération, la validation, l'extraction des claims
 * et désormais la création/lecture des cookies HttpOnly.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    private static final String ACCESS_COOKIE_NAME = "accessToken";
    private static final String REFRESH_COOKIE_NAME = "refreshToken";

    private final SecurityProperties securityProperties;
    private SecretKey secretKey;

    @PostConstruct
    public void init() {
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
     */
    public String generateTempToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 15 * 60 * 1000);

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
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .requireIssuer(securityProperties.getJwt().getIssuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getUserIdFromToken(String token) {
        return validateToken(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return validateToken(token).get("role", String.class);
    }

    public boolean isTempToken(String token) {
        Claims claims = validateToken(token);
        return "2FA_TEMP".equals(claims.get("type", String.class));
    }

    public record TokenPair(String token, String jti) {}

    // ===================== Gestion des cookies =====================

    /**
     * Crée le cookie HttpOnly contenant l'access token.
     * Envoyé sur toutes les routes ("/").
     */
    public ResponseCookie generateAccessTokenCookie(String token) {
        return ResponseCookie.from(ACCESS_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(securityProperties.getJwt().isCookieSecure())
                .path("/")
                .maxAge(securityProperties.getJwt().getAccessTokenExpiry())
                .sameSite(securityProperties.getJwt().getCookieSameSite())
                .build();
    }

    /**
     * Crée le cookie HttpOnly contenant le refresh token.
     * Path limité à /api/auth pour réduire son exposition.
     */
    public ResponseCookie generateRefreshTokenCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(securityProperties.getJwt().isCookieSecure())
                .path("/api/auth")
                .maxAge(securityProperties.getJwt().getRefreshTokenExpiry())
                .sameSite(securityProperties.getJwt().getCookieSameSite())
                .build();
    }

    /**
     * Cookie vide pour effacer l'access token au logout.
     */
    public ResponseCookie clearAccessTokenCookie() {
        return ResponseCookie.from(ACCESS_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(securityProperties.getJwt().isCookieSecure())
                .path("/")
                .maxAge(0)
                .sameSite(securityProperties.getJwt().getCookieSameSite())
                .build();
    }

    /**
     * Cookie vide pour effacer le refresh token au logout.
     */
    public ResponseCookie clearRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(securityProperties.getJwt().isCookieSecure())
                .path("/api/auth")
                .maxAge(0)
                .sameSite(securityProperties.getJwt().getCookieSameSite())
                .build();
    }

    /**
     * Lit l'access token depuis les cookies de la requête.
     */
    public String getAccessTokenFromCookies(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, ACCESS_COOKIE_NAME);
        return cookie != null ? cookie.getValue() : null;
    }

    /**
     * Lit le refresh token depuis les cookies de la requête.
     */
    public String getRefreshTokenFromCookies(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, REFRESH_COOKIE_NAME);
        return cookie != null ? cookie.getValue() : null;
    }
}