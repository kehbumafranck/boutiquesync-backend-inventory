package com.boutiquesync.service;

import com.boutiquesync.model.AuditLog;
import com.boutiquesync.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Service d'audit.
 * Enregistre toutes les actions sensibles dans le journal d'audit.
 * Chaque action est tracée avec l'utilisateur, l'IP et le résultat.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Enregistre une action dans le journal d'audit.
     *
     * @param userId       ID de l'utilisateur
     * @param userEmail    Email de l'utilisateur
     * @param action       Action effectuée (LOGIN, SALE_CREATE, etc.)
     * @param resourceType Type de ressource (USER, SALE, PRODUCT, etc.)
     * @param resourceId   ID de la ressource concernée
     * @param ipAddress    Adresse IP du client
     * @param userAgent    User-Agent du navigateur
     * @param success      Indique si l'action a réussi
     */
    public void logAction(String userId, String userEmail, String action,
                          String resourceType, String resourceId,
                          String ipAddress, String userAgent, boolean success) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .userEmail(userEmail)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .timestamp(LocalDateTime.now())
                .success(success)
                .build();

        auditLogRepository.save(auditLog);
        log.info("AUDIT: action={}, user={}, resource={}/{}, success={}",
                action, userEmail, resourceType, resourceId, success);
    }

    /**
     * Enregistre une action simplifiée (sans détails IP/UA).
     */
    public void logAction(String userId, String userEmail, String action,
                          String resourceType, String resourceId, boolean success) {
        logAction(userId, userEmail, action, resourceType, resourceId, null, null, success);
    }
}
