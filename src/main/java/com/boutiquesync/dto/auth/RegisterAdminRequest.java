package com.boutiquesync.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO pour l'enregistrement de l'administrateur.
 * Utilisable une seule fois au démarrage de l'application.
 *
 * @param email    Email de l'administrateur (unique)
 * @param password Mot de passe en clair (min 8 caractères)
 * @param fullName Nom complet de l'administrateur
 * @param phone    Numéro de téléphone
 */
public record RegisterAdminRequest(
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    String email,

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
    String password,

    @NotBlank(message = "Le nom complet est obligatoire")
    @Size(min = 3, max = 100, message = "Le nom complet doit contenir entre 3 et 100 caractères")
    String fullName,

    @NotBlank(message = "Le numéro de téléphone est obligatoire")
    @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "Le numéro de téléphone doit être valide (format E.164)")
    String phone
) {}
