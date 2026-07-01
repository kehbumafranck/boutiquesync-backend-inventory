package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.model.Sale;
import com.boutiquesync.model.enums.SaleStatus;
import com.boutiquesync.repository.SaleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Contrôleur de comptabilité simplifié.
 * Calcule le bilan financier réel à partir des ventes enregistrées en base.
 * Le module AccountingService OHADA complet est prévu pour une prochaine version.
 */
@RestController
@RequestMapping("/api/accounting")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Comptabilité", description = "Bilan financier calculé depuis les ventes (ADMIN)")
public class AccountingController {

    private final SaleRepository saleRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Retourne le bilan financier du mois courant :
     * - totalRevenue  : CA total des ventes complétées ce mois
     * - totalExpense  : coût d'achat estimé (non disponible sans AccountingService → 0)
     * - netProfit     : CA brut (totalRevenue - totalExpense)
     * - marginPercent : marge brute en %
     * - entries       : liste des ventes du mois en écritures comptables
     */
    @GetMapping("/summary")
    @Operation(summary = "Bilan comptable du mois", description = "CA réel calculé depuis les ventes MongoDB.")
    public ResponseEntity<ApiResponse<AccountingSummary>> getSummary() {
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth   = LocalDate.now().atTime(LocalTime.MAX);

        List<Sale> monthSales = saleRepository.findByCreatedAtBetweenAndStatus(
                startOfMonth, endOfMonth, SaleStatus.COMPLETED);

        BigDecimal totalRevenue = monthSales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Les dépenses (achats stock, loyer…) ne sont pas encore en BD.
        // On retourne 0 pour l'instant ; le frontend l'affiche comme "non disponible".
        BigDecimal totalExpense  = BigDecimal.ZERO;
        BigDecimal netProfit     = totalRevenue.subtract(totalExpense);
        double     marginPercent = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? netProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP)
                           .multiply(BigDecimal.valueOf(100))
                           .doubleValue()
                : 0.0;

        List<AccountingEntry> entries = monthSales.stream()
                .sorted(Comparator.comparing(Sale::getCreatedAt).reversed())
                .map(s -> new AccountingEntry(
                        s.getId(),
                        s.getCreatedAt() != null ? s.getCreatedAt().format(DATE_FMT) : "",
                        "Ventes POS",
                        s.getSaleNumber() + " — " + (s.getCustomerName() != null ? s.getCustomerName() : "Passager Éphémère"),
                        s.getTotalAmount(),
                        "REVENUE"
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Bilan comptable",
                new AccountingSummary(totalRevenue, totalExpense, netProfit, marginPercent, entries)));
    }

    // ─── Records publics ─────────────────────────────────────────────────────

    public record AccountingSummary(
            BigDecimal totalRevenue,
            BigDecimal totalExpense,
            BigDecimal netProfit,
            double     marginPercent,
            List<AccountingEntry> entries
    ) {}

    public record AccountingEntry(
            String     id,
            String     date,
            String     category,
            String     description,
            BigDecimal amount,
            String     type   // "REVENUE" | "EXPENSE"
    ) {}
}
