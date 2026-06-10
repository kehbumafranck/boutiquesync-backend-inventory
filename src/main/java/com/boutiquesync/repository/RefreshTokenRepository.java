package com.boutiquesync.repository;

import com.boutiquesync.model.RefreshToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository MongoDB pour les refresh tokens JWT.
 */
@Repository
public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {

    Optional<RefreshToken> findByJti(String jti);

    List<RefreshToken> findByUserId(String userId);

    void deleteByUserId(String userId);

    /** Trouver les tokens non révoqués d'un utilisateur */
    List<RefreshToken> findByUserIdAndRevokedAtIsNull(String userId);
}
