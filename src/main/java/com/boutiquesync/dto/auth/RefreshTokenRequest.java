package com.boutiquesync.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO pour la requête de rafraîchissement de token.
 *
 * @param refreshToken Le refresh token à utiliser
 */
public record RefreshTokenRequest(
    @NotBlank(message = "Le refresh token est obligatoire")
    String refreshToken
) {}
