// package com.boutiquesync.service;

// import com.boutiquesync.model.*;
// import com.boutiquesync.model.enums.OhadaAccountCode;
// import com.boutiquesync.repository.JournalEntryRepository;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.data.domain.Page;
// import org.springframework.data.domain.Pageable;
// import org.springframework.stereotype.Service;

// import java.math.BigDecimal;
// import java.time.LocalDate;
// import java.util.List;
// import java.util.Map;
// import java.util.stream.Collectors;

// /**
//  * Service de comptabilité OHADA SYSCOHADA.
//  * Génère automatiquement les écritures comptables lors des ventes.
//  * Fournit les états financiers : journal, grand-livre, balance, compte de résultat.
//  */
// @Service
// @RequiredArgsConstructor
// @Slf4j
// public class AccountingService {

//     private final JournalEntryRepository journalEntryRepository;
//     private final SequenceService sequenceService;

//     /**
//      * Enregistre les écritures comptables pour une vente.
//      * Selon le plan OHADA :
//      * - Débit 411 (Clients) = montant TTC
//      * - Crédit 701 (Ventes de marchandises) = montant HT
//      * - Crédit 4432 (TVA collectée) = montant TVA
//      *
//      * @param sale La vente à comptabiliser
//      */
//     public void recordSaleEntries(Sale sale) {
//         String journalNumber = sequenceService.generateJournalNumber();

//         List<AccountingLine> lines = List.of(
//                 // Débit : Clients (montant TTC)
//                 new AccountingLine(
//                         OhadaAccountCode.CLIENTS.getCode(),
//                         OhadaAccountCode.CLIENTS.getLabel(),
//                         sale.getTotalAmount(),
//                         BigDecimal.ZERO
//                 ),
//                 // Crédit : Ventes de marchandises (montant HT)
//                 new AccountingLine(
//                         OhadaAccountCode.VENTES_MARCHANDISES.getCode(),
//                         OhadaAccountCode.VENTES_MARCHANDISES.getLabel(),
//                         BigDecimal.ZERO,
//                         sale.getSubtotal()
//                 ),
//                 // Crédit : TVA collectée
//                 new AccountingLine(
//                         OhadaAccountCode.TVA_COLLECTEE.getCode(),
//                         OhadaAccountCode.TVA_COLLECTEE.getLabel(),
//                         BigDecimal.ZERO,
//                         sale.getTotalVat()
//                 )
//         );

//         JournalEntry entry = JournalEntry.builder()
//                 .journalNumber(journalNumber)
//                 .referenceId(sale.getId())
//                 .referenceType("SALE")
//                 .entryDate(LocalDate.now())
//                 .description("Vente " + sale.getSaleNumber() + " - " +
//                         (sale.getCustomerName() != null ? sale.getCustomerName() : "Client comptoir"))
//                 .lines(lines)
//                 .totalDebit(sale.getTotalAmount())
//                 .totalCredit(sale.getSubtotal().add(sale.getTotalVat()))
//                 .balanced(true)
//                 .createdBy(sale.getEmployeeId())
//                 .build();

//         journalEntryRepository.save(entry);
//         log.info("Écriture comptable créée: {} pour vente {}", journalNumber, sale.getSaleNumber());
//     }

//     /**
//      * Récupère le journal comptable avec pagination et filtrage par dates.
//      *
//      * @param from     Date de début (optionnel)
//      * @param to       Date de fin (optionnel)
//      * @param pageable Pagination
//      * @return Page d'écritures comptables
//      */
//     public Page<JournalEntry> getJournal(LocalDate from, LocalDate to, Pageable pageable) {
//         if (from != null && to != null) {
//             return journalEntryRepository.findByEntryDateBetween(from, to, pageable);
//         }
//         return journalEntryRepository.findAllByOrderByEntryDateDesc(pageable);
//     }

//     /**
//      * Génère le grand-livre (ledger) : regroupement par compte comptable.
//      *
//      * @param from Date de début
//      * @param to   Date de fin
//      * @return Map des comptes avec leurs mouvements
//      */
//     public Map<String, List<AccountingLine>> getLedger(LocalDate from, LocalDate to) {
//         List<JournalEntry> entries = journalEntryRepository.findByEntryDateBetween(from, to);

//         return entries.stream()
//                 .flatMap(entry -> entry.getLines().stream())
//                 .collect(Collectors.groupingBy(AccountingLine::accountCode));
//     }

//     /**
//      * Génère la balance comptable : solde de chaque compte.
//      *
//      * @param from Date de début
//      * @param to   Date de fin
//      * @return Liste des soldes par compte
//      */
//     public List<AccountBalance> getBalance(LocalDate from, LocalDate to) {
//         Map<String, List<AccountingLine>> ledger = getLedger(from, to);

//         return ledger.entrySet().stream()
//                 .map(entry -> {
//                     String accountCode = entry.getKey();
//                     List<AccountingLine> lines = entry.getValue();

//                     BigDecimal totalDebit = lines.stream()
//                             .map(AccountingLine::debitAmount)
//                             .reduce(BigDecimal.ZERO, BigDecimal::add);
//                     BigDecimal totalCredit = lines.stream()
//                             .map(AccountingLine::creditAmount)
//                             .reduce(BigDecimal.ZERO, BigDecimal::add);

//                     String label = lines.isEmpty() ? "" : lines.get(0).accountLabel();

//                     return new AccountBalance(accountCode, label, totalDebit, totalCredit,
//                             totalDebit.subtract(totalCredit));
//                 })
//                 .toList();
//     }

//     /**
//      * Génère le compte de résultat simplifié.
//      *
//      * @param from Date de début
//      * @param to   Date de fin
//      * @return Compte de résultat
//      */
//     public IncomeStatement getIncomeStatement(LocalDate from, LocalDate to) {
//         List<AccountBalance> balance = getBalance(from, to);

//         // Produits (comptes 7xx)
//         BigDecimal totalRevenue = balance.stream()
//                 .filter(b -> b.accountCode().startsWith("7"))
//                 .map(AccountBalance::totalCredit)
//                 .reduce(BigDecimal.ZERO, BigDecimal::add);

//         // Charges (comptes 6xx)
//         BigDecimal totalExpenses = balance.stream()
//                 .filter(b -> b.accountCode().startsWith("6"))
//                 .map(AccountBalance::totalDebit)
//                 .reduce(BigDecimal.ZERO, BigDecimal::add);

//         BigDecimal netResult = totalRevenue.subtract(totalExpenses);

//         return new IncomeStatement(totalRevenue, totalExpenses, netResult, from, to);
//     }

//     /**
//      * Solde d'un compte comptable.
//      */
//     public record AccountBalance(
//         String accountCode,
//         String accountLabel,
//         BigDecimal totalDebit,
//         BigDecimal totalCredit,
//         BigDecimal balance
//     ) {}

//     /**
//      * Compte de résultat simplifié.
//      */
//     public record IncomeStatement(
//         BigDecimal totalRevenue,
//         BigDecimal totalExpenses,
//         BigDecimal netResult,
//         LocalDate periodStart,
//         LocalDate periodEnd
//     ) {}
// }
