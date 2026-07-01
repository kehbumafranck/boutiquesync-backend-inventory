package com.boutiquesync.service;

import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.Product;
import com.boutiquesync.model.StockMovement;
import com.boutiquesync.model.enums.MovementType;
import com.boutiquesync.repository.ProductRepository;
import com.boutiquesync.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service de gestion de l'inventaire.
 * Gère les mouvements de stock, les ajustements manuels et les rapports d'inventaire.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    /**
     * Effectue un ajustement manuel de stock.
     * Utilisé lors des inventaires physiques pour corriger les écarts.
     *
     * @param productId   ID du produit
     * @param newQuantity Nouvelle quantité en stock
     * @param note        Note explicative de l'ajustement
     * @param performedBy     ID de l'utilisateur effectuant l'ajustement
     * @param performedByName Nom de l'utilisateur (pour affichage)
     * @return Le mouvement de stock créé
     */
    @Transactional
    @CacheEvict(value = {"dashboard", "stockAlerts"}, allEntries = true)
    public StockMovement adjustStock(String productId, int newQuantity, String note, String performedBy, String performedByName) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException("Produit non trouvé", "PRODUCT_NOT_FOUND"));

        int quantityBefore = product.getCurrentStock();
        int quantityChange = newQuantity - quantityBefore;

        // Mettre à jour le stock du produit
        product.setCurrentStock(newQuantity);
        productRepository.save(product);

        // Créer le mouvement de stock
        StockMovement movement = StockMovement.builder()
                .productId(product.getId())
                .productName(product.getName())
                .type(MovementType.ADJUSTMENT)
                .quantityBefore(quantityBefore)
                .quantityChange(quantityChange)
                .quantityAfter(newQuantity)
                .performedBy(performedBy)
                .performedByName(performedByName != null ? performedByName : performedBy)
                .note(note)
                .build();

        movement = stockMovementRepository.save(movement);

        auditService.logAction(performedBy, null, "STOCK_ADJUSTMENT",
                "PRODUCT", productId, product.getName(), null, null, true);

        log.info("Ajustement stock: {} ({} → {})", product.getName(), quantityBefore, newQuantity);
        return movement;
    }

    /**
     * Enregistre une entrée de stock (réception fournisseur).
     *
     * @param productId   ID du produit
     * @param quantity    Quantité reçue
     * @param note        Note (référence fournisseur, etc.)
     * @param performedBy ID de l'utilisateur
     * @return Le mouvement de stock créé
     */
    @Transactional
    public StockMovement addStock(String productId, int quantity, String note, String performedBy) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException("Produit non trouvé", "PRODUCT_NOT_FOUND"));

        int quantityBefore = product.getCurrentStock();
        int quantityAfter = quantityBefore + quantity;

        product.setCurrentStock(quantityAfter);
        productRepository.save(product);

        StockMovement movement = StockMovement.builder()
                .productId(product.getId())
                .productName(product.getName())
                .type(MovementType.SUPPLIER_IN)
                .quantityBefore(quantityBefore)
                .quantityChange(quantity)
                .quantityAfter(quantityAfter)
                .performedBy(performedBy)
                .note(note)
                .build();

        return stockMovementRepository.save(movement);
    }

    /**
     * Récupère tous les mouvements de stock avec pagination.
     */
    public Page<StockMovement> getAllMovements(Pageable pageable) {
        return stockMovementRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    /**
     * Récupère les mouvements de stock d'un produit.
     */
    public Page<StockMovement> getMovementsByProduct(String productId, Pageable pageable) {
        return stockMovementRepository.findByProductId(productId, pageable);
    }

    /**
     * Récupère les mouvements de stock sur une période.
     */
    public List<StockMovement> getMovementsByPeriod(LocalDateTime from, LocalDateTime to) {
        return stockMovementRepository.findByCreatedAtBetween(from, to);
    }

    /**
     * Génère un snapshot de l'inventaire actuel (tous les produits avec leur stock).
     */
    public List<Product> getInventorySnapshot() {
        return productRepository.findByActiveTrue(Pageable.unpaged()).getContent();
    }
}
