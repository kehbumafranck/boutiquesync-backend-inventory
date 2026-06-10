package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.PageResponse;
import com.boutiquesync.model.Invoice;
import com.boutiquesync.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur de gestion des factures.
 * Consultation, téléchargement PDF et renvoi WhatsApp.
 */
@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
@Tag(name = "Factures", description = "Gestion des factures PDF")
public class InvoiceController {

    private final InvoiceService invoiceService;

    /**
     * Liste toutes les factures avec pagination (ADMIN uniquement).
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lister les factures", description = "Retourne la liste paginée des factures.")
    public ResponseEntity<ApiResponse<PageResponse<Invoice>>> getAllInvoices(Pageable pageable) {
        Page<Invoice> invoices = invoiceService.getAllInvoices(pageable);
        return ResponseEntity.ok(ApiResponse.success("Factures récupérées", PageResponse.from(invoices)));
    }

    /**
     * Récupère une facture par son ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Récupérer une facture", description = "Retourne les détails d'une facture.")
    public ResponseEntity<ApiResponse<Invoice>> getInvoiceById(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoiceById(id);
        return ResponseEntity.ok(ApiResponse.success("Facture récupérée", invoice));
    }

    /**
     * Télécharge le PDF d'une facture.
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    @Operation(summary = "Télécharger PDF", description = "Télécharge le fichier PDF de la facture.")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoiceById(id);
        byte[] pdfContent = invoiceService.getInvoicePdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=" + invoice.getInvoiceNumber() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfContent);
    }

    // /**
    //  * Renvoie une facture par WhatsApp (ADMIN uniquement).
    //  */
    // @PostMapping("/{id}/resend-whatsapp")
    // @PreAuthorize("hasRole('ADMIN')")
    // @Operation(summary = "Renvoyer par WhatsApp", description = "Renvoie la facture au client via WhatsApp.")
    // public ResponseEntity<ApiResponse<Void>> resendWhatsApp(@PathVariable String id) {
    //     invoiceService.resendWhatsApp(id);
    //     return ResponseEntity.ok(ApiResponse.success("Facture renvoyée par WhatsApp"));
    // }
}
