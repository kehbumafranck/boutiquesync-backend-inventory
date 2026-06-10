package com.boutiquesync.event;

import com.boutiquesync.model.Product;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Écouteur d'événements d'alerte de stock.
 * Déclenché lorsqu'un produit atteint son seuil d'alerte.
 * Envoie une notification temps réel via WebSocket à l'admin.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StockAlertListener {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Gère l'alerte de stock bas.
     * Pousse une notification WebSocket vers le topic des alertes.
     */
    @EventListener
    @Async
    public void handleStockAlert(StockAlertEvent event) {
        Product product = event.product();
        log.warn("ALERTE STOCK: {} - Stock actuel: {} (seuil: {})",
                product.getName(), product.getCurrentStock(), product.getAlertThreshold());

        // Pousser l'alerte via WebSocket
        Map<String, Object> alert = Map.of(
                "type", "STOCK_ALERT",
                "productId", product.getId(),
                "productName", product.getName(),
                "currentStock", product.getCurrentStock(),
                "alertThreshold", product.getAlertThreshold(),
                "message", String.format("Stock bas pour '%s': %d unités restantes",
                        product.getName(), product.getCurrentStock())
        );

        messagingTemplate.convertAndSend("/topic/alerts", alert);
    }
}
