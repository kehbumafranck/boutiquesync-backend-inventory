package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.PageResponse;
import com.boutiquesync.model.Product;
import com.boutiquesync.model.StockMovement;
import com.boutiquesync.security.UserPrincipal;
import com.boutiquesync.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur de gestion de l'inventaire.
 * Mouvements de stock, ajustements manuels et rapports.
 */
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventaire", description = "Gestion des stocks et mouvements")
public class InventoryController {

    private final InventoryService inventoryService;

    /**
     * Liste tous les mouvements de stock avec pagination (ADMIN uniquement).
     */
    @GetMapping("/movements")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mouvements de stock", description = "Retourne l'historique des mouvements de stock.")
    public ResponseEntity<ApiResponse<PageResponse<StockMovement>>> getMovements(Pageable pageable) {
        Page<StockMovement> movements = inventoryService.getAllMovements(pageable);
        return ResponseEntity.ok(ApiResponse.success("Mouvements récupérés", PageResponse.from(movements)));
    }

    /**
     * Effectue un ajustement manuel de stock (ADMIN uniquement).
     */
    @PostMapping("/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ajuster le stock", description = "Effectue un ajustement manuel de stock (inventaire).")
    public ResponseEntity<ApiResponse<StockMovement>> adjustStock(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal) {

        String productId = (String) body.get("productId");
        int newQuantity = (int) body.get("newQuantity");
        String note = (String) body.getOrDefault("note", "Ajustement manuel");

        StockMovement movement = inventoryService.adjustStock(productId, newQuantity, note, principal.id(), principal.email());
        return ResponseEntity.ok(ApiResponse.success("Stock ajusté", movement));
    }

    /**
     * Récupère le snapshot actuel de l'inventaire (ADMIN uniquement).
     */
    @GetMapping("/snapshot")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Snapshot inventaire", description = "Retourne l'état actuel du stock de tous les produits.")
    public ResponseEntity<ApiResponse<List<Product>>> getSnapshot() {
        List<Product> products = inventoryService.getInventorySnapshot();
        return ResponseEntity.ok(ApiResponse.success("Snapshot inventaire", products));
    }
}
