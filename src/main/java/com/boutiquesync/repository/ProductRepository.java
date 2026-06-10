package com.boutiquesync.repository;

import com.boutiquesync.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository MongoDB pour la gestion des produits.
 */
@Repository
public interface ProductRepository extends MongoRepository<Product, String> {

    Optional<Product> findByBarcode(String barcode);

    Page<Product> findByActiveTrue(Pageable pageable);

    //Page<Product> findByCategoryIdAndActiveTrue(String categoryId, Pageable pageable);

    /** Produits dont le stock est inférieur ou égal au seuil d'alerte */
    @Query("{ 'active': true, '$expr': { '$lte': ['$currentStock', '$alertThreshold'] } }")
    List<Product> findLowStockProducts();

    /** Liste des catégories distinctes */
    @Query(value = "{ 'active': true }", fields = "{ 'categoryId': 1 }")
    List<Product> findDistinctCategories();

    List<Product> findByIdIn(List<String> ids);
}
