package com.boutiquesync.model;

import java.math.BigDecimal;

/**
 * Record représentant un article dans une vente.
 * Immutable par nature (Java Record).
 *
 * @param productId   ID du produit vendu
 * @param productName Nom du produit
 * @param quantity    Quantité vendue
 * @param unitPrice   Prix unitaire au moment de la vente
 * @param vatRate     Taux de TVA appliqué
 * @param lineTotal   Total de la ligne (quantité × prix unitaire)
 */
public record SaleItem(
    String productId,
    String productName,
    int quantity,
    BigDecimal unitPrice,
    BigDecimal vatRate,
    BigDecimal lineTotal
) {}
