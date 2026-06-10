package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.model.Product;
import com.boutiquesync.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Contrôleur du tableau de bord.
 * KPIs temps réel, top/bottom produits, alertes stock.
 * Réservé aux administrateurs.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Dashboard", description = "Tableau de bord temps réel (ADMIN)")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * Récupère le résumé du dashboard (KPIs principaux).
     */
    @GetMapping("/summary")
    @Operation(summary = "Résumé dashboard", description = "Retourne les KPIs principaux en temps réel.")
    public ResponseEntity<ApiResponse<DashboardService.DashboardSummary>> getSummary() {
        DashboardService.DashboardSummary summary = dashboardService.getSummary();
        return ResponseEntity.ok(ApiResponse.success("Dashboard", summary));
    }

    /**
     * Récupère les produits les plus vendus.
     */
    @GetMapping("/top-products")
    @Operation(summary = "Top produits", description = "Retourne les produits les plus vendus sur une période.")
    public ResponseEntity<ApiResponse<List<DashboardService.ProductStat>>> getTopProducts(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "10") int limit) {

        LocalDateTime[] range = getPeriodRange(period);
        List<DashboardService.ProductStat> products = dashboardService.getTopProducts(range[0], range[1], limit);
        return ResponseEntity.ok(ApiResponse.success("Top produits", products));
    }

    /**
     * Récupère les produits les moins vendus.
     */
    @GetMapping("/bottom-products")
    @Operation(summary = "Bottom produits", description = "Retourne les produits les moins vendus sur une période.")
    public ResponseEntity<ApiResponse<List<DashboardService.ProductStat>>> getBottomProducts(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "10") int limit) {

        LocalDateTime[] range = getPeriodRange(period);
        List<DashboardService.ProductStat> products = dashboardService.getBottomProducts(range[0], range[1], limit);
        return ResponseEntity.ok(ApiResponse.success("Bottom produits", products));
    }

    /**
     * Récupère les alertes de stock bas.
     */
    @GetMapping("/stock-alerts")
    @Operation(summary = "Alertes stock", description = "Retourne les produits en alerte de stock bas.")
    public ResponseEntity<ApiResponse<List<Product>>> getStockAlerts() {
        List<Product> alerts = dashboardService.getStockAlerts();
        return ResponseEntity.ok(ApiResponse.success("Alertes stock", alerts));
    }

    // ===== Utilitaires =====

    /**
     * Calcule la plage de dates selon la période demandée.
     */
    private LocalDateTime[] getPeriodRange(String period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = switch (period) {
            case "week" -> LocalDate.now().minusWeeks(1).atStartOfDay();
            case "month" -> LocalDate.now().withDayOfMonth(1).atStartOfDay();
            case "year" -> LocalDate.now().withDayOfYear(1).atStartOfDay();
            default -> LocalDate.now().withDayOfMonth(1).atStartOfDay();
        };
        return new LocalDateTime[]{start, now};
    }
}
