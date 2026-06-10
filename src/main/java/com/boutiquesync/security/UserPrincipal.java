package com.boutiquesync.security;

/**
 * Record représentant l'utilisateur authentifié dans le contexte de sécurité.
 * Stocké dans le SecurityContext après validation du JWT.
 *
 * @param id    ID de l'utilisateur
 * @param email Email de l'utilisateur
 * @param role  Rôle de l'utilisateur (ADMIN ou EMPLOYEE)
 */
public record UserPrincipal(String id, String email, String role) {}
