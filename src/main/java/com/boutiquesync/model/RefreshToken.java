package com.boutiquesync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Document MongoDB pour stocker les refresh tokens.
 * Permet la révocation et la rotation des tokens.
 */
@Document("refresh_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    private String id;

    /** Identifiant unique du token (JWT ID) */
    @Indexed(unique = true)
    private String jti;

    /** ID de l'utilisateur propriétaire */
    @Indexed
    private String userId;

    /** Token hashé (BCrypt) */
    private String hashedToken;

    /** Date d'expiration (index TTL) */
    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime expiresAt;

    /** Date de révocation (null si actif) */
    private LocalDateTime revokedAt;

    /** Informations sur l'appareil (User-Agent) */
    private String deviceInfo;

    @CreatedDate
    private LocalDateTime createdAt;
}
