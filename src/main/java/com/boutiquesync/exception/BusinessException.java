package com.boutiquesync.exception;

import lombok.Getter;

/**
 * Exception métier personnalisée.
 * Utilisée pour les erreurs de logique métier (stock insuffisant, utilisateur non trouvé, etc.).
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String errorCode;

    public BusinessException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }
}
