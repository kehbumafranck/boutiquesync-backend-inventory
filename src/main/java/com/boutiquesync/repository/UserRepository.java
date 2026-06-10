package com.boutiquesync.repository;

import com.boutiquesync.model.User;
import com.boutiquesync.model.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository MongoDB pour la gestion des utilisateurs.
 */
@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findByActiveTrue(Pageable pageable);

    Page<User> findByActiveAndRole(boolean active, UserRole role, Pageable pageable);

    /**
     * Vérifie s'il existe un administrateur actif.
     * Utilisé pour vérifier qu'aucun admin n'existe avant la création initiale.
     *
     * @param active true pour actif
     * @param role   rôle ADMIN
     * @return true si un admin actif existe
     */
    boolean existsByActiveAndRole(boolean active, UserRole role);


}
