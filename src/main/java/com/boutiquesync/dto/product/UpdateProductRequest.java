package com.boutiquesync.dto.product;

import java.math.BigDecimal;

/**
 * DTO pour la mise à jour d'un produit.
 * Tous les champs sont optionnels (mise à jour partielle).
 *
 * @param name          Nom du produit
 * @param description   Description
 * @param barcode       Code-barres
 * @param categoryId    ID de la catégorie
 * @param purchasePrice Prix d'achat
 * @param sellingPrice  Prix de vente
 * @param vatRate       Taux de TVA
 * @param alertThreshold Seuil d'alerte
 * @param unit          Unité de mesure
 * @param imageUrl      URL de l'image
 */
public record UpdateProductRequest(
    String name,
    String description,
    String barcode,
    String categoryId,
    BigDecimal purchasePrice,
    BigDecimal sellingPrice,
    BigDecimal vatRate,
    Integer alertThreshold,
    String unit,
    String imageUrl
) {}
