package com.boutiquesync.service;

import com.boutiquesync.dto.user.*;
import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.EmployeeInvitation;
import com.boutiquesync.model.User;
import com.boutiquesync.model.enums.UserRole;
import com.boutiquesync.repository.EmployeeInvitationRepository;
import com.boutiquesync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeInvitationService {

    private final EmployeeInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final MailService mailService;
    private final AuditService auditService;

   @Value("${boutiquesync.invitation.token-expiry-hours:24}")
   private int tokenExpiryHours;

    @Value("${boutiquesync.frontend.base-url}")
    private String frontendBaseUrl;
    // -------------------------------------------------------
    // ÉTAPE 1 — Admin envoie une invitation
    // -------------------------------------------------------
    public void inviteEmployee(InviteEmployeeRequest request, String adminEmail) {

    // Utilisateur déjà enregistré (invitation déjà complétée)
    if (userRepository.existsByEmail(request.email())) {
        throw new BusinessException(
            "Cet email est déjà associé à un compte actif",
            "EMAIL_ALREADY_EXISTS"
        );
    }

    // Vérifier s'il existe une invitation pour cet email
    Optional<EmployeeInvitation> existingInvitation =
            invitationRepository.findByEmailAndUsedFalse(request.email());

    if (existingInvitation.isPresent()) {
        EmployeeInvitation existing = existingInvitation.get();

        if (!existing.isExpired()) {
            // Invitation active non expirée → bloquer
            throw new BusinessException(
                "Une invitation est déjà en attente pour cet email",
                "INVITATION_ALREADY_PENDING"
            );
        }

        // Invitation expirée → la supprimer et en créer une nouvelle
        invitationRepository.delete(existing);
        log.info("Ancienne invitation expirée supprimée pour {}", request.email());
    }

    // Créer la nouvelle invitation
    String token = generateSecureToken();

    EmployeeInvitation invitation = EmployeeInvitation.builder()
            .email(request.email())
            .token(token)
            .expiresAt(Instant.now().plus(tokenExpiryHours, ChronoUnit.HOURS))
            .used(false)
            .invitedBy(adminEmail)
            .createdAt(Instant.now())
            .build();

    invitationRepository.save(invitation);

    String link = frontendBaseUrl + "/complete-registration?token=" + token;
    mailService.sendInvitationEmail(request.email(), link, tokenExpiryHours);

    auditService.logAction(adminEmail, request.email(), "EMPLOYEE_INVITED",
            "INVITATION", invitation.getId(), true);

    log.info("Invitation envoyée à {} par {}", request.email(), adminEmail);
}

    // -------------------------------------------------------
    // ÉTAPE 2 — Employé vérifie le token (chargement du formulaire)
    // -------------------------------------------------------
    public InvitationVerifyResponse verifyToken(String token) {

        EmployeeInvitation invitation = findValidInvitation(token);

        return new InvitationVerifyResponse(
            invitation.getEmail(),
            true,
            "Lien valide"
        );
    }

    // -------------------------------------------------------
    // ÉTAPE 3 — Employé soumet le formulaire complété
    // -------------------------------------------------------
    public User completeRegistration(CompleteEmployeeRegistrationRequest request) {

        EmployeeInvitation invitation = findValidInvitation(request.token());

        // L'email vient de l'invitation, pas du formulaire (sécurité)
        CreateUserRequest createUserRequest = new CreateUserRequest(
                request.firstName(),
                request.lastName(),
                invitation.getEmail(),
                request.password(),
                UserRole.EMPLOYEE,        // rôle fixé : seul l'admin peut être ADMIN
                request.phoneNumber()
        );

        User newUser = userService.createUser(createUserRequest, invitation.getInvitedBy());

        // Invalider le token immédiatement après usage
        invitation.setUsed(true);
        invitationRepository.save(invitation);

        log.info("Employé {} enregistré via invitation de {}", newUser.getEmail(), invitation.getInvitedBy());
        return newUser;
    }

    // -------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------

    /**
     * Factorise la vérification du token utilisée aux étapes 2 et 3.
     * Lève une BusinessException précise selon le cas.
     */
    private EmployeeInvitation findValidInvitation(String token) {
        EmployeeInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException(
                    "Lien d'invitation invalide",
                    "INVITATION_NOT_FOUND"
                ));

        if (invitation.isUsed()) {
            throw new BusinessException(
                "Ce lien d'invitation a déjà été utilisé",
                "INVITATION_ALREADY_USED"
            );
        }

        if (invitation.isExpired()) {
            throw new BusinessException(
                "Ce lien d'invitation a expiré",
                "INVITATION_EXPIRED"
            );
        }

        return invitation;
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}