package com.boutiquesync.service;

import com.boutiquesync.dto.product.CreateProductRequest;
import com.boutiquesync.dto.product.UpdateProductRequest;
import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.Product;
import com.boutiquesync.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service de gestion des produits.
 * CRUD complet avec gestion du stock et des alertes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final AuditService auditService;

    /**
     * Crée un nouveau produit.
     *
     * @param request Données du produit à créer
     * @param userId  ID de l'utilisateur créateur
     * @return Le produit créé
     */
    public Product createProduct(CreateProductRequest request, String userId) {
        if (productRepository.existsByNameAndActiveTrue(request.name())) {
            throw new BusinessException("Un produit existe déjà avec ce nom : " + request.name(), "PRODUCT_NAME_EXISTS");
        }
        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .barcode(request.barcode())
                .categoryId(request.categoryId())
                .purchasePrice(request.purchasePrice())
                .sellingPrice(request.sellingPrice())
                .vatRate(request.vatRate() != null ? request.vatRate() : new BigDecimal("19.25"))
                .currentStock(request.currentStock())
                .alertThreshold(request.alertThreshold() > 0 ? request.alertThreshold() : 5)
                .unit(request.unit() != null ? request.unit() : "pièce")
                .imageUrl(request.imageUrl())
                .active(true)
                .build();

        product = productRepository.save(product);

        auditService.logAction(userId, null, "PRODUCT_CREATE",
                "PRODUCT", product.getId(), product.getName(), null, null, true);

        log.info("Produit créé: {} ({})", product.getName(), product.getId());
        return product;
    }

    /**
     * Met à jour un produit existant.
     *
     * @param id      ID du produit
     * @param request Données à mettre à jour
     * @param userId  ID de l'utilisateur
     * @return Le produit mis à jour
     */
    public Product updateProduct(String id, UpdateProductRequest request, String userId) {
        Product product = getProductById(id);

        if (request.name() != null) product.setName(request.name());
        if (request.description() != null) product.setDescription(request.description());
        if (request.barcode() != null) product.setBarcode(request.barcode());
        if (request.categoryId() != null) product.setCategoryId(request.categoryId());
        if (request.purchasePrice() != null) product.setPurchasePrice(request.purchasePrice());
        if (request.sellingPrice() != null) product.setSellingPrice(request.sellingPrice());
        if (request.vatRate() != null) product.setVatRate(request.vatRate());
        if (request.alertThreshold() != null) product.setAlertThreshold(request.alertThreshold());
        if (request.unit() != null) product.setUnit(request.unit());
        if (request.imageUrl() != null) product.setImageUrl(request.imageUrl());

        product = productRepository.save(product);

        auditService.logAction(userId, null, "PRODUCT_MODIFY",
                "PRODUCT", product.getId(), product.getName(), null, null, true);

        return product;
    }

    /**
     * Supprime un produit (soft delete).
     */
    public void deleteProduct(String id, String userId) {
        Product product = getProductById(id);
        product.setActive(false);
        productRepository.save(product);

        auditService.logAction(userId, null, "PRODUCT_DELETE",
                "PRODUCT", id, product.getName(), null, null, true);
    }

    /**
     * Récupère un produit par son ID.
     */
    public Product getProductById(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Produit non trouvé", "PRODUCT_NOT_FOUND"));
    }

    // /**
    //  * Récupère un produit par son code-barres.
    //  */
    // public Product getProductByBarcode(String barcode) {
    //     return productRepository.findByBarcode(barcode)
    //             .orElseThrow(() -> new BusinessException("Produit non trouvé pour ce code-barres", "PRODUCT_NOT_FOUND"));
    // }

    /**
     * Liste tous les produits actifs avec pagination.
     * Inclut aussi les anciens produits sans champ 'active' (migration MongoDB).
     */
    public Page<Product> getAllProducts(Pageable pageable) {
        return productRepository.findAllActiveOrLegacy(pageable);
    }

    /**
     * Liste les produits en alerte de stock bas.
     */
    public List<Product> getLowStockProducts() {
        return productRepository.findLowStockProducts();
    }

    /**
     * Liste les catégories distinctes.
     */
    public List<String> getCategories() {
        return productRepository.findDistinctCategories().stream()
                .map(Product::getCategoryId)
                .distinct()
                .toList();
    }
}
