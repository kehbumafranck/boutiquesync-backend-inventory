package com.boutiquesync.model.enums;

/**
 * Types de mouvements de stock.
 */
public enum MovementType {
    SALE_OUT,       // Sortie suite à une vente
    SUPPLIER_IN,    // Entrée fournisseur
    ADJUSTMENT,     // Ajustement manuel (inventaire)
    RETURN          // Retour client
}
