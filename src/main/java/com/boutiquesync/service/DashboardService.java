package com.boutiquesync.service;

import com.boutiquesync.model.AuditLog;
import com.boutiquesync.model.Product;
import com.boutiquesync.model.Sale;
import com.boutiquesync.model.SaleItem;
import com.boutiquesync.model.enums.SaleStatus;
import com.boutiquesync.repository.AuditLogRepository;
import com.boutiquesync.repository.ProductRepository;
import com.boutiquesync.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service du tableau de bord.
 * Fournit les KPIs agrégés en temps réel depuis MongoDB.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final AuditLogRepository auditLogRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static final DateTimeFormatter DAY_FMT    = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter HOUR_FMT   = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY_LABEL  = DateTimeFormatter.ofPattern("EEE dd/MM");

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY COMPLET
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("dashboard")
    public DashboardSummary getSummary() {

        // ── Plages de dates ──────────────────────────────────────────────────
        LocalDateTime startOfDay      = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay        = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime startOfWeek     = LocalDate.now().with(DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime startOfMonth    = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfPrevMonth = LocalDate.now().minusMonths(1).withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfPrevMonth  = LocalDate.now().withDayOfMonth(1).atStartOfDay().minusNanos(1);

        // ── Ventes ────────────────────────────────────────────────────────────
        List<Sale> todaySales     = saleRepository.findByCreatedAtBetweenAndStatus(startOfDay,      endOfDay, SaleStatus.COMPLETED);
        List<Sale> weekSales      = saleRepository.findByCreatedAtBetweenAndStatus(startOfWeek,     endOfDay, SaleStatus.COMPLETED);
        List<Sale> monthSales     = saleRepository.findByCreatedAtBetweenAndStatus(startOfMonth,    endOfDay, SaleStatus.COMPLETED);
        List<Sale> prevMonthSales = saleRepository.findByCreatedAtBetweenAndStatus(startOfPrevMonth, endOfPrevMonth, SaleStatus.COMPLETED);

        // ── CA ────────────────────────────────────────────────────────────────
        BigDecimal todayRevenue     = sumRevenue(todaySales);
        BigDecimal weekRevenue      = sumRevenue(weekSales);
        BigDecimal monthRevenue     = sumRevenue(monthSales);
        BigDecimal prevMonthRevenue = sumRevenue(prevMonthSales);

        // ── Tendance mois ─────────────────────────────────────────────────────
        Double trendPercent = null;
        if (prevMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            trendPercent = monthRevenue.subtract(prevMonthRevenue)
                    .divide(prevMonthRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        // ── Marge brute mensuelle ─────────────────────────────────────────────
        BigDecimal monthCostOfGoods = computeCostOfGoods(monthSales);
        BigDecimal grossMargin      = monthRevenue.subtract(monthCostOfGoods);
        Double operationalMarginPct = null;
        if (monthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            operationalMarginPct = grossMargin
                    .divide(monthRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        // ── Graphe 7 jours (Lun → Aujourd'hui) ───────────────────────────────
        List<WeeklyRevenue> weeklyGraph = buildWeeklyGraph(weekSales, startOfWeek, endOfDay);

        // ── Alertes stock ─────────────────────────────────────────────────────
        int stockAlertsCount = productRepository.findLowStockProducts().size();

        // ── Dernières ventes de la semaine (max 10) ───────────────────────────
        List<RecentSale> recentWeekSales = weekSales.stream()
                .sorted(Comparator.comparing(Sale::getCreatedAt).reversed())
                .limit(10)
                .map(this::toRecentSale)
                .toList();

        // ── Télémétrie sécurité (derniers logs d'audit sensibles) ─────────────
        List<SecurityEvent> securityEvents = buildSecurityEvents(startOfWeek, endOfDay);

        return new DashboardSummary(
                todaySales.size(), todayRevenue,
                weekSales.size(), weekRevenue,
                monthSales.size(), monthRevenue,
                prevMonthSales.size(), prevMonthRevenue, trendPercent,
                monthCostOfGoods, grossMargin, operationalMarginPct,
                weeklyGraph, stockAlertsCount,
                recentWeekSales, securityEvents
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOP / BOTTOM PRODUITS
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("topProducts")
    public List<ProductStat> getTopProducts(LocalDateTime from, LocalDateTime to, int limit) {
        return buildProductStats(from, to, limit, true);
    }

    public List<ProductStat> getBottomProducts(LocalDateTime from, LocalDateTime to, int limit) {
        return buildProductStats(from, to, limit, false);
    }

    @Cacheable("stockAlerts")
    public List<Product> getStockAlerts() {
        return productRepository.findLowStockProducts();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REFRESH WEBSOCKET
    // ─────────────────────────────────────────────────────────────────────────

    @CacheEvict(value = {"dashboard", "topProducts", "stockAlerts"}, allEntries = true)
    public void refreshMetrics() {
        DashboardSummary summary = getSummary();
        messagingTemplate.convertAndSend("/topic/dashboard", summary);
        log.debug("Dashboard rafraîchi et poussé via WebSocket");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS PRIVÉS
    // ─────────────────────────────────────────────────────────────────────────

    private BigDecimal sumRevenue(List<Sale> sales) {
        return sales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal computeCostOfGoods(List<Sale> sales) {
        return sales.stream()
                .flatMap(s -> s.getItems().stream())
                .map(item -> {
                    Product product = productRepository.findById(item.productId()).orElse(null);
                    BigDecimal purchasePrice = product != null && product.getPurchasePrice() != null
                            ? product.getPurchasePrice()
                            : BigDecimal.ZERO;
                    return purchasePrice.multiply(BigDecimal.valueOf(item.quantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Construit le graphe 7 jours (Lun → Aujourd'hui).
     * Chaque entrée porte le label lisible du jour (ex : "Lun 23/06") et le CA.
     */
    private List<WeeklyRevenue> buildWeeklyGraph(
            List<Sale> weekSales,
            LocalDateTime from,
            LocalDateTime to) {

        Map<String, BigDecimal> revenueByDay = weekSales.stream().collect(
                Collectors.groupingBy(
                        s -> s.getCreatedAt().format(DAY_FMT),
                        Collectors.reducing(BigDecimal.ZERO, Sale::getTotalAmount, BigDecimal::add)));

        List<WeeklyRevenue> graph = new ArrayList<>();
        LocalDate cursor = from.toLocalDate();
        LocalDate end    = to.toLocalDate();

        while (!cursor.isAfter(end)) {
            String dayKey   = cursor.format(DAY_FMT);
            String dayLabel = cursor.format(DAY_LABEL);
            graph.add(new WeeklyRevenue(dayKey, dayLabel, revenueByDay.getOrDefault(dayKey, BigDecimal.ZERO)));
            cursor = cursor.plusDays(1);
        }
        return graph;
    }

    /**
     * Construit une vue lisible d'une vente (employé + résumé produits).
     */
    private RecentSale toRecentSale(Sale sale) {
        // Résumé produits : "Produit A (x2), Produit B (x1)"
        String itemsSummary = sale.getItems().stream()
                .map(item -> item.productName() + " (x" + item.quantity() + ")")
                .collect(Collectors.joining(", "));

        // Premier produit pour affichage principal
        String firstProduct = sale.getItems().isEmpty()
                ? "—"
                : sale.getItems().get(0).productName();

        String employeeName = sale.getEmployeeName() != null
                ? sale.getEmployeeName()
                : "Opérateur";

        String customerName = sale.getCustomerName() != null && !sale.getCustomerName().isBlank()
                ? sale.getCustomerName()
                : "Passager Éphémère";

        return new RecentSale(
                sale.getId(),
                sale.getSaleNumber(),
                employeeName,
                customerName,
                firstProduct,
                itemsSummary,
                sale.getTotalAmount(),
                sale.getPaymentMethod() != null ? sale.getPaymentMethod().name() : "CASH",
                sale.getCreatedAt() != null ? sale.getCreatedAt().format(DAY_FMT) : "",
                sale.getCreatedAt() != null ? sale.getCreatedAt().format(HOUR_FMT) : ""
        );
    }

    /**
     * Récupère les derniers événements d'audit liés à la sécurité.
     * Filtre sur les actions sensibles : LOGIN, LOGOUT, PASSWORD_CHANGE,
     * SALE_CANCEL, USER_CREATE, ADMIN_CREATED, EMPLOYEE_INVITED.
     */
    private List<SecurityEvent> buildSecurityEvents(LocalDateTime from, LocalDateTime to) {
        List<String> sensitiveActions = List.of(
                "LOGIN", "LOGOUT", "PASSWORD_CHANGE", "ADMIN_CREATED",
                "SALE_CANCEL", "USER_CREATE", "EMPLOYEE_INVITED",
                "PRODUCT_DELETE", "STOCK_ADJUSTMENT", "2FA_VERIFY",
                "LOGIN_FAILED"
        );

        return auditLogRepository.findByTimestampBetween(from, to)
                .stream()
                .filter(log -> sensitiveActions.contains(log.getAction()))
                .sorted(Comparator.comparing(AuditLog::getTimestamp).reversed())
                .limit(8)
                .map(log -> new SecurityEvent(
                        log.getId(),
                        log.getAction(),
                        log.getUserEmail() != null ? log.getUserEmail() : "système",
                        log.getIpAddress() != null ? log.getIpAddress() : "—",
                        log.isSuccess() ? "SUCCESS" : "FAILURE",
                        log.getTimestamp() != null ? log.getTimestamp().format(DAY_FMT) : "",
                        log.getTimestamp() != null ? log.getTimestamp().format(HOUR_FMT) : ""
                ))
                .toList();
    }

    private List<ProductStat> buildProductStats(
            LocalDateTime from, LocalDateTime to, int limit, boolean descending) {

        List<Sale> sales = saleRepository.findByCreatedAtBetweenAndStatus(from, to, SaleStatus.COMPLETED);

        Comparator<Map.Entry<String, Integer>> comparator = descending
                ? Map.Entry.<String, Integer>comparingByValue().reversed()
                : Map.Entry.comparingByValue();

        return sales.stream()
                .flatMap(sale -> sale.getItems().stream())
                .collect(Collectors.groupingBy(
                        SaleItem::productId,
                        Collectors.summingInt(SaleItem::quantity)))
                .entrySet().stream()
                .sorted(comparator)
                .limit(limit)
                .map(entry -> {
                    String pid = entry.getKey();
                    Product product = productRepository.findById(pid).orElse(null);
                    String name = product != null ? product.getName() : "Produit supprimé";
                    return new ProductStat(pid, name, entry.getValue());
                })
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECORDS PUBLICS — contrat JSON vers le frontend
    // ─────────────────────────────────────────────────────────────────────────

    public record DashboardSummary(
            int        todaySalesCount,
            BigDecimal todayRevenue,
            int        weekSalesCount,
            BigDecimal weekRevenue,
            int        monthSalesCount,
            BigDecimal monthRevenue,
            int        prevMonthSalesCount,
            BigDecimal prevMonthRevenue,
            Double     trendPercent,
            BigDecimal monthCostOfGoods,
            BigDecimal grossMargin,
            Double     operationalMarginPct,
            List<WeeklyRevenue> weeklyGraph,     // 7 jours (Lun → Aujourd'hui)
            int        stockAlertsCount,
            List<RecentSale>    recentWeekSales, // 10 dernières ventes de la semaine
            List<SecurityEvent> securityEvents   // derniers logs d'audit sécurité
    ) {}

    /** Point du graphe hebdomadaire. */
    public record WeeklyRevenue(String date, String label, BigDecimal revenue) {}

    /** Vente récente enrichie avec employé + produit principal. */
    public record RecentSale(
            String id,
            String saleNumber,
            String employeeName,    // nom de l'employé ayant effectué la vente
            String customerName,
            String firstProductName, // premier produit vendu
            String itemsSummary,    // tous les produits en résumé
            BigDecimal totalAmount,
            String paymentMethod,
            String date,            // "YYYY-MM-DD"
            String time             // "HH:mm"
    ) {}

    /** Événement sécurité depuis le journal d'audit. */
    public record SecurityEvent(
            String id,
            String action,
            String userEmail,
            String ipAddress,
            String status,   // "SUCCESS" | "FAILURE"
            String date,
            String time
    ) {}

    public record ProductStat(@NonNull String productId, String productName, int quantitySold) {}
}
