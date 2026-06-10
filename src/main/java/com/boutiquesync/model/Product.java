package com.boutiquesync.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Document MongoDB représentant un produit en stock.
 * Contient les informations de prix, TVA et seuils d'alerte.
 */
@Document("products")
@CompoundIndexes({
    @CompoundIndex(name = "idx_category_active", def = "{'categoryId': 1, 'active': 1}"),
    @CompoundIndex(name = "idx_stock_alert", def = "{'currentStock': 1, 'alertThreshold': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    private String id;

    @NotBlank(message = "Le nom du produit est obligatoire")
    private String name;

    private String description;

    /** Code-barres ou QR code (optionnel) */
    @Indexed(sparse = true)
    private String barcode;

    // /** Identifiant de la catégorie */
    // private String categoryId;

    /** Prix d'achat (coût fournisseur) */
    @NotNull(message = "Le prix d'achat est obligatoire")
    private BigDecimal purchasePrice;

    /** Prix de vente au client */
    @NotNull(message = "Le prix de vente est obligatoire")
    private BigDecimal sellingPrice;

    /** Taux de TVA applicable (ex: 19.25 pour le Cameroun) */
    @Builder.Default
    private BigDecimal vatRate = new BigDecimal("19.25");

    /** Stock actuel en unités */
    @PositiveOrZero(message = "Le stock ne peut pas être négatif")
    @Builder.Default
    private int currentStock = 0;

    /** Seuil d'alerte de stock bas */
    @Builder.Default
    private int alertThreshold = 5;

    /** Unité de mesure : kg, litre, pièce, etc. */
    @Builder.Default
    private String unit = "pièce";

    /** URL de l'image du produit */
    private String imageUrl;

    /** Indique si le produit est actif (soft delete = false) */
    @Builder.Default
    private boolean active = true;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
