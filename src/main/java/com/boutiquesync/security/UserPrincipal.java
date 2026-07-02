package com.boutiquesync.security;

/**
 * Record représentant l'utilisateur authentifié dans le contexte de sécurité.
 * Stocké dans le SecurityContext après validation du JWT.
 *
 * @param id        ID de l'utilisateur
 * @param email     Email de l'utilisateur
 * @param role      Rôle de l'utilisateur (ADMIN ou EMPLOYEE)
 * @param fullName  Nom complet (prénom + nom) pour l'affichage dans les ventes et audits
 */
public record UserPrincipal(String id, String email, String role, String fullName) {

    /**
     * Constructeur de compatibilité pour le code existant qui ne passe pas fullName.
     * fullName est défini à l'email par défaut.
     */
    public UserPrincipal(String id, String email, String role) {
        this(id, email, role, email);
    }
}
