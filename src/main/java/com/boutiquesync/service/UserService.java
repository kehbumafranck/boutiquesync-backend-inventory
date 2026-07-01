package com.boutiquesync.service;

import com.boutiquesync.dto.user.CreateUserRequest;
import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.User;
import com.boutiquesync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

/**
 * Service de gestion des utilisateurs.
 * CRUD complet avec gestion des rôles et de l'activation/désactivation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    /**
     * Crée un nouvel utilisateur (employé ou admin).
     *
     * @param request   Données de l'utilisateur à créer
     * @param createdBy ID de l'admin créateur
     * @return L'utilisateur créé
     */
    public User createUser(CreateUserRequest request, String createdBy) {
        // Vérifier l'unicité de l'email
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Cet email est déjà utilisé", "EMAIL_ALREADY_EXISTS");
        }

        String passwordHash = passwordEncoder.encode(request.password());

        User user = User.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .passwordHash(passwordHash)
                .role(request.role())
                .phoneNumber(request.phoneNumber())
                .active(true)
                //.twoFactorMethod(TwoFactorMethod.DISABLED)
               // .twoFactorEnabled(false)
                .failedLoginAttempts(0)
                .passwordHistory(new ArrayList<>())
                .hashedBackupCodes(new ArrayList<>())
                .usedBackupCodes(new ArrayList<>())
                .forcePasswordChange(true)
                .createdBy(createdBy)
                .build();

        user = userRepository.save(user);

        auditService.logAction(createdBy, user.getEmail(), "USER_CREATE",
                "USER", user.getId(), user.getFirstName() + " " + user.getLastName(), null, null, true);

        log.info("Utilisateur créé: {} {} ({})", user.getFirstName(), user.getLastName(), user.getRole());
        return user;
    }

    /**
     * Récupère un utilisateur par son ID.
     */
    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé", "USER_NOT_FOUND"));
    }

    /**
     * Récupère un utilisateur par son email.
     */
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé", "USER_NOT_FOUND"));
    }

    /**
     * Liste tous les utilisateurs actifs avec pagination.
     */
    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findByActiveTrue(pageable);
    }

    /**
     * Active un utilisateur.
     */
    public User activateUser(String id, String adminId) {
        User user = getUserById(id);
        user.setActive(true);
        user = userRepository.save(user);

        auditService.logAction(adminId, user.getEmail(), "USER_ACTIVATE",
                "USER", id, true);
        return user;
    }

    /**
     * Désactive un utilisateur (soft delete).
     */
    public User deactivateUser(String id, String adminId) {
        User user = getUserById(id);
        user.setActive(false);
        user = userRepository.save(user);

        auditService.logAction(adminId, user.getEmail(), "USER_DEACTIVATE",
                "USER", id, true);
        return user;
    }

    /**
     * Supprime un utilisateur (soft delete = désactivation).
     */
    public void deleteUser(String id, String adminId) {
        deactivateUser(id, adminId);
        auditService.logAction(adminId,null, "USER_DELETE",
                "USER", id, true);
    }
}
