// package com.boutiquesync.controller;

// import com.boutiquesync.dto.ApiResponse;
// import com.boutiquesync.dto.PageResponse;
// import com.boutiquesync.model.AccountingLine;
// import com.boutiquesync.model.JournalEntry;
// import com.boutiquesync.service.AccountingService;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import lombok.RequiredArgsConstructor;
// import org.springframework.data.domain.Page;
// import org.springframework.data.domain.Pageable;
// import org.springframework.format.annotation.DateTimeFormat;
// import org.springframework.http.ResponseEntity;
// import org.springframework.security.access.prepost.PreAuthorize;
// import org.springframework.web.bind.annotation.*;

// import java.time.LocalDate;
// import java.util.List;
// import java.util.Map;

// /**
//  * Contrôleur de comptabilité OHADA.
//  * Journal, grand-livre, balance et compte de résultat.
//  * Réservé aux administrateurs.
//  */
// @RestController
// @RequestMapping("/api/accounting")
// @RequiredArgsConstructor
// @PreAuthorize("hasRole('ADMIN')")
// @Tag(name = "Comptabilité", description = "Comptabilité OHADA SYSCOHADA (ADMIN)")
// public class AccountingController {

//     private final AccountingService accountingService;

//     /**
//      * Récupère le journal comptable avec pagination et filtrage par dates.
//      */
//     @GetMapping("/journal")
//     @Operation(summary = "Journal comptable", description = "Retourne les écritures comptables avec filtrage par période.")
//     public ResponseEntity<ApiResponse<PageResponse<JournalEntry>>> getJournal(
//             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
//             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
//             Pageable pageable) {

//         Page<JournalEntry> entries = accountingService.getJournal(from, to, pageable);
//         return ResponseEntity.ok(ApiResponse.success("Journal comptable", PageResponse.from(entries)));
//     }

//     /**
//      * Récupère le grand-livre (regroupement par compte).
//      */
//     @GetMapping("/ledger")
//     @Operation(summary = "Grand-livre", description = "Retourne le grand-livre par compte comptable.")
//     public ResponseEntity<ApiResponse<Map<String, List<AccountingLine>>>> getLedger(
//             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
//             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

//         Map<String, List<AccountingLine>> ledger = accountingService.getLedger(from, to);
//         return ResponseEntity.ok(ApiResponse.success("Grand-livre", ledger));
//     }

//     /**
//      * Récupère la balance comptable.
//      */
//     @GetMapping("/balance")
//     @Operation(summary = "Balance comptable", description = "Retourne la balance des comptes sur une période.")
//     public ResponseEntity<ApiResponse<List<AccountingService.AccountBalance>>> getBalance(
//             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
//             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

//         List<AccountingService.AccountBalance> balance = accountingService.getBalance(from, to);
//         return ResponseEntity.ok(ApiResponse.success("Balance comptable", balance));
//     }

//     /**
//      * Récupère le compte de résultat.
//      */
//     @GetMapping("/income-statement")
//     @Operation(summary = "Compte de résultat", description = "Retourne le compte de résultat sur une période.")
//     public ResponseEntity<ApiResponse<AccountingService.IncomeStatement>> getIncomeStatement(
//             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
//             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

//         AccountingService.IncomeStatement statement = accountingService.getIncomeStatement(from, to);
//         return ResponseEntity.ok(ApiResponse.success("Compte de résultat", statement));
//     }
// }
