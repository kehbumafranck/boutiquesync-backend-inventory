package com.boutiquesync.model;

import com.boutiquesync.model.enums.PaymentMethod;
import com.boutiquesync.model.enums.SaleStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Document MongoDB représentant une vente effectuée en boutique.
 * Contient les articles vendus, les montants et le statut.
 */
@Document("sales")
@CompoundIndexes({
    @CompoundIndex(name = "idx_employee_date", def = "{'employeeId': 1, 'createdAt': -1}"),
    @CompoundIndex(name = "idx_status_date", def = "{'status': 1, 'createdAt': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sale {

    @Id
    private String id;

    /** Numéro de vente unique (ex: VNT-2024-00001) */
    @Indexed(unique = true)
    private String saleNumber;

    /** ID de l'employé ayant effectué la vente */
    private String employeeId;

    /** Nom de l'employé */
    private String employeeName;

    /** ID du client (optionnel) */
    private String customerId;

    /** Nom du client */
    private String customerName;

    /** Numéro WhatsApp du client pour envoi de facture */
    private String customerPhone;

    /** Liste des articles vendus */
    private List<SaleItem> items;

    /** Sous-total hors taxes */
    private BigDecimal subtotal;

    /** Total TVA */
    private BigDecimal totalVat;

    /** Montant total TTC */
    private BigDecimal totalAmount;

    /** Méthode de paiement utilisée */
    private PaymentMethod paymentMethod;

    /** Montant payé par le client */
    private BigDecimal amountPaid;

    /** Monnaie rendue */
    private BigDecimal changeGiven;

    /** ID de la facture générée */
    private String invoiceId;

    /** Statut de la vente */
    @Builder.Default
    private SaleStatus status = SaleStatus.COMPLETED;

    /** Raison de l'annulation (si applicable) */
    private String cancellationReason;

    /** ID de l'utilisateur ayant annulé la vente */
    private String cancelledBy;

    @CreatedDate
    private LocalDateTime createdAt;

    
}
