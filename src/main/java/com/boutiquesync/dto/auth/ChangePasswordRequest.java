package com.boutiquesync.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO pour la requête de changement de mot de passe.
 *
 * @param currentPassword Mot de passe actuel
 * @param newPassword     Nouveau mot de passe (min 8 chars, 1 maj, 1 min, 1 chiffre, 1 spécial)
 * @param twoFactorCode   Code 2FA (optionnel, requis si 2FA activé)
 */
public record ChangePasswordRequest(
    @NotBlank(message = "Le mot de passe actuel est obligatoire")
    String currentPassword,

    @NotBlank(message = "Le nouveau mot de passe est obligatoire")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Le mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial"
    )
    String newPassword,

    String twoFactorCode
) {}
