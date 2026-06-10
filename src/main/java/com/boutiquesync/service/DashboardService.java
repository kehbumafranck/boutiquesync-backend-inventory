package com.boutiquesync.service;

import com.boutiquesync.model.Product;
import com.boutiquesync.model.Sale;
import com.boutiquesync.model.enums.SaleStatus;
import com.boutiquesync.repository.ProductRepository;
import com.boutiquesync.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service du tableau de bord.
 * Fournit les KPIs en temps réel et les statistiques de vente.
 * Utilise le cache Caffeine pour les performances et WebSocket pour les mises à jour temps réel.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Récupère le résumé du dashboard (KPIs principaux).
     * Mis en cache pendant 5 minutes.
     */
    @Cacheable("dashboard")
    public DashboardSummary getSummary() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        // Ventes du jour
        List<Sale> todaySales = saleRepository.findByCreatedAtBetweenAndStatus(
                startOfDay, endOfDay, SaleStatus.COMPLETED);

        BigDecimal todayRevenue = todaySales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Ventes du mois
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        List<Sale> monthSales = saleRepository.findByCreatedAtBetweenAndStatus(
                startOfMonth, endOfDay, SaleStatus.COMPLETED);

        BigDecimal monthRevenue = monthSales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Alertes stock
        List<Product> lowStockProducts = productRepository.findLowStockProducts();

        return new DashboardSummary(
                todaySales.size(),
                todayRevenue,
                monthSales.size(),
                monthRevenue,
                lowStockProducts.size()
        );
    }

    /**
     * Récupère les produits les plus vendus sur une période.
     */
    @Cacheable("topProducts")
    public List<ProductStat> getTopProducts(LocalDateTime from, LocalDateTime to, int limit) {
        List<Sale> sales = saleRepository.findByCreatedAtBetweenAndStatus(from, to, SaleStatus.COMPLETED);

        return sales.stream()
                .flatMap(sale -> sale.getItems().stream())
                .collect(Collectors.groupingBy(
                        item -> item.productId(),
                        Collectors.summingInt(item -> item.quantity())
                ))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(limit)
                .map(entry -> {
                    Product product = productRepository.findById(entry.getKey()).orElse(null);
                    String name = product != null ? product.getName() : "Produit supprimé";
                    return new ProductStat(entry.getKey(), name, entry.getValue());
                })
                .toList();
    }

    /**
     * Récupère les produits les moins vendus sur une période.
     */
    public List<ProductStat> getBottomProducts(LocalDateTime from, LocalDateTime to, int limit) {
        List<Sale> sales = saleRepository.findByCreatedAtBetweenAndStatus(from, to, SaleStatus.COMPLETED);

        return sales.stream()
                .flatMap(sale -> sale.getItems().stream())
                .collect(Collectors.groupingBy(
                        item -> item.productId(),
                        Collectors.summingInt(item -> item.quantity())
                ))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByValue())
                .limit(limit)
                .map(entry -> {
                    Product product = productRepository.findById(entry.getKey()).orElse(null);
                    String name = product != null ? product.getName() : "Produit supprimé";
                    return new ProductStat(entry.getKey(), name, entry.getValue());
                })
                .toList();
    }

    /**
     * Récupère les alertes de stock bas.
     */
    @Cacheable("stockAlerts")
    public List<Product> getStockAlerts() {
        return productRepository.findLowStockProducts();
    }

    /**
     * Rafraîchit les métriques du dashboard et pousse via WebSocket.
     * Appelé après chaque vente via l'événement SaleCreatedEvent.
     */
    @CacheEvict(value = {"dashboard", "topProducts", "stockAlerts"}, allEntries = true)
    public void refreshMetrics() {
        DashboardSummary summary = getSummary();
        // Pousser la mise à jour via WebSocket à tous les admins connectés
        messagingTemplate.convertAndSend("/topic/dashboard", summary);
        log.debug("Dashboard rafraîchi et poussé via WebSocket");
    }

    /**
     * Résumé du dashboard.
     */
    public record DashboardSummary(
        int todaySalesCount,
        BigDecimal todayRevenue,
        int monthSalesCount,
        BigDecimal monthRevenue,
        int stockAlertsCount
    ) {}

    /**
     * Statistique d'un produit (quantité vendue).
     */
    public record ProductStat(String productId, String productName, int quantitySold) {}
}
