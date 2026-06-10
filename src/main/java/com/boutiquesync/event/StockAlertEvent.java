package com.boutiquesync.event;

import com.boutiquesync.model.Product;

/**
 * Événement publié lorsqu'un produit atteint son seuil d'alerte de stock.
 *
 * @param product Le produit en alerte
 */
public record StockAlertEvent(Product product) {}
