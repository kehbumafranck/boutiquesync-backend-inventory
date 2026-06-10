package com.boutiquesync.dto.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

/**
 * DTO pour la création d'un produit.
 *
 * @param name          Nom du produit
 * @param description   Description (optionnel)
 * @param barcode       Code-barres (optionnel)
 * @param categoryId    ID de la catégorie
 * @param purchasePrice Prix d'achat
 * @param sellingPrice  Prix de vente
 * @param vatRate       Taux de TVA (%)
 * @param currentStock  Stock initial
 * @param alertThreshold Seuil d'alerte stock bas
 * @param unit          Unité de mesure
 * @param imageUrl      URL de l'image (optionnel)
 */
public record CreateProductRequest(
    @NotBlank(message = "Le nom du produit est obligatoire")
    String name,

    String description,
    String barcode,
    String categoryId,

    @NotNull(message = "Le prix d'achat est obligatoire")
    BigDecimal purchasePrice,

    @NotNull(message = "Le prix de vente est obligatoire")
    BigDecimal sellingPrice,

    BigDecimal vatRate,

    @PositiveOrZero(message = "Le stock ne peut pas être négatif")
    int currentStock,

    int alertThreshold,
    String unit,
    String imageUrl
) {}
