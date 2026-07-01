package com.boutiquesync.service;

import com.boutiquesync.model.AuditLog;
import com.boutiquesync.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Service d'audit.
 * Enregistre toutes les actions sensibles dans le journal d'audit (rétention 5 ans).
 * Le champ {@code resourceName} contient le nom lisible de la ressource
 * (ex : nom du produit, email de l'utilisateur) pour un affichage sans jointure.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Enregistre une action complète dans le journal d'audit.
     */
    public void logAction(String userId, String userEmail, String action,
                          String resourceType, String resourceId,
                          String ipAddress, String userAgent, boolean success) {
        logAction(userId, userEmail, action, resourceType, resourceId, null, ipAddress, userAgent, success);
    }

    /**
     * Enregistre une action avec nom de ressource lisible.
     *
     * @param resourceName Nom lisible de la ressource (ex : "Ordinateur Portable", "jean@email.com")
     */
    public void logAction(String userId, String userEmail, String action,
                          String resourceType, String resourceId, String resourceName,
                          String ipAddress, String userAgent, boolean success) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .userEmail(userEmail)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .resourceName(resourceName)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .timestamp(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusYears(5))
                .success(success)
                .build();

        auditLogRepository.save(auditLog);
        log.info("AUDIT: action={}, user={}, resource={}/{} ({}), success={}",
                action, userEmail, resourceType, resourceId, resourceName, success);
    }

    /**
     * Enregistre une action simplifiée (sans IP/UA).
     */
    public void logAction(String userId, String userEmail, String action,
                          String resourceType, String resourceId, boolean success) {
        logAction(userId, userEmail, action, resourceType, resourceId, null, null, null, success);
    }
}
