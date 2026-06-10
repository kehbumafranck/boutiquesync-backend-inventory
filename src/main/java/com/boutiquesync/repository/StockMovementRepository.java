package com.boutiquesync.repository;

import com.boutiquesync.model.StockMovement;
import com.boutiquesync.model.enums.MovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository MongoDB pour les mouvements de stock.
 */
@Repository
public interface StockMovementRepository extends MongoRepository<StockMovement, String> {

    Page<StockMovement> findByProductId(String productId, Pageable pageable);

    List<StockMovement> findByProductIdAndCreatedAtBetween(String productId, LocalDateTime start, LocalDateTime end);

    Page<StockMovement> findByType(MovementType type, Pageable pageable);

    Page<StockMovement> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<StockMovement> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
