package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.PageResponse;
import com.boutiquesync.dto.product.CreateProductRequest;
import com.boutiquesync.dto.product.UpdateProductRequest;
import com.boutiquesync.model.Product;
import com.boutiquesync.security.UserPrincipal;
import com.boutiquesync.service.ProductService;
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

/**
 * Contrôleur de gestion des produits.
 * CRUD complet avec recherche par code-barres et alertes de stock.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Produits", description = "Gestion du catalogue de produits")
public class ProductController {

    private final ProductService productService;

    /**
     * Liste tous les produits actifs avec pagination.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    @Operation(summary = "Lister les produits", description = "Retourne la liste paginée des produits actifs.")
    public ResponseEntity<ApiResponse<PageResponse<Product>>> getAllProducts(Pageable pageable) {
        Page<Product> products = productService.getAllProducts(pageable);
        return ResponseEntity.ok(ApiResponse.success("Produits récupérés", PageResponse.from(products)));
    }

    /**
     * Crée un nouveau produit (ADMIN uniquement).
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un produit", description = "Ajoute un nouveau produit au catalogue.")
    public ResponseEntity<ApiResponse<Product>> createProduct(
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        Product product = productService.createProduct(request, principal.id());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Produit créé avec succès", product));
    }

    /**
     * Récupère un produit par son ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    @Operation(summary = "Récupérer un produit", description = "Retourne les détails d'un produit.")
    public ResponseEntity<ApiResponse<Product>> getProductById(@PathVariable String id) {
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success("Produit récupéré", product));
    }

    /**
     * Met à jour un produit (ADMIN uniquement).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Modifier un produit", description = "Met à jour les informations d'un produit.")
    public ResponseEntity<ApiResponse<Product>> updateProduct(
            @PathVariable String id,
            @RequestBody UpdateProductRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        Product product = productService.updateProduct(id, request, principal.id());
        return ResponseEntity.ok(ApiResponse.success("Produit mis à jour", product));
    }

    /**
     * Supprime un produit (soft delete, ADMIN uniquement).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un produit", description = "Désactive un produit (soft delete).")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        productService.deleteProduct(id, principal.id());
        return ResponseEntity.ok(ApiResponse.success("Produit supprimé"));
    }

    // /**
    //  * Recherche un produit par code-barres.
    //  */
    // @GetMapping("/barcode/{code}")
    // @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    // @Operation(summary = "Rechercher par code-barres", description = "Trouve un produit par son code-barres.")
    // public ResponseEntity<ApiResponse<Product>> getByBarcode(@PathVariable String code) {
    //     Product product = productService.getProductByBarcode(code);
    //     return ResponseEntity.ok(ApiResponse.success("Produit trouvé", product));
    // }

    /**
     * Liste les produits en alerte de stock bas (ADMIN uniquement).
     */
    @GetMapping("/low-stock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Produits en stock bas", description = "Retourne les produits dont le stock est inférieur au seuil d'alerte.")
    public ResponseEntity<ApiResponse<List<Product>>> getLowStockProducts() {
        List<Product> products = productService.getLowStockProducts();
        return ResponseEntity.ok(ApiResponse.success("Produits en stock bas", products));
    }

    // /**
    //  * Liste les catégories de produits.
    //  */
    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    @Operation(summary = "Lister les catégories", description = "Retourne la liste des catégories de produits.")
    public ResponseEntity<ApiResponse<List<String>>> getCategories() {
        List<String> categories = productService.getCategories();
        return ResponseEntity.ok(ApiResponse.success("Catégories récupérées", categories));
    }
}
