package com.boutiquesync.model;

import com.boutiquesync.model.enums.MovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Document MongoDB représentant un mouvement de stock.
 * Trace chaque entrée/sortie de produit avec quantités avant/après.
 */
@Document("stock_movements")
@CompoundIndex(name = "idx_product_date", def = "{'productId': 1, 'createdAt': -1}")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMovement {

    @Id
    private String id;

    /** ID du produit concerné */
    private String productId;

    /** Nom du produit (dénormalisé pour les rapports) */
    private String productName;

    /** Type de mouvement */
    private MovementType type;

    /** Quantité avant le mouvement */
    private int quantityBefore;

    /** Variation de quantité (négatif pour sortie, positif pour entrée) */
    private int quantityChange;

    /** Quantité après le mouvement */
    private int quantityAfter;

    /** ID de référence (saleId, supplierId, etc.) */
    private String referenceId;

    /** ID de l'utilisateur ayant effectué le mouvement */
    private String performedBy;

    /** Note explicative */
    private String note;

    @CreatedDate
    private LocalDateTime createdAt;
}
