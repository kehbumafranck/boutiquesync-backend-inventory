// package com.boutiquesync.model;

// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Data;
// import lombok.NoArgsConstructor;
// import org.springframework.data.annotation.CreatedDate;
// import org.springframework.data.annotation.Id;
// import org.springframework.data.mongodb.core.index.CompoundIndex;
// import org.springframework.data.mongodb.core.index.CompoundIndexes;
// import org.springframework.data.mongodb.core.index.Indexed;
// import org.springframework.data.mongodb.core.mapping.Document;

// import java.math.BigDecimal;
// import java.time.LocalDate;
// import java.time.LocalDateTime;
// import java.util.List;

// /**
//  * Document MongoDB représentant une écriture comptable OHADA.
//  * Chaque écriture contient des lignes de débit/crédit qui doivent être équilibrées.
//  */
// @Document("journal_entries")
// @CompoundIndexes({
//     @CompoundIndex(name = "idx_entry_date", def = "{'entryDate': -1}"),
//     @CompoundIndex(name = "idx_reference", def = "{'referenceId': 1}")
// })
// @Data
// @Builder
// @NoArgsConstructor
// @AllArgsConstructor
// public class JournalEntry {

//     @Id
//     private String id;

//     /** Numéro de journal unique (ex: JNL-2024-00001) */
//     @Indexed(unique = true)
//     private String journalNumber;

//     /** ID de la référence (saleId, etc.) */
//     private String referenceId;

//     /** Type de référence : SALE, PAYMENT, ADJUSTMENT */
//     private String referenceType;

//     /** Date de l'écriture comptable */
//     private LocalDate entryDate;

//     /** Description de l'écriture */
//     private String description;

//     /** Lignes comptables (débit/crédit) */
//     private List<AccountingLine> lines;

//     /** Total des débits */
//     private BigDecimal totalDebit;

//     /** Total des crédits */
//     private BigDecimal totalCredit;

//     /** Indique si l'écriture est équilibrée (totalDebit == totalCredit) */
//     @Builder.Default
//     private boolean balanced = true;

//     /** ID de l'utilisateur ayant créé l'écriture */
//     private String createdBy;

//     @CreatedDate
//     private LocalDateTime createdAt;
// }
