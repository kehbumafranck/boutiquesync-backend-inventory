package com.boutiquesync.model;

import com.boutiquesync.model.enums.TwoFactorMethod;
import com.boutiquesync.model.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Document MongoDB représentant un utilisateur du système.
 * Peut être un ADMIN (propriétaire) ou un EMPLOYEE (vendeur).
 */
@Document("users")
@CompoundIndex(name = "idx_active_role", def = "{'active': 1, 'role': 1}")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;

    @Indexed(unique = true)
    @Email(message = "L'email doit être valide")
    @NotBlank(message = "L'email est obligatoire")
    private String email;
    @NotBlank
    private String passwordHash;

    /** Rôle de l'utilisateur : ADMIN ou EMPLOYEE */
    private UserRole role;

    /** Indique si le compte est actif (soft delete = false) */
    @Builder.Default
    private boolean active = true;

    /** Numéro de téléphone pour notifications WhatsApp/SMS */
    private String phoneNumber;

    /** PIN hashé (BCrypt) pour connexion rapide caissier (4-6 chiffres) */
    private String pin;

    // ===== 2FA =====

    /** Méthode 2FA choisie : TOTP, EMAIL_OTP ou DISABLED */
    @Builder.Default
    private TwoFactorMethod twoFactorMethod = TwoFactorMethod.DISABLED;

    /** Secret TOTP chiffré en AES-256 */
    private String encryptedTotpSecret;

    /** Codes de secours hashés (BCrypt) */
    @Builder.Default
    private List<String> hashedBackupCodes = new ArrayList<>();

    /** Codes de secours déjà utilisés */
    @Builder.Default
    private List<String> usedBackupCodes = new ArrayList<>();

    /** Indique si le 2FA est activé */
    @Builder.Default
    private boolean twoFactorEnabled = false;

    // ===== Sécurité =====

    /** Nombre de tentatives de connexion échouées */
    @Builder.Default
    private int failedLoginAttempts = 0;

    /** Date/heure jusqu'à laquelle le compte est verrouillé */
    private LocalDateTime lockedUntil;

    /** Historique des 5 derniers mots de passe hashés */
    @Builder.Default
    private List<String> passwordHistory = new ArrayList<>();

    /** Date de dernière connexion */
    private LocalDateTime lastLoginAt;

    /** Adresse IP de dernière connexion */
    private String lastLoginIp;

    /** Forcer le changement de mot de passe à la prochaine connexion */
    @Builder.Default
    private boolean forcePasswordChange = false;

    // ===== Audit =====

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private String createdBy;

    @Version
    private Long version;
}
