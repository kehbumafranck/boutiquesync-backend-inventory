package com.boutiquesync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Document MongoDB pour le journal d'audit.
 * Enregistre toutes les actions sensibles du système.
 *
 * Rétention : 5 ans à partir de la date de création.
 * Le champ {@code expiresAt} porte l'index TTL MongoDB (expireAfterSeconds = 0) :
 * MongoDB supprime automatiquement le document lorsque la date système dépasse
 * la valeur de ce champ. Il est initialisé à {@code timestamp + 5 ans}.
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

    /** Nom lisible de la ressource (dénormalisé pour affichage) */
    private String resourceName;

    /** Adresse IP du client */
    private String ipAddress;

    /** User-Agent du navigateur */
    private String userAgent;

    /** Horodatage de l'action */
    private LocalDateTime timestamp;

    /**
     * Date d'expiration du document = timestamp + 5 ans.
     * Porte l'index TTL MongoDB : le document est supprimé automatiquement
     * dès que la date système dépasse cette valeur.
     * expireAfterSeconds = 0 signifie « expire exactement à la date indiquée ».
     */
    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime expiresAt;

    /** Indique si l'action a réussi */
    @Builder.Default
    private boolean success = true;

    /** Détails supplémentaires */
    private String details;
}
