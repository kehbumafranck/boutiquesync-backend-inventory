package com.boutiquesync.service;

import com.boutiquesync.config.SecurityProperties;
import com.boutiquesync.dto.auth.*;
import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.RefreshToken;
import com.boutiquesync.model.User;
import com.boutiquesync.model.enums.TwoFactorMethod;
import com.boutiquesync.model.enums.UserRole;
import com.boutiquesync.repository.RefreshTokenRepository;
import com.boutiquesync.repository.UserRepository;
import com.boutiquesync.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;

/**
 * Service d'authentification.
 * Gère le login, le 2FA, le refresh token et le logout.
 * Implémente le flux stateless JWT avec rotation des tokens.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final SecurityProperties securityProperties;
    private final AuditService auditService;
    private final TotpService totpService;

    /**
     * Enregistre le premier administrateur (utilisable qu'une seule fois).
     * Vérifie qu'aucun administrateur n'existe déjà et que l'email n'est pas déjà utilisé.
     *
     * @param request Requête d'enregistrement admin (email, password, fullName, phone)
     * @param ipAddress Adresse IP du client
     * @return Réponse de connexion avec tokens d'accès (authentification automatique)
     * @throws BusinessException si un admin existe déjà ou email déjà utilisé
     */
    public LoginResponse registerAdmin(RegisterAdminRequest request, String ipAddress) {
        
        // 1. Vérification admin existant
        if (userRepository.existsByActiveAndRole(true, UserRole.ADMIN)) {
            log.warn("Tentative de création d'admin depuis IP: {}", ipAddress);
            throw new BusinessException(
                "Un administrateur existe déjà",
                "ADMIN_ALREADY_EXISTS");
        }

    // 2. Vérification email (la validation password.length est déjà dans le DTO)
    if (userRepository.existsByEmail(request.email())) {
        throw new BusinessException("Cet email est déjà utilisé", "EMAIL_ALREADY_EXISTS");
    }

    // 3. Création de l'admin avec champs firstName/lastName séparés
    User admin = User.builder()
            .email(request.email().toLowerCase().trim())
            .passwordHash(passwordEncoder.encode(request.password()))
            .firstName(request.fullName().split(" ")[0].trim())
            .lastName(request.fullName().substring(request.fullName().indexOf(" ") + 1).trim())
            .phoneNumber(request.phone())
            .role(UserRole.ADMIN)
            .active(true)
            .twoFactorEnabled(false)
            .twoFactorMethod(TwoFactorMethod.DISABLED)
            .failedLoginAttempts(0)
            .lastLoginAt(null)          // ← pas encore connecté
            .lastLoginIp(ipAddress)
            .build();

    // 4. Sauvegarde avec protection contre race condition
    User savedAdmin;
    try {
        savedAdmin = userRepository.save(admin);
    } catch (DataIntegrityViolationException e) {
        throw new BusinessException("Un administrateur existe déjà", "ADMIN_ALREADY_EXISTS");
    }

    log.info("Admin créé avec succès: {} depuis IP: {}", savedAdmin.getEmail(), ipAddress);

    // 5. Audit AVANT la génération des tokens
    auditService.logAction(
        savedAdmin.getId(), savedAdmin.getEmail(),
        "ADMIN_CREATED", "SYSTEM",
        savedAdmin.getId(), ipAddress, null, true);

    // 6. Retour du JWT
    return generateFullLoginResponse(savedAdmin, ipAddress);
}

    /**
     * Authentifie un utilisateur avec email et mot de passe.
     * Si 2FA activé, retourne un token temporaire.
     * Si 2FA désactivé, retourne les tokens d'accès et de rafraîchissement.
     *
     * @param request Requête de connexion (email + password)
     * @param ipAddress Adresse IP du client
     * @return Réponse de connexion avec tokens ou indication 2FA
     */
    public LoginResponse login(LoginRequest request, String ipAddress) {
        // Rechercher l'utilisateur par email
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException("Email ou mot de passe incorrect", "INVALID_CREDENTIALS"));

        // Vérifier si le compte est actif
        if (!user.isActive()) {
            throw new BusinessException("Ce compte est désactivé", "ACCOUNT_DISABLED");
        }

        // Vérifier si le compte est verrouillé
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new BusinessException("Compte verrouillé. Réessayez plus tard.", "ACCOUNT_LOCKED");
        }

        // Vérifier le mot de passe
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            handleFailedLogin(user);
            throw new BusinessException("Email ou mot de passe incorrect", "INVALID_CREDENTIALS");
        }

        // Réinitialiser les tentatives échouées
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        user.setLastLoginIp(ipAddress);
        userRepository.save(user);

        // Vérifier si 2FA est activé
        if (user.isTwoFactorEnabled() && user.getTwoFactorMethod() != TwoFactorMethod.DISABLED) {
            // Générer un token temporaire pour le flux 2FA
            String tempToken = jwtTokenProvider.generateTempToken(user);

            auditService.logAction(user.getId(), user.getEmail(), "LOGIN_2FA_REQUIRED",
                    "USER", user.getId(), ipAddress, null, true);

            return new LoginResponse(null, null, tempToken, true,
                    user.getTwoFactorMethod().name(), null);
        }

        // Générer les tokens d'accès
        return generateFullLoginResponse(user, ipAddress);
    }

    /**
     * Vérifie le code 2FA et retourne les tokens d'accès.
     *
     * @param request Requête de vérification 2FA (tempToken + code)
     * @param ipAddress Adresse IP du client
     * @return Réponse avec tokens d'accès
     */
    public LoginResponse verify2FA(TwoFactorVerifyRequest request, String ipAddress) {
        // Valider le token temporaire
        Claims claims;
        try {
            claims = jwtTokenProvider.validateToken(request.tempToken());
        } catch (Exception e) {
            throw new BusinessException("Token temporaire invalide ou expiré", "INVALID_TEMP_TOKEN");
        }

        if (!"2FA_TEMP".equals(claims.get("type", String.class))) {
            throw new BusinessException("Token invalide pour la vérification 2FA", "INVALID_TOKEN_TYPE");
        }

        String userId = claims.getSubject();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé", "USER_NOT_FOUND"));

        // Vérifier le code selon la méthode 2FA
        boolean codeValid = switch (user.getTwoFactorMethod()) {
            case TOTP -> totpService.verifyCode(user, request.code());
            case EMAIL_OTP -> verifyEmailOtp(user, request.code());
            default -> false;
        };

        if (!codeValid) {
            // Vérifier si c'est un code de secours
            codeValid = verifyBackupCode(user, request.code());
        }

        if (!codeValid) {
            throw new BusinessException("Code 2FA invalide", "INVALID_2FA_CODE");
        }

        auditService.logAction(user.getId(), user.getEmail(), "2FA_VERIFY",
                "USER", user.getId(), ipAddress, null, true);

        return generateFullLoginResponse(user, ipAddress);
    }

    /**
     * Rafraîchit les tokens (rotation du refresh token).
     *
     * @param request Requête contenant le refresh token
     * @return Nouveaux tokens d'accès et de rafraîchissement
     */
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        // Valider le refresh token
        Claims claims;
        try {
            claims = jwtTokenProvider.validateToken(request.refreshToken());
        } catch (Exception e) {
            throw new BusinessException("Refresh token invalide ou expiré", "INVALID_REFRESH_TOKEN");
        }

        String jti = claims.getId();
        String userId = claims.getSubject();

        // Vérifier que le token n'est pas révoqué
        RefreshToken storedToken = refreshTokenRepository.findByJti(jti)
                .orElseThrow(() -> new BusinessException("Refresh token non trouvé", "TOKEN_NOT_FOUND"));

        if (storedToken.getRevokedAt() != null) {
            // Token déjà révoqué → possible vol de token, révoquer tous les tokens de l'utilisateur
            refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId)
                    .forEach(t -> {
                        t.setRevokedAt(LocalDateTime.now());
                        refreshTokenRepository.save(t);
                    });
            throw new BusinessException("Token révoqué. Reconnectez-vous.", "TOKEN_REVOKED");
        }

        // Révoquer l'ancien refresh token (rotation)
        storedToken.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(storedToken);

        // Générer de nouveaux tokens
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé", "USER_NOT_FOUND"));

        return generateFullLoginResponse(user, null);
    }

    /**
     * Déconnecte l'utilisateur en révoquant son refresh token.
     *
     * @param userId ID de l'utilisateur
     */
    public void logout(String userId) {
        // Révoquer tous les refresh tokens actifs de l'utilisateur
        refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId)
                .forEach(token -> {
                    token.setRevokedAt(LocalDateTime.now());
                    refreshTokenRepository.save(token);
                });

        auditService.logAction(userId, null, "LOGOUT", "USER", userId, true);
    }

    /**
     * Change le mot de passe d'un utilisateur.
     *
     * @param userId  ID de l'utilisateur
     * @param request Requête de changement de mot de passe
     */
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé", "USER_NOT_FOUND"));

        // Vérifier le mot de passe actuel
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mot de passe actuel incorrect", "INVALID_CURRENT_PASSWORD");
        }

        // Vérifier que le nouveau mot de passe n'est pas dans l'historique
        for (String oldHash : user.getPasswordHistory()) {
            if (passwordEncoder.matches(request.newPassword(), oldHash)) {
                throw new BusinessException(
                        "Ce mot de passe a déjà été utilisé récemment",
                        "PASSWORD_ALREADY_USED");
            }
        }

        // Mettre à jour le mot de passe
        String newHash = passwordEncoder.encode(request.newPassword());
        user.getPasswordHistory().add(0, user.getPasswordHash());
        if (user.getPasswordHistory().size() > 5) {
            user.getPasswordHistory().remove(user.getPasswordHistory().size() - 1);
        }
        user.setPasswordHash(newHash);
        user.setForcePasswordChange(false);
        userRepository.save(user);

        // Révoquer tous les refresh tokens (forcer la reconnexion)
        logout(userId);

        auditService.logAction(userId, user.getEmail(), "PASSWORD_CHANGE",
                "USER", userId, true);
    }

    // ===== Méthodes privées =====

    /**
     * Génère la réponse complète de connexion avec tokens.
     */
    private LoginResponse generateFullLoginResponse(User user, String ipAddress) {
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        JwtTokenProvider.TokenPair refreshTokenPair = jwtTokenProvider.generateRefreshToken(user);

        // Stocker le refresh token en base
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .jti(refreshTokenPair.jti())
                .userId(user.getId())
                .hashedToken(passwordEncoder.encode(refreshTokenPair.token()))
                .expiresAt(LocalDateTime.now().plusSeconds(securityProperties.getJwt().getRefreshTokenExpiry()))
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        LoginResponse.UserInfo userInfo = new LoginResponse.UserInfo(
                user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getRole().name()
        );

        auditService.logAction(user.getId(), user.getEmail(), "LOGIN",
                "USER", user.getId(), ipAddress, null, true);

        return new LoginResponse(accessToken, refreshTokenPair.token(), null, false, null, userInfo);
    }

    /**
     * Gère une tentative de connexion échouée (incrémente le compteur, verrouille si nécessaire).
     */
    private void handleFailedLogin(User user) {
        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);

        if (user.getFailedLoginAttempts() >= securityProperties.getRateLimit().getLoginMaxAttempts()) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(
                    securityProperties.getRateLimit().getLoginLockMinutes()));
            log.warn("Compte verrouillé pour l'utilisateur: {}", user.getEmail());
        }

        userRepository.save(user);
    }

    /**
     * Vérifie un code OTP envoyé par email.
     */
    private boolean verifyEmailOtp(User user, String code) {
        // TODO: Implémenter la vérification OTP email
        // Vérifier le code hashé stocké en base avec expiration
        return false;
    }

    /**
     * Vérifie un code de secours (backup code).
     */
    private boolean verifyBackupCode(User user, String code) {
        for (int i = 0; i < user.getHashedBackupCodes().size(); i++) {
            if (passwordEncoder.matches(code, user.getHashedBackupCodes().get(i))
                    && !user.getUsedBackupCodes().contains(user.getHashedBackupCodes().get(i))) {
                // Marquer le code comme utilisé
                user.getUsedBackupCodes().add(user.getHashedBackupCodes().get(i));
                userRepository.save(user);
                return true;
            }
        }
        return false;
    }
}
