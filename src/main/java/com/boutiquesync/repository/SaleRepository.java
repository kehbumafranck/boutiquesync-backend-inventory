package com.boutiquesync.repository;

import com.boutiquesync.model.Sale;
import com.boutiquesync.model.enums.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository MongoDB pour la gestion des ventes.
 */
@Repository
public interface SaleRepository extends MongoRepository<Sale, String> {

    Optional<Sale> findBySaleNumber(String saleNumber);

    Page<Sale> findByEmployeeId(String employeeId, Pageable pageable);

    Page<Sale> findByStatus(SaleStatus status, Pageable pageable);

    /** Ventes du jour */
    List<Sale> findByCreatedAtBetweenAndStatus(LocalDateTime start, LocalDateTime end, SaleStatus status);

    /** Ventes entre deux dates */
    List<Sale> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /** Comptage des ventes par période */
    long countByCreatedAtBetweenAndStatus(LocalDateTime start, LocalDateTime end, SaleStatus status);
    // Récupère toutes les ventes dont la date de création est entre la date de début et de fin
    List<Sale> findByCreatedAtBetween(Instant start, Instant end);
    

}
