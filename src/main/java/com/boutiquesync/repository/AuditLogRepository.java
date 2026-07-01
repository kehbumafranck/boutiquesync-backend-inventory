package com.boutiquesync.repository;

import com.boutiquesync.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository MongoDB pour le journal d'audit.
 * Les logs sont conservés 5 ans (TTL index sur le champ expiresAt).
 */
@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    Page<AuditLog> findByUserId(String userId, Pageable pageable);

    Page<AuditLog> findByAction(String action, Pageable pageable);

    /** Récupère les logs dans une plage de dates — utilisé par le dashboard. */
    List<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    /** Liste tous les logs triés par date décroissante. */
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
