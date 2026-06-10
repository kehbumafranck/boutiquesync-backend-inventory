// package com.boutiquesync.service;

// import com.boutiquesync.config.WhatsAppProperties;
// import com.boutiquesync.model.Invoice;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.http.HttpHeaders;
// import org.springframework.http.MediaType;
// import org.springframework.stereotype.Service;
// import org.springframework.web.client.RestClient;

// import java.time.LocalDateTime;
// import java.util.Map;

// /**
//  * Service d'envoi de messages via l'API WhatsApp Business (Meta Cloud API).
//  * Envoie les factures PDF aux clients avec un message personnalisé.
//  * Gère les erreurs et les tentatives de renvoi (max 3).
//  */
// @Service
// @RequiredArgsConstructor
// @Slf4j
// public class WhatsAppSender {

//     private final WhatsAppProperties whatsAppProperties;

//     private static final int MAX_RETRIES = 3;

//     /**
//      * Envoie une facture par WhatsApp au client.
//      * Message : "Bonjour {nom}, veuillez trouver ci-joint votre facture {numéro}. Merci pour votre achat."
//      *
//      * @param invoice La facture à envoyer
//      */
//     public void sendInvoice(Invoice invoice) {
//         if (whatsAppProperties.getAccessToken() == null || whatsAppProperties.getAccessToken().isBlank()) {
//             log.warn("WhatsApp non configuré. Facture {} non envoyée.", invoice.getInvoiceNumber());
//             return;
//         }

//         String customerName = invoice.getCustomerName() != null ? invoice.getCustomerName() : "Client";
//         String message = String.format(
//                 "Bonjour %s, veuillez trouver ci-joint votre facture %s. Merci pour votre achat.",
//                 customerName, invoice.getInvoiceNumber()
//         );

//         // Corps de la requête pour l'API Meta WhatsApp
//         Map<String, Object> requestBody = Map.of(
//                 "messaging_product", "whatsapp",
//                 "to", invoice.getCustomerPhone(),
//                 "type", "text",
//                 "text", Map.of("body", message)
//         );

//         String url = String.format("%s/%s/messages",
//                 whatsAppProperties.getApiUrl(),
//                 whatsAppProperties.getPhoneNumberId());

//         int attempts = 0;
//         while (attempts < MAX_RETRIES) {
//             try {
//                 RestClient restClient = RestClient.create();
//                 var response = restClient.post()
//                         .uri(url)
//                         .header(HttpHeaders.AUTHORIZATION, "Bearer " + whatsAppProperties.getAccessToken())
//                         .contentType(MediaType.APPLICATION_JSON)
//                         .body(requestBody)
//                         .retrieve()
//                         .body(Map.class);

//                 log.info("WhatsApp envoyé pour facture {} au {}", invoice.getInvoiceNumber(), invoice.getCustomerPhone());
//                 return;

//             } catch (Exception e) {
//                 attempts++;
//                 log.warn("Tentative {}/{} échouée pour WhatsApp facture {}: {}",
//                         attempts, MAX_RETRIES, invoice.getInvoiceNumber(), e.getMessage());

//                 if (attempts >= MAX_RETRIES) {
//                     log.error("Échec définitif envoi WhatsApp pour facture {}", invoice.getInvoiceNumber());
//                 }
//             }
//         }
//     }
// }
