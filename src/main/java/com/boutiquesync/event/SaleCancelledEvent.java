package com.boutiquesync.event;

import com.boutiquesync.model.Sale;

/**
 * Événement publié lorsqu'une vente est annulée.
 * Déclenche l'invalidation du cache dashboard et la mise à jour des métriques.
 *
 * @param sale La vente annulée
 */
public record SaleCancelledEvent(Sale sale) {}
