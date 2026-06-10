package com.boutiquesync.dto.sale;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * DTO pour un article dans une requête de vente.
 *
 * @param productId ID du produit à vendre
 * @param quantity  Quantité souhaitée (min 1)
 */
public record SaleItemRequest(
    @NotBlank(message = "L'ID du produit est obligatoire")
    String productId,

    @Positive(message = "La quantité doit être supérieure à 0")
    int quantity
) {}
