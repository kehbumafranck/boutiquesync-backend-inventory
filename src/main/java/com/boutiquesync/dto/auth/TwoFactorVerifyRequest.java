package com.boutiquesync.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO pour la vérification du code 2FA.
 *
 * @param tempToken Token temporaire reçu lors du login
 * @param code      Code 2FA (6 chiffres TOTP ou OTP email)
 */
public record TwoFactorVerifyRequest(
    @NotBlank(message = "Le token temporaire est obligatoire")
    String tempToken,

    @NotBlank(message = "Le code 2FA est obligatoire")
    String code
) {}
