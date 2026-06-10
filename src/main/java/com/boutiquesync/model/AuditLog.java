package com.boutiquesync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Document MongoDB pour le journal d'audit.
 * Enregistre toutes les actions sensibles du système.
 */
@Document("audit_logs")
@CompoundIndexes({
    @CompoundIndex(name = "idx_user_timestamp", def = "{'userId': 1, 'timestamp': -1}"),
    @CompoundIndex(name = "idx_action_timestamp", def = "{'action': 1, 'timestamp': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    private String id;

    /** ID de l'utilisateur ayant effectué l'action */
    private String userId;

    /** Email de l'utilisateur */
    private String userEmail;

    /** Action effectuée (LOGIN, SALE_CREATE, etc.) */
    private String action;

    /** Type de ressource concernée */
    private String resourceType;

    /** ID de la ressource concernée */
    private String resourceId;

    /** Adresse IP du client */
    private String ipAddress;

    /** User-Agent du navigateur */
    private String userAgent;

    /** Horodatage de l'action */
    private LocalDateTime timestamp;

    /** Indique si l'action a réussi */
    @Builder.Default
    private boolean success = true;

    /** Détails supplémentaires */
    private String details;
}
