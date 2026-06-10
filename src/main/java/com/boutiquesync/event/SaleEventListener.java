package com.boutiquesync.event;

 //import com.boutiquesync.service.AccountingService;
import com.boutiquesync.service.DashboardService;
import com.boutiquesync.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Écouteur d'événements de vente.
 * Déclenché automatiquement après la création d'une vente.
 * Orchestre :
 * 1. La génération de facture PDF + envoi WhatsApp
 * 2. L'enregistrement des écritures comptables OHADA
 * 3. La mise à jour du dashboard temps réel
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SaleEventListener {

    private final InvoiceService invoiceService;
   // private final AccountingService accountingService;
    private final DashboardService dashboardService;

    /**
     * Listener 1 : Génère la facture et l'envoie par WhatsApp.
     */
    @EventListener
    @Async
    public void handleInvoiceGeneration(SaleCreatedEvent event) {
        try {
            log.info("Génération facture pour vente: {}", event.sale().getSaleNumber());
            invoiceService.generateInvoice(event.sale());
        } catch (Exception e) {
            log.error("Erreur génération facture pour vente {}: {}",
                    event.sale().getSaleNumber(), e.getMessage());
        }
    }

    // /**
    //  * Listener 2 : Enregistre les écritures comptables OHADA.
    //  */
    // @EventListener
    // @Async
    // public void handleAccountingEntries(SaleCreatedEvent event) {
    //     try {
    //         log.info("Enregistrement comptable pour vente: {}", event.sale().getSaleNumber());
    //         accountingService.recordSaleEntries(event.sale());
    //     } catch (Exception e) {
    //         log.error("Erreur enregistrement comptable pour vente {}: {}",
    //                 event.sale().getSaleNumber(), e.getMessage());
    //     }
    // }

    /**
     * Listener 3 : Rafraîchit le dashboard et pousse via WebSocket.
     */
    @EventListener
    @Async
    public void handleDashboardRefresh(SaleCreatedEvent event) {
        try {
            dashboardService.refreshMetrics();
        } catch (Exception e) {
            log.error("Erreur rafraîchissement dashboard: {}", e.getMessage());
        }
    }
}
