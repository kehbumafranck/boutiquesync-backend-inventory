package com.boutiquesync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Document MongoDB représentant une facture générée suite à une vente.
 * Contient le chemin vers le PDF et le statut d'envoi WhatsApp.
 */
@Document("invoices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {

    @Id
    private String id;

    /** Numéro de facture unique (ex: FAC-2024-00001) */
    @Indexed(unique = true)
    private String invoiceNumber;

    /** ID de la vente associée */
    @Indexed
    private String saleId;

    /** Nom du client */
    private String customerName;

    /** Numéro WhatsApp du client */
    private String customerPhone;

    /** Articles facturés */
    private List<SaleItem> items;

    /** Sous-total HT */
    private BigDecimal subtotal;

    /** Total TVA */
    private BigDecimal totalVat;

    /** Montant total TTC */
    private BigDecimal totalAmount;

    /** Chemin vers le fichier PDF généré */
    private String pdfPath;

    /** Indique si la facture a été envoyée par WhatsApp */
    @Builder.Default
    private boolean whatsappSent = false;

    /** Date/heure d'envoi WhatsApp */
    private LocalDateTime whatsappSentAt;

    /** ID du message WhatsApp (pour suivi) */
    private String whatsappMessageId;

    /** Indique si la facture a été envoyée par email */
    @Builder.Default
    private boolean emailSent = false;

    @CreatedDate
    private LocalDateTime createdAt;
}
