package com.boutiquesync.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Soumis par l'employé après avoir cliqué sur le lien d'invitation.
 * L'email n'est PAS inclus : il est lu depuis l'invitation en base.
 */
public record CompleteEmployeeRegistrationRequest(

    @NotBlank(message = "Le token est obligatoire")
    String token,

    @NotBlank(message = "Le prénom est obligatoire")
    String firstName,

    @NotBlank(message = "Le nom est obligatoire")
    String lastName,

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Le mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial"
    )
    String password,

    String phoneNumber
) {}