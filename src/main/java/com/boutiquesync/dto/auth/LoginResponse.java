package com.boutiquesync.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * DTO pour la réponse de connexion.
 * Contient soit les tokens (si 2FA désactivé), soit un token temporaire (si 2FA activé).
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
}
