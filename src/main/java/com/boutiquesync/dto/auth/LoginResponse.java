package com.boutiquesync.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * DTO interne pour la réponse de connexion.
 * Contient les tokens (utilisés uniquement côté serveur pour poser les cookies)
 * et les informations utilisateur (retournées dans le body JSON).
 *
 * ⚠️ Ce record ne doit JAMAIS être sérialisé directement dans une réponse HTTP.
 * Utiliser {@link #toSafeResponse()} pour obtenir la version sans tokens.
 *
 * @param accessToken        Token d'accès JWT (null si 2FA requis)
 * @param refreshToken       Refresh token (null si 2FA requis)
 * @param tempToken          Token temporaire pour 2FA (null si 2FA désactivé)
 * @param twoFactorRequired  Indique si le 2FA est requis
 * @param method             Méthode 2FA (TOTP ou EMAIL_OTP)
 * @param user               Informations de l'utilisateur
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
    String accessToken,
    String refreshToken,
    String tempToken,
    boolean twoFactorRequired,
    String method,
    UserInfo user
) {
    /**
     * Informations basiques de l'utilisateur retournées après connexion.
     */
    public record UserInfo(
        String id,
        String firstName,
        String lastName,
        String email,
        String role
    ) {}

    /**
     * Retourne une version sécurisée de la réponse, sans les tokens JWT.
     * Les tokens sont transmis UNIQUEMENT via les cookies HttpOnly.
     * Seul le tempToken (2FA) est conservé car il est de courte durée
     * et nécessaire côté client pour le flux 2FA.
     */
    public LoginResponse toSafeResponse() {
        return new LoginResponse(
            null,                // accessToken masqué
            null,                // refreshToken masqué
            this.tempToken,      // conservé pour le flux 2FA
            this.twoFactorRequired,
            this.method,
            this.user
        );
    }
}
