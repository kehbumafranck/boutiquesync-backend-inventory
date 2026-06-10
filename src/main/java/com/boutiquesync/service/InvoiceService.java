package com.boutiquesync.service;

import com.boutiquesync.config.ShopProperties;
import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.Invoice;
import com.boutiquesync.model.Sale;
import com.boutiquesync.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

//import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
//import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Service de gestion des factures.
 * Génère les factures PDF et gère leur envoi via WhatsApp.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final SequenceService sequenceService;
    private final ShopProperties shopProperties;
    // private final WhatsAppSender whatsAppSender;

    private static final String INVOICE_DIR = "invoices";

    /**
     * Génère une facture PDF pour une vente.
     * Crée le document Invoice et génère le fichier PDF.
     * Si le client a un numéro WhatsApp, envoie la facture automatiquement.
     *
     * @param sale La vente pour laquelle générer la facture
     * @return La facture créée
     */
    public Invoice generateInvoice(Sale sale) {
        String invoiceNumber = sequenceService.generateInvoiceNumber();

        // Créer le répertoire des factures si nécessaire
        try {
            Files.createDirectories(Paths.get(INVOICE_DIR));
        } catch (Exception e) {
            log.error("Impossible de créer le répertoire des factures", e);
        }

        String pdfPath = INVOICE_DIR + "/" + invoiceNumber + ".pdf";

        // Générer le PDF
        generatePdf(sale, invoiceNumber, pdfPath);

        // Créer le document Invoice
        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .saleId(sale.getId())
                .customerName(sale.getCustomerName())
                .customerPhone(sale.getCustomerPhone())
                .items(sale.getItems())
                .subtotal(sale.getSubtotal())
                .totalVat(sale.getTotalVat())
                .totalAmount(sale.getTotalAmount())
                .pdfPath(pdfPath)
                .build();

        invoice = invoiceRepository.save(invoice);

        // TODO: WhatsApp désactivé pour le moment
        // if (sale.getCustomerPhone() != null && !sale.getCustomerPhone().isBlank()) {
        //     try {
        //         whatsAppSender.sendInvoice(invoice);
        //         invoice.setWhatsappSent(true);
        //         invoice = invoiceRepository.save(invoice);
        //     } catch (Exception e) {
        //         log.error("Erreur envoi WhatsApp pour facture {}: {}", invoiceNumber, e.getMessage());
        //     }
        // }

        log.info("Facture générée: {} pour vente {}", invoiceNumber, sale.getSaleNumber());
        return invoice;
    }

    /**
     * Récupère une facture par son ID.
     */
    public Invoice getInvoiceById(String id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Facture non trouvée", "INVOICE_NOT_FOUND"));
    }

    /**
     * Récupère toutes les factures avec pagination.
     */
    public Page<Invoice> getAllInvoices(Pageable pageable) {
        return invoiceRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    /**
     * Récupère le contenu PDF d'une facture.
     */
    public byte[] getInvoicePdf(String id) {
        Invoice invoice = getInvoiceById(id);
        try {
            return Files.readAllBytes(Paths.get(invoice.getPdfPath()));
        } catch (Exception e) {
            throw new BusinessException("Fichier PDF non trouvé", "PDF_NOT_FOUND");
        }
    }

    // /**
    //  * Renvoie une facture par WhatsApp.
    //  */
    // public void resendWhatsApp(String id) {
    //     Invoice invoice = getInvoiceById(id);
    //     if (invoice.getCustomerPhone() == null || invoice.getCustomerPhone().isBlank()) {
    //         throw new BusinessException("Pas de numéro WhatsApp pour ce client", "NO_PHONE_NUMBER");
    //     }
    //     whatsAppSender.sendInvoice(invoice);
    //     invoice.setWhatsappSent(true);
    //     invoiceRepository.save(invoice);
    // }

    /**
     * Génère le fichier PDF de la facture avec iText.
     * Contient : en-tête boutique, détails client, tableau des articles, totaux.
     */
    private void generatePdf(Sale sale, String invoiceNumber, String pdfPath) {
        try {
            // Création simplifiée du PDF avec iText 7
            // En production, utiliser un template plus élaboré
            com.itextpdf.kernel.pdf.PdfWriter writer =
                    new com.itextpdf.kernel.pdf.PdfWriter(new FileOutputStream(pdfPath));
            com.itextpdf.kernel.pdf.PdfDocument pdfDoc =
                    new com.itextpdf.kernel.pdf.PdfDocument(writer);
            com.itextpdf.layout.Document document =
                    new com.itextpdf.layout.Document(pdfDoc);

            // En-tête
            document.add(new com.itextpdf.layout.element.Paragraph(shopProperties.getName())
                    .setFontSize(20).setBold());
            document.add(new com.itextpdf.layout.element.Paragraph(
                    shopProperties.getAddress() + " | " + shopProperties.getPhone()));
            document.add(new com.itextpdf.layout.element.Paragraph(""));

            // Numéro de facture
            document.add(new com.itextpdf.layout.element.Paragraph("FACTURE N° " + invoiceNumber)
                    .setFontSize(16).setBold());
            document.add(new com.itextpdf.layout.element.Paragraph(
                    "Client: " + (sale.getCustomerName() != null ? sale.getCustomerName() : "Client comptoir")));
            document.add(new com.itextpdf.layout.element.Paragraph(""));

            // Tableau des articles
            com.itextpdf.layout.element.Table table =
                    new com.itextpdf.layout.element.Table(new float[]{4, 1, 2, 2});
            table.setWidth(com.itextpdf.layout.properties.UnitValue.createPercentValue(100));

            table.addHeaderCell("Produit");
            table.addHeaderCell("Qté");
            table.addHeaderCell("Prix unit.");
            table.addHeaderCell("Total");

            for (var item : sale.getItems()) {
                table.addCell(item.productName());
                table.addCell(String.valueOf(item.quantity()));
                table.addCell(item.unitPrice() + " " + shopProperties.getCurrency());
                table.addCell(item.lineTotal() + " " + shopProperties.getCurrency());
            }

            document.add(table);
            document.add(new com.itextpdf.layout.element.Paragraph(""));

            // Totaux
            document.add(new com.itextpdf.layout.element.Paragraph(
                    "Sous-total HT: " + sale.getSubtotal() + " " + shopProperties.getCurrency()));
            document.add(new com.itextpdf.layout.element.Paragraph(
                    "TVA: " + sale.getTotalVat() + " " + shopProperties.getCurrency()));
            document.add(new com.itextpdf.layout.element.Paragraph(
                    "TOTAL TTC: " + sale.getTotalAmount() + " " + shopProperties.getCurrency())
                    .setBold().setFontSize(14));

            document.close();
            log.debug("PDF généré: {}", pdfPath);

        } catch (Exception e) {
            log.error("Erreur génération PDF: {}", e.getMessage());
            // Ne pas bloquer la vente si le PDF échoue
        }
    }
}
