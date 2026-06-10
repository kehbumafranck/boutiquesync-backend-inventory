package com.boutiquesync.repository;

import com.boutiquesync.model.EmployeeInvitation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeInvitationRepository extends MongoRepository<EmployeeInvitation, String> {

    Optional<EmployeeInvitation> findByToken(String token);

    // findByEmailAndUsedFalse remplace existsByEmailAndUsedFalse
    // On a besoin de l'objet complet pour vérifier l'expiration
    Optional<EmployeeInvitation> findByEmailAndUsedFalse(String email);
}