package com.boutiquesync.service;

import com.boutiquesync.dto.sale.CreateSaleRequest;
import com.boutiquesync.dto.sale.SaleItemRequest;
import com.boutiquesync.event.SaleCreatedEvent;
import com.boutiquesync.event.StockAlertEvent;
import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.*;
import com.boutiquesync.model.enums.MovementType;
import com.boutiquesync.model.enums.SaleStatus;
import com.boutiquesync.repository.ProductRepository;
import com.boutiquesync.repository.SaleRepository;
import com.boutiquesync.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
//                                                                                                                                                                                        import java.time.Year;
import java.util.ArrayList;
import java.util.List;

/**
 * Service de gestion des ventes.
 * Orchestre le flux complet de vente : validation stock, calcul montants,
 * création de la vente, mise à jour du stock et publication d'événements.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditService auditService;
    private final SequenceService sequenceService;

    /**
     * Crée une nouvelle vente.
     * Flux complet :
     * 1. Valider la disponibilité du stock
     * 2. Calculer les montants (sous-total, TVA, total)
     * 3. Créer le document Sale
     * 4. Mettre à jour le stock et créer les mouvements
     * 5. Publier l'événement SaleCreatedEvent
     *
     * @param request    Requête de création de vente
     * @param employeeId ID de l'employé effectuant la vente
     * @param employeeName Nom de l'employé
     * @return La vente créée
     */
    @Transactional
    public Sale createSale(CreateSaleRequest request, String employeeId, String employeeName) {
        // 1. Valider le stock et construire les items
        List<SaleItem> saleItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalVat = BigDecimal.ZERO;

        for (SaleItemRequest itemRequest : request.items()) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new BusinessException(
                            "Produit non trouvé: " + itemRequest.productId(), "PRODUCT_NOT_FOUND"));

            // Vérifier la disponibilité du stock
            if (product.getCurrentStock() < itemRequest.quantity()) {
                throw new BusinessException(
                        String.format("Stock insuffisant pour '%s'. Disponible: %d, Demandé: %d",
                                product.getName(), product.getCurrentStock(), itemRequest.quantity()),
                        "INSUFFICIENT_STOCK");
            }

            // Calculer le total de la ligne
            BigDecimal lineTotal = product.getSellingPrice()
                    .multiply(BigDecimal.valueOf(itemRequest.quantity()));
            BigDecimal lineVat = lineTotal.multiply(product.getVatRate())
                    .divide(BigDecimal.valueOf(100).add(product.getVatRate()), 2, RoundingMode.HALF_UP);
            BigDecimal lineSubtotal = lineTotal.subtract(lineVat);

            subtotal = subtotal.add(lineSubtotal);
            totalVat = totalVat.add(lineVat);

            saleItems.add(new SaleItem(
                    product.getId(),
                    product.getName(),
                    itemRequest.quantity(),
                    product.getSellingPrice(),
                    product.getVatRate(),
                    lineTotal
            ));
        }

        BigDecimal totalAmount = subtotal.add(totalVat);

        // Vérifier que le montant payé est suffisant
        if (request.amountPaid().compareTo(totalAmount) < 0) {
            throw new BusinessException("Montant payé insuffisant", "INSUFFICIENT_PAYMENT");
        }

        BigDecimal changeGiven = request.amountPaid().subtract(totalAmount);

        // 2. Créer la vente
        String saleNumber = sequenceService.generateSaleNumber();
        Sale sale = Sale.builder()
                .saleNumber(saleNumber)
                .employeeId(employeeId)
                .employeeName(employeeName)
                .customerName(request.customerName())
                .customerPhone(request.customerPhone())
                .items(saleItems)
                .subtotal(subtotal)
                .totalVat(totalVat)
                .totalAmount(totalAmount)
                .paymentMethod(request.paymentMethod())
                .amountPaid(request.amountPaid())
                .changeGiven(changeGiven)
                .status(SaleStatus.COMPLETED)
                .build();

        sale = saleRepository.save(sale);

        // 3. Mettre à jour le stock et créer les mouvements
        for (SaleItem item : saleItems) {
            Product product = productRepository.findById(item.productId()).orElseThrow();
            int quantityBefore = product.getCurrentStock();
            int quantityAfter = quantityBefore - item.quantity();

            product.setCurrentStock(quantityAfter);
            productRepository.save(product);

            // Créer le mouvement de stock
            StockMovement movement = StockMovement.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .type(MovementType.SALE_OUT)
                    .quantityBefore(quantityBefore)
                    .quantityChange(-item.quantity())
                    .quantityAfter(quantityAfter)
                    .referenceId(sale.getId())
                    .performedBy(employeeId)
                    .note("Vente " + saleNumber)
                    .build();
            stockMovementRepository.save(movement);

            // Vérifier le seuil d'alerte
            if (quantityAfter <= product.getAlertThreshold()) {
                eventPublisher.publishEvent(new StockAlertEvent(product));
            }
        }

        // 4. Publier l'événement de vente créée
        eventPublisher.publishEvent(new SaleCreatedEvent(sale));

        // 5. Audit
        auditService.logAction(employeeId, employeeName, "SALE_CREATE",
                "SALE", sale.getId(), true);

        log.info("Vente créée: {} - Montant: {} XAF", saleNumber, totalAmount);
        return sale;
    }

    /**
     * Annule une vente existante.
     * Restaure le stock et crée les mouvements de retour.
     *
     * @param saleId ID de la vente à annuler
     * @param reason Raison de l'annulation
     * @param cancelledBy ID de l'utilisateur annulant
     * @return La vente annulée
     */
    @Transactional
    public Sale cancelSale(String saleId, String reason, String cancelledBy) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new BusinessException("Vente non trouvée", "SALE_NOT_FOUND"));

        if (sale.getStatus() == SaleStatus.CANCELLED) {
            throw new BusinessException("Cette vente est déjà annulée", "SALE_ALREADY_CANCELLED");
        }

        // Restaurer le stock
        for (SaleItem item : sale.getItems()) {
            Product product = productRepository.findById(item.productId()).orElseThrow();
            int quantityBefore = product.getCurrentStock();
            int quantityAfter = quantityBefore + item.quantity();

            product.setCurrentStock(quantityAfter);
            productRepository.save(product);

            // Créer le mouvement de retour
            StockMovement movement = StockMovement.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .type(MovementType.RETURN)
                    .quantityBefore(quantityBefore)
                    .quantityChange(item.quantity())
                    .quantityAfter(quantityAfter)
                    .referenceId(sale.getId())
                    .performedBy(cancelledBy)
                    .note("Annulation vente " + sale.getSaleNumber() + ": " + reason)
                    .build();
            stockMovementRepository.save(movement);
        }

        // Mettre à jour la vente
        sale.setStatus(SaleStatus.CANCELLED);
        sale.setCancellationReason(reason);
        sale.setCancelledBy(cancelledBy);
        sale = saleRepository.save(sale);

        auditService.logAction(cancelledBy, null, "SALE_CANCEL",
                "SALE", sale.getId(), true);

        log.info("Vente annulée: {} - Raison: {}", sale.getSaleNumber(), reason);
        return sale;
    }

    /**
     * Récupère toutes les ventes avec pagination.
     */
    public Page<Sale> getAllSales(Pageable pageable) {
        return saleRepository.findAll(pageable);
    }

    /**
     * Récupère une vente par son ID.
     */
    public Sale getSaleById(String id) {
        return saleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Vente non trouvée", "SALE_NOT_FOUND"));
    }

    /**
     * Récupère les ventes du jour.
     */
    public List<Sale> getTodaySales() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return saleRepository.findByCreatedAtBetweenAndStatus(startOfDay, endOfDay, SaleStatus.COMPLETED);
    }

    /**
     * Récupère les ventes d'un employé.
     */
    public Page<Sale> getSalesByEmployee(String employeeId, Pageable pageable) {
        return saleRepository.findByEmployeeId(employeeId, pageable);
    }
}
