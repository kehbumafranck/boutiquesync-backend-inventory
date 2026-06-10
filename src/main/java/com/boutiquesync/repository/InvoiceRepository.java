package com.boutiquesync.repository;

import com.boutiquesync.model.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository MongoDB pour la gestion des factures.
 */
@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    Optional<Invoice> findBySaleId(String saleId);

    Page<Invoice> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
