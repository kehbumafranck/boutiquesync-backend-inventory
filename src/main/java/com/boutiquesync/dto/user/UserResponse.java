package com.boutiquesync.dto.user;

import com.boutiquesync.model.User;
import com.boutiquesync.model.enums.TwoFactorMethod;
import com.boutiquesync.model.enums.UserRole;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour un utilisateur.
 * Exclut tous les champs sensibles : passwordHash, pin, encryptedTotpSecret,
 * hashedBackupCodes, usedBackupCodes, passwordHistory.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResponse(
        String id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        UserRole role,
        boolean active,
        boolean twoFactorEnabled,
        TwoFactorMethod twoFactorMethod,
        int failedLoginAttempts,
        LocalDateTime lockedUntil,
        LocalDateTime lastLoginAt,
        boolean forcePasswordChange,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Construit un UserResponse depuis un User en excluant tous les champs sensibles.
     */
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole(),
                user.isActive(),
                user.isTwoFactorEnabled(),
                user.getTwoFactorMethod(),
                user.getFailedLoginAttempts(),
                user.getLockedUntil(),
                user.getLastLoginAt(),
                user.isForcePasswordChange(),
                user.getCreatedBy(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
