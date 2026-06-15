package com.boutiquesync.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
/**
 * Propriétés de configuration pour la sécurité de l'application.
 * Chargées depuis application.yml sous le préfixe "boutiquesync.security".
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "boutiquesync.security")
public class SecurityProperties {

    private Jwt jwt = new Jwt();
    private Totp totp = new Totp();
    private RateLimit rateLimit = new RateLimit();

    @Data
    public static class Jwt {
        /** Clé secrète pour signer les tokens JWT (min 256 bits) */
        private String secret;
        /** Durée de validité du token d'accès en secondes (15 min) */
        private long accessTokenExpiry = 900;
        /** Durée de validité du refresh token en secondes (7 jours) */
        private long refreshTokenExpiry = 604800;
        /** Émetteur du token */
        private String issuer = "boutiquesync-api";
        /** Active l'attribut Secure sur les cookies (true en prod / HTTPS, false en dev local) */
        private boolean cookieSecure = true;
        /** Politique SameSite pour les cookies ("Lax", "Strict" ou "None") */
        private String cookieSameSite = "Lax";
    }

    @Data
    public static class Totp {
        /** Nom de l'émetteur affiché dans Google Authenticator */
        private String issuer = "BoutiqueSync";
        /** Clé de chiffrement AES-256 pour les secrets TOTP */
        private String encryptionKey;
    }

    @Data
    public static class RateLimit {
        /** Nombre max de tentatives de login par fenêtre */
        private int loginMaxAttempts = 5;
        /** Fenêtre de temps pour le rate limiting login (minutes) */
        private int loginWindowMinutes = 15;
        /** Durée de verrouillage après dépassement (minutes) */
        private int loginLockMinutes = 30;
        /** Nombre max de renvois OTP par heure */
        private int otpMaxResendPerHour = 3;
    }
}
