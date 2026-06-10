package com.boutiquesync.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO pour la requête de connexion.
 *
 * @param email    Email de l'utilisateur
 * @param password Mot de passe en clair
 */
public record LoginRequest(
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    String email,

    @NotBlank(message = "Le mot de passe est obligatoire")
    String password
) {}
