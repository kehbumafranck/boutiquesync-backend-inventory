package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.PageResponse;
import com.boutiquesync.model.AuditLog;
import com.boutiquesync.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur du journal d'audit.
 * Expose les logs persistés en base MongoDB (rétention 5 ans via TTL index).
 * Réservé aux administrateurs.
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Journal d'Audit", description = "Consultation des logs d'audit (ADMIN)")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    /**
     * Liste tous les logs d'audit, triés du plus récent au plus ancien.
     * Pagination : 50 logs par page par défaut.
     */
    @GetMapping
    @Operation(summary = "Lister les logs d'audit", description = "Retourne la liste paginée des logs, triés par date décroissante.")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> getAllLogs(
            @PageableDefault(size = 50, sort = "timestamp", direction = Sort.Direction.DESC)
            Pageable pageable) {

        Page<AuditLog> logs = auditLogRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.success("Logs d'audit récupérés", PageResponse.from(logs)));
    }

    /**
     * Filtre les logs par utilisateur.
     */
    @GetMapping("/user/{userId}")
    @Operation(summary = "Logs par utilisateur", description = "Retourne les logs d'audit d'un utilisateur spécifique.")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> getLogsByUser(
            @PathVariable String userId,
            @PageableDefault(size = 50, sort = "timestamp", direction = Sort.Direction.DESC)
            Pageable pageable) {

        Page<AuditLog> logs = auditLogRepository.findByUserId(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Logs récupérés", PageResponse.from(logs)));
    }

    /**
     * Filtre les logs par action.
     */
    @GetMapping("/action/{action}")
    @Operation(summary = "Logs par action", description = "Retourne les logs d'audit d'un type d'action spécifique.")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> getLogsByAction(
            @PathVariable String action,
            @PageableDefault(size = 50, sort = "timestamp", direction = Sort.Direction.DESC)
            Pageable pageable) {

        Page<AuditLog> logs = auditLogRepository.findByAction(action, pageable);
        return ResponseEntity.ok(ApiResponse.success("Logs récupérés", PageResponse.from(logs)));
    }

    /**
     * Supprime un log d'audit par son ID.
     * Réservé à l'ADMIN pour correction des entrées erronées.
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un log", description = "Supprime un enregistrement d'audit spécifique.")
    public ResponseEntity<ApiResponse<Void>> deleteLog(@PathVariable String id) {
        if (!auditLogRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        auditLogRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Log supprimé"));
    }

    /**
     * Supprime tous les logs d'audit (purge complète).
     * Action irréversible — à utiliser avec précaution.
     */
    @DeleteMapping
    @Operation(summary = "Purger tous les logs", description = "Supprime l'intégralité du journal d'audit.")
    public ResponseEntity<ApiResponse<Void>> deleteAllLogs() {
        auditLogRepository.deleteAll();
        return ResponseEntity.ok(ApiResponse.success("Journal d'audit purgé"));
    }
}
