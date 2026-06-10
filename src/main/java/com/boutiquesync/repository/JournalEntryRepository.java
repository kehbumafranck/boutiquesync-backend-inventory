// package com.boutiquesync.repository;

// import com.boutiquesync.model.JournalEntry;
// import org.springframework.data.domain.Page;
// import org.springframework.data.domain.Pageable;
// import org.springframework.data.mongodb.repository.MongoRepository;
// import org.springframework.stereotype.Repository;

// import java.time.LocalDate;
// import java.util.List;
// import java.util.Optional;

// /**
//  * Repository MongoDB pour les écritures comptables OHADA.
//  */
// @Repository
// public interface JournalEntryRepository extends MongoRepository<JournalEntry, String> {

//     Optional<JournalEntry> findByReferenceId(String referenceId);

//     Page<JournalEntry> findByEntryDateBetween(LocalDate from, LocalDate to, Pageable pageable);

//     List<JournalEntry> findByEntryDateBetween(LocalDate from, LocalDate to);

//     Page<JournalEntry> findAllByOrderByEntryDateDesc(Pageable pageable);
// }
