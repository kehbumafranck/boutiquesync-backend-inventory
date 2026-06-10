package com.boutiquesync.dto.user;

import com.boutiquesync.model.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * DTO pour la création d'un utilisateur (employé).
 *
 * @param firstName   Prénom
 * @param lastName    Nom
 * @param email       Email unique
 * @param password    Mot de passe initial
 * @param role        Rôle (ADMIN ou EMPLOYEE)
 * @param phoneNumber Numéro de téléphone
 */
public record CreateUserRequest(
    @NotBlank(message = "Le prénom est obligatoire")
    String firstName,

    @NotBlank(message = "Le nom est obligatoire")
    String lastName,

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    String email,

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Le mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial"
    )
    String password,

    @NotNull(message = "Le rôle est obligatoire")
    UserRole role,

    String phoneNumber
) {}
