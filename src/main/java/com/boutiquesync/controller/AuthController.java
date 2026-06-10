package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.auth.*;
import com.boutiquesync.model.User;
import com.boutiquesync.security.UserPrincipal;
import com.boutiquesync.service.AuthService;
import com.boutiquesync.service.TotpService;
import com.boutiquesync.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur d'authentification.
 * Gère le login, le 2FA, le refresh token, le logout et la gestion des mots de passe.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Endpoints d'authentification et de gestion 2FA")
public class AuthController {

    private final AuthService authService;
    private final TotpService totpService;
    private final UserService userService;

    /**
     * Enregistrement du premier administrateur.
     * Endpoint public - utilisable une seule fois au démarrage de l'application.
     * Retourne les tokens JWT directement (authentification automatique).
     */
    @PostMapping("/register-admin")
    @Operation(summary = "Enregistrer l'administrateur", description = "Crée le premier compte administrateur (utilisable qu'une seule fois). Retourne JWT directement.")
    public ResponseEntity<ApiResponse<LoginResponse>> registerAdmin(
            @Valid @RequestBody RegisterAdminRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getIpAddress(httpRequest);
        LoginResponse response = authService.registerAdmin(request, ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Admin enregistré avec succès", response));
    }

    /**
     * Connexion avec email et mot de passe.
     * Retourne les tokens JWT ou un token temporaire si 2FA activé.
     */
    @PostMapping("/login")
    @Operation(summary = "Connexion utilisateur", description = "Authentifie avec email/mot de passe. Retourne JWT ou demande 2FA.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getIpAddress(httpRequest);
        LoginResponse response = authService.login(request, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Connexion réussie", response));
    }

    /**
     * Vérification du code 2FA.
     * Complète le flux d'authentification après le login initial.
     */
    @PostMapping("/2fa/verify")
    @Operation(summary = "Vérifier code 2FA", description = "Vérifie le code TOTP ou OTP email pour compléter l'authentification.")
    public ResponseEntity<ApiResponse<LoginResponse>> verify2FA(
            @Valid @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getIpAddress(httpRequest);
        LoginResponse response = authService.verify2FA(request, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Vérification 2FA réussie", response));
    }

    /**
     * Rafraîchissement des tokens (rotation).
     */
    @PostMapping("/refresh")
    @Operation(summary = "Rafraîchir les tokens", description = "Échange un refresh token contre de nouveaux tokens (rotation).")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        LoginResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Tokens rafraîchis", response));
    }

    /**
     * Déconnexion (révocation du refresh token).
     */
    @PostMapping("/logout")
    @Operation(summary = "Déconnexion", description = "Révoque tous les refresh tokens de l'utilisateur.")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(principal.id());
        return ResponseEntity.ok(ApiResponse.success("Déconnexion réussie"));
    }

    /**
     * Changement de mot de passe.
     */
    @PostMapping("/password/change")
    @Operation(summary = "Changer le mot de passe", description = "Change le mot de passe (nécessite le mot de passe actuel).")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {

        authService.changePassword(principal.id(), request);
        return ResponseEntity.ok(ApiResponse.success("Mot de passe changé avec succès"));
    }

    /**
     * Configuration TOTP : génère le secret et le QR code.
     */
    @PostMapping("/2fa/totp/setup")
    @Operation(summary = "Configurer TOTP", description = "Génère un secret TOTP et retourne le QR code pour Google Authenticator.")
    public ResponseEntity<ApiResponse<TotpService.TotpSetupResponse>> setupTotp(
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userService.getUserById(principal.id());
        TotpService.TotpSetupResponse response = totpService.setupTotp(user);
        return ResponseEntity.ok(ApiResponse.success("Configuration TOTP générée", response));
    }

    /**
     * Activation TOTP : vérifie le premier code et active le 2FA.
     */
    @PostMapping("/2fa/totp/activate")
    @Operation(summary = "Activer TOTP", description = "Vérifie le premier code TOTP et active le 2FA. Retourne les codes de secours.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> activateTotp(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {

        User user = userService.getUserById(principal.id());
        String code = body.get("code");
        List<String> backupCodes = totpService.activateTotp(user, code);

        return ResponseEntity.ok(ApiResponse.success("2FA TOTP activé",
                Map.of("backupCodes", backupCodes,
                       "message", "Conservez ces codes de secours en lieu sûr")));
    }

    /**
     * Désactivation TOTP.
     */
    @PostMapping("/2fa/totp/disable")
    @Operation(summary = "Désactiver TOTP", description = "Désactive le 2FA TOTP (nécessite mot de passe + code TOTP).")
    public ResponseEntity<ApiResponse<Void>> disableTotp(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {

        User user = userService.getUserById(principal.id());
        totpService.disableTotp(user, body.get("password"), body.get("code"));
        return ResponseEntity.ok(ApiResponse.success("2FA TOTP désactivé"));
    }

    /**
     * Régénération des codes de secours.
     */
    @PostMapping("/2fa/backup/regenerate")
    @Operation(summary = "Régénérer codes de secours", description = "Génère de nouveaux codes de secours (invalide les anciens).")
    public ResponseEntity<ApiResponse<List<String>>> regenerateBackupCodes(
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userService.getUserById(principal.id());
        List<String> codes = totpService.regenerateBackupCodes(user);
        return ResponseEntity.ok(ApiResponse.success("Codes de secours régénérés", codes));
    }

    // ===== Utilitaires =====

    /**
     * Extrait l'adresse IP du client depuis la requête HTTP.
     */
    private String getIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
