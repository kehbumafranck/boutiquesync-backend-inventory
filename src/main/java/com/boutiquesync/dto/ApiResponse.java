package com.boutiquesync.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Format de réponse uniforme pour toutes les API.
 * Encapsule le résultat (succès ou erreur) avec un horodatage.
 *
 * @param <T> Type des données retournées
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    /** Indique si l'opération a réussi */
    private boolean success;

    /** Message descriptif */
    private String message;

    /** Données retournées (null en cas d'erreur) */
    private T data;

    /** Code d'erreur technique (null en cas de succès) */
    private String errorCode;

    /** Détails supplémentaires (erreurs de validation, etc.) */
    private Object details;

    /** Horodatage de la réponse */
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    /**
     * Crée une réponse de succès avec données.
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Crée une réponse de succès sans données.
     */
    public static <T> ApiResponse<T> success(String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Crée une réponse d'erreur.
     */
    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errorCode(errorCode)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Crée une réponse d'erreur avec détails.
     */
    public static <T> ApiResponse<T> error(String message, String errorCode, Object details) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errorCode(errorCode)
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
