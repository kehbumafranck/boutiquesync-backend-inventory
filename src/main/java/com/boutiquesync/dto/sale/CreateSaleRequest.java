package com.boutiquesync.dto.sale;

import com.boutiquesync.model.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO pour la création d'une vente.
 *
 * @param customerName  Nom du client (optionnel)
 * @param customerPhone Numéro WhatsApp du client (optionnel, pour envoi facture)
 * @param items         Liste des articles à vendre (min 1)
 * @param paymentMethod Méthode de paiement
 * @param amountPaid    Montant payé par le client
 */
public record CreateSaleRequest(
    String customerName,
    String customerPhone,

    @NotEmpty(message = "La vente doit contenir au moins un article")
    @Valid
    List<SaleItemRequest> items,

    @NotNull(message = "La méthode de paiement est obligatoire")
    PaymentMethod paymentMethod,

    @NotNull(message = "Le montant payé est obligatoire")
    @Positive(message = "Le montant payé doit être positif")
    BigDecimal amountPaid
) {}
