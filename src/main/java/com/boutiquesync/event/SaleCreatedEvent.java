package com.boutiquesync.event;

import com.boutiquesync.model.Sale;

/**
 * Événement publié lorsqu'une vente est créée avec succès.
 * Déclenche la génération de facture, l'écriture comptable et la mise à jour du dashboard.
 *
 * @param sale La vente créée
 */
public record SaleCreatedEvent(Sale sale) {}
