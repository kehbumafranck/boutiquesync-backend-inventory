package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.PageResponse;
import com.boutiquesync.dto.sale.CreateSaleRequest;
import com.boutiquesync.model.Sale;
import com.boutiquesync.security.UserPrincipal;
import com.boutiquesync.service.SaleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur de gestion des ventes.
 * Création, consultation et annulation des ventes.
 */
@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
@Tag(name = "Ventes", description = "Gestion des ventes en boutique")
public class SaleController {

    private final SaleService saleService;

    /**
     * Crée une nouvelle vente.
     * Accessible aux ADMIN et EMPLOYEE.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    @Operation(summary = "Créer une vente", description = "Enregistre une nouvelle vente avec déduction automatique du stock.")
    public ResponseEntity<ApiResponse<Sale>> createSale(
            @Valid @RequestBody CreateSaleRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        Sale sale = saleService.createSale(request, principal.id(), principal.email());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Vente créée avec succès", sale));
    }

    /**
     * Liste toutes les ventes avec pagination (ADMIN uniquement).
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lister les ventes", description = "Retourne la liste paginée de toutes les ventes.")
    public ResponseEntity<ApiResponse<PageResponse<Sale>>> getAllSales(Pageable pageable) {
        Page<Sale> sales = saleService.getAllSales(pageable);
        return ResponseEntity.ok(ApiResponse.success("Ventes récupérées", PageResponse.from(sales)));
    }

    /**
     * Récupère une vente par son ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    @Operation(summary = "Récupérer une vente", description = "Retourne les détails d'une vente.")
    public ResponseEntity<ApiResponse<Sale>> getSaleById(@PathVariable String id) {
        Sale sale = saleService.getSaleById(id);
        return ResponseEntity.ok(ApiResponse.success("Vente récupérée", sale));
    }

    /**
     * Annule une vente (ADMIN uniquement).
     * Restaure le stock automatiquement.
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Annuler une vente", description = "Annule une vente et restaure le stock.")
    public ResponseEntity<ApiResponse<Sale>> cancelSale(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {

        String reason = body.getOrDefault("reason", "Annulation par l'administrateur");
        Sale sale = saleService.cancelSale(id, reason, principal.id());
        return ResponseEntity.ok(ApiResponse.success("Vente annulée", sale));
    }

    /**
     * Récupère les ventes du jour (ADMIN uniquement).
     */
    @GetMapping("/today")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ventes du jour", description = "Retourne toutes les ventes effectuées aujourd'hui.")
    public ResponseEntity<ApiResponse<List<Sale>>> getTodaySales() {
        List<Sale> sales = saleService.getTodaySales();
        return ResponseEntity.ok(ApiResponse.success("Ventes du jour", sales));
    }

   @GetMapping("/toweek")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ventes de la semaine", description = "Retourne toutes les ventes effectuées dans la semaine ")
    public ResponseEntity<ApiResponse<List<Sale>>> getToWeekSale() {
        List<Sale> sales = saleService.getToWeekSales();
        return ResponseEntity.ok(ApiResponse.success("Ventes de la semaine", sales));
    }
}
