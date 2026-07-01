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
 * Déclenché automatiquement après la création ou l'annulation d'une vente.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SaleEventListener {

    private final InvoiceService invoiceService;
    private final DashboardService dashboardService;

    /** Listener 1 : Génère la facture et l'envoie par WhatsApp. */
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

    /** Listener 2 : Rafraîchit le dashboard après une nouvelle vente. */
    @EventListener
    @Async
    public void handleDashboardRefreshOnCreate(SaleCreatedEvent event) {
        try {
            dashboardService.refreshMetrics();
            log.debug("Dashboard rafraîchi après vente: {}", event.sale().getSaleNumber());
        } catch (Exception e) {
            log.error("Erreur rafraîchissement dashboard (création): {}", e.getMessage());
        }
    }

    /** Listener 3 : Rafraîchit le dashboard après une annulation de vente. */
    @EventListener
    @Async
    public void handleDashboardRefreshOnCancel(SaleCancelledEvent event) {
        try {
            dashboardService.refreshMetrics();
            log.debug("Dashboard rafraîchi après annulation vente: {}", event.sale().getSaleNumber());
        } catch (Exception e) {
            log.error("Erreur rafraîchissement dashboard (annulation): {}", e.getMessage());
        }
    }
}
