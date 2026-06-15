package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.auth.*;
import com.boutiquesync.model.User;
import com.boutiquesync.security.JwtTokenProvider;
import com.boutiquesync.security.UserPrincipal;
import com.boutiquesync.service.AuthService;
import com.boutiquesync.service.TotpService;
import com.boutiquesync.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur d'authentification.
 * Les tokens JWT (access + refresh) sont désormais transmis via des
 * cookies HttpOnly, plus dans le corps JSON des réponses.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Endpoints d'authentification et de gestion 2FA")
public class AuthController {

    private final AuthService authService;
    private final TotpService totpService;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Enregistrement du premier administrateur.
     * Pose les cookies access/refresh et retourne les infos utilisateur (sans tokens).
     */
    @PostMapping("/register-admin")
    @Operation(summary = "Enregistrer l'administrateur", description = "Crée le premier compte administrateur. Pose les cookies JWT.")
    public ResponseEntity<ApiResponse<LoginResponse>> registerAdmin(
            @Valid @RequestBody RegisterAdminRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String ipAddress = getIpAddress(httpRequest);
        LoginResponse response = authService.registerAdmin(request, ipAddress);

        setAuthCookies(httpResponse, response);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Admin enregistré avec succès", response.toSafeResponse()));
    }

    /**
     * Connexion avec email et mot de passe.
     * Si le 2FA n'est pas requis, pose les cookies access/refresh.
     * Si le 2FA est requis, la réponse contient seulement le token temporaire
     * (transmis dans le corps, car de très courte durée).
     */
    @PostMapping("/login")
    @Operation(summary = "Connexion utilisateur", description = "Authentifie avec email/mot de passe. Pose les cookies JWT ou demande 2FA.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String ipAddress = getIpAddress(httpRequest);
        LoginResponse response = authService.login(request, ipAddress);

        setAuthCookies(httpResponse, response);

        return ResponseEntity.ok(ApiResponse.success("Connexion réussie", response.toSafeResponse()));
    }

    /**
     * Vérification du code 2FA. Pose les cookies access/refresh une fois validé.
     */
    @PostMapping("/2fa/verify")
    @Operation(summary = "Vérifier code 2FA", description = "Vérifie le code TOTP ou OTP email. Pose les cookies JWT en cas de succès.")
    public ResponseEntity<ApiResponse<LoginResponse>> verify2FA(
            @Valid @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String ipAddress = getIpAddress(httpRequest);
        LoginResponse response = authService.verify2FA(request, ipAddress);

        setAuthCookies(httpResponse, response);

        return ResponseEntity.ok(ApiResponse.success("Vérification 2FA réussie", response.toSafeResponse()));
    }

    /**
     * Rafraîchissement des tokens (rotation).
     * Le refresh token est désormais lu depuis le cookie, plus depuis le body.
     */
    @PostMapping("/refresh")
    @Operation(summary = "Rafraîchir les tokens", description = "Lit le refresh token depuis le cookie et pose de nouveaux cookies (rotation).")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String refreshToken = jwtTokenProvider.getRefreshTokenFromCookies(httpRequest);
        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Refresh token manquant", "MISSING_REFRESH_TOKEN"));
        }

        LoginResponse response = authService.refreshToken(new RefreshTokenRequest(refreshToken));

        setAuthCookies(httpResponse, response);

        return ResponseEntity.ok(ApiResponse.success("Tokens rafraîchis", response.toSafeResponse()));
    }

    /**
     * Déconnexion : révoque les refresh tokens en base et efface les cookies.
     */
    @PostMapping("/logout")
    @Operation(summary = "Déconnexion", description = "Révoque les refresh tokens et efface les cookies JWT.")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletResponse httpResponse) {

        authService.logout(principal.id());
        clearAuthCookies(httpResponse);

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
     * Pose les cookies accessToken et refreshToken à partir d'une LoginResponse.
     * Si la réponse ne contient pas de tokens (ex: flux 2FA en attente),
     * aucun cookie n'est posé.
     */
    private void setAuthCookies(HttpServletResponse response, LoginResponse loginResponse) {
        if (loginResponse.accessToken() != null) {
            response.addHeader(HttpHeaders.SET_COOKIE,
                    jwtTokenProvider.generateAccessTokenCookie(loginResponse.accessToken()).toString());
        }
        if (loginResponse.refreshToken() != null) {
            response.addHeader(HttpHeaders.SET_COOKIE,
                    jwtTokenProvider.generateRefreshTokenCookie(loginResponse.refreshToken()).toString());
        }
    }

    /**
     * Efface les cookies accessToken et refreshToken.
     */
    private void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, jwtTokenProvider.clearAccessTokenCookie().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, jwtTokenProvider.clearRefreshTokenCookie().toString());
    }

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