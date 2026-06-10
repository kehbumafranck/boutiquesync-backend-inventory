package com.boutiquesync.model.enums;

/**
 * Rôles disponibles dans le système BoutiqueSync.
 * ADMIN : propriétaire avec accès complet.
 * EMPLOYEE : vendeur avec accès restreint (ventes, factures, lecture stock).
 */
public enum UserRole {
    ADMIN,
    EMPLOYEE
}
