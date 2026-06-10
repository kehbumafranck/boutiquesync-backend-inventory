package com.boutiquesync.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.Map;

/**
 * Service de génération de numéros séquentiels.
 * Utilise MongoDB pour garantir l'unicité des numéros (atomique).
 * Génère des numéros au format : PREFIXE-ANNEE-NUMERO (ex: VNT-2024-00001).
 */
@Service
@RequiredArgsConstructor
public class SequenceService {

    private final MongoTemplate mongoTemplate;

    /**
     * Génère un numéro de vente unique.
     * Format : VNT-2024-00001
     */
    public String generateSaleNumber() {
        return generateSequence("sale", "VNT");
    }

    /**
     * Génère un numéro de facture unique.
     * Format : FAC-2024-00001
     */
    public String generateInvoiceNumber() {
        return generateSequence("invoice", "FAC");
    }

    // /**
    //  * Génère un numéro de journal comptable unique.
    //  * Format : JNL-2024-00001
    //  */
    // public String generateJournalNumber() {
    //     return generateSequence("journal", "JNL");
    // }

    /**
     * Génère un numéro séquentiel atomique via MongoDB findAndModify.
     *
     * @param sequenceName Nom de la séquence
     * @param prefix       Préfixe du numéro
     * @return Numéro formaté
     */
    private String generateSequence(String sequenceName, String prefix) {
        int year = Year.now().getValue();
        String key = sequenceName + "_" + year;

        Query query = new Query(Criteria.where("_id").is(key));
        Update update = new Update().inc("value", 1);
        FindAndModifyOptions options = FindAndModifyOptions.options()
                .returnNew(true)
                .upsert(true);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = mongoTemplate.findAndModify(
                query, update, options, Map.class, "sequences");

        long value = result != null ? ((Number) result.get("value")).longValue() : 1;
        return String.format("%s-%d-%05d", prefix, year, value);
    }
}
