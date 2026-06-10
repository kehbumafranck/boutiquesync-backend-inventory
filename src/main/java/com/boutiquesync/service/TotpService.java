package com.boutiquesync.service;

import com.boutiquesync.config.SecurityProperties;
import com.boutiquesync.exception.BusinessException;
import com.boutiquesync.model.User;
import com.boutiquesync.repository.UserRepository;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * Service de gestion TOTP (Time-based One-Time Password).
 * Compatible avec Google Authenticator (RFC 6238).
 * Gère la génération de secrets, la validation de codes et les codes de secours.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TotpService {

    private final SecurityProperties securityProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String AES_ALGORITHM = "AES";

    /**
     * Génère un nouveau secret TOTP et retourne l'URL du QR code.
     *
     * @param user L'utilisateur pour lequel configurer le TOTP
     * @return Map contenant le secret et l'URL du QR code
     */
    public TotpSetupResponse setupTotp(User user) {
        // Générer un nouveau secret
        DefaultSecretGenerator secretGenerator = new DefaultSecretGenerator();
        String secret = secretGenerator.generate();

        // Chiffrer et stocker temporairement le secret
        String encryptedSecret = encryptSecret(secret);
        user.setEncryptedTotpSecret(encryptedSecret);
        userRepository.save(user);

        // Générer les données du QR code
        QrData qrData = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer(securityProperties.getTotp().getIssuer())
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        // Générer l'image QR en base64
        String qrCodeImage;
        try {
            ZxingPngQrGenerator qrGenerator = new ZxingPngQrGenerator();
            byte[] imageData = qrGenerator.generate(qrData);
            qrCodeImage = "data:image/png;base64," + Base64.getEncoder().encodeToString(imageData);
        } catch (QrGenerationException e) {
            throw new BusinessException("Erreur lors de la génération du QR code", "QR_GENERATION_ERROR");
        }

        return new TotpSetupResponse(secret, qrCodeImage);
    }

    /**
     * Active le 2FA TOTP après vérification du premier code.
     *
     * @param user L'utilisateur
     * @param code Le code TOTP à vérifier
     * @return Liste des codes de secours générés
     */
    public List<String> activateTotp(User user, String code) {
        // Vérifier le code
        if (!verifyCode(user, code)) {
            throw new BusinessException("Code TOTP invalide", "INVALID_TOTP_CODE");
        }

        // Générer les codes de secours
        List<String> backupCodes = generateBackupCodes();
        List<String> hashedCodes = backupCodes.stream()
                .map(passwordEncoder::encode)
                .toList();

        // Activer le 2FA
        user.setTwoFactorEnabled(true);
        user.setTwoFactorMethod(com.boutiquesync.model.enums.TwoFactorMethod.TOTP);
        user.setHashedBackupCodes(new ArrayList<>(hashedCodes));
        user.setUsedBackupCodes(new ArrayList<>());
        userRepository.save(user);

        return backupCodes;
    }

    /**
     * Vérifie un code TOTP pour un utilisateur.
     *
     * @param user L'utilisateur
     * @param code Le code à vérifier (6 chiffres)
     * @return true si le code est valide
     */
    public boolean verifyCode(User user, String code) {
        if (user.getEncryptedTotpSecret() == null) {
            return false;
        }

        String secret = decryptSecret(user.getEncryptedTotpSecret());

        CodeVerifier verifier = new DefaultCodeVerifier(
                new DefaultCodeGenerator(),
                new SystemTimeProvider()
        );

        return verifier.isValidCode(secret, code);
    }

    /**
     * Désactive le 2FA TOTP.
     *
     * @param user     L'utilisateur
     * @param password Mot de passe actuel pour confirmation
     * @param code     Code TOTP actuel pour confirmation
     */
    public void disableTotp(User user, String password, String code) {
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException("Mot de passe incorrect", "INVALID_PASSWORD");
        }

        if (!verifyCode(user, code)) {
            throw new BusinessException("Code TOTP invalide", "INVALID_TOTP_CODE");
        }

        user.setTwoFactorEnabled(false);
        user.setTwoFactorMethod(com.boutiquesync.model.enums.TwoFactorMethod.DISABLED);
        user.setEncryptedTotpSecret(null);
        user.setHashedBackupCodes(new ArrayList<>());
        user.setUsedBackupCodes(new ArrayList<>());
        userRepository.save(user);
    }

    /**
     * Régénère les codes de secours.
     *
     * @param user L'utilisateur
     * @return Nouveaux codes de secours en clair
     */
    public List<String> regenerateBackupCodes(User user) {
        List<String> backupCodes = generateBackupCodes();
        List<String> hashedCodes = backupCodes.stream()
                .map(passwordEncoder::encode)
                .toList();

        user.setHashedBackupCodes(new ArrayList<>(hashedCodes));
        user.setUsedBackupCodes(new ArrayList<>());
        userRepository.save(user);

        return backupCodes;
    }

    // ===== Méthodes privées =====

    /**
     * Génère 8 codes de secours alphanumériques de 10 caractères.
     */
    private List<String> generateBackupCodes() {
        SecureRandom random = new SecureRandom();
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        List<String> codes = new ArrayList<>();

        for (int i = 0; i < 8; i++) {
            StringBuilder code = new StringBuilder();
            for (int j = 0; j < 10; j++) {
                code.append(chars.charAt(random.nextInt(chars.length())));
            }
            codes.add(code.toString());
        }

        return codes;
    }

    /**
     * Chiffre un secret TOTP avec AES-256.
     */
    private String encryptSecret(String secret) {
        try {
            String key = securityProperties.getTotp().getEncryptionKey();
            SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(), AES_ALGORITHM);
            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec);
            byte[] encrypted = cipher.doFinal(secret.getBytes());
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new BusinessException("Erreur de chiffrement", "ENCRYPTION_ERROR");
        }
    }

    /**
     * Déchiffre un secret TOTP.
     */
    private String decryptSecret(String encryptedSecret) {
        try {
            String key = securityProperties.getTotp().getEncryptionKey();
            SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(), AES_ALGORITHM);
            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec);
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedSecret));
            return new String(decrypted);
        } catch (Exception e) {
            throw new BusinessException("Erreur de déchiffrement", "DECRYPTION_ERROR");
        }
    }

    /**
     * Réponse de configuration TOTP.
     */
    public record TotpSetupResponse(String secret, String qrCodeImage) {}
}
