package com.boutiquesync.controller;

import com.boutiquesync.dto.ApiResponse;
import com.boutiquesync.dto.PageResponse;
import com.boutiquesync.dto.user.CreateUserRequest;
import com.boutiquesync.dto.user.UserResponse;
import com.boutiquesync.model.Sale;
import com.boutiquesync.model.User;
import com.boutiquesync.security.UserPrincipal;
import com.boutiquesync.service.SaleService;
import com.boutiquesync.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur de gestion des utilisateurs.
 * CRUD complet réservé aux administrateurs (sauf lecture de son propre profil).
 * Toutes les réponses utilisent UserResponse pour ne jamais exposer les champs sensibles
 * (passwordHash, pin, secrets TOTP, historique de mots de passe, etc.).
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des utilisateurs (ADMIN)")
public class UserController {

    private final UserService userService;
    private final SaleService saleService;

    /**
     * Liste tous les utilisateurs actifs (ADMIN uniquement).
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lister les utilisateurs", description = "Retourne la liste paginée des utilisateurs actifs.")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> getAllUsers(Pageable pageable) {
        Page<UserResponse> users = userService.getAllUsers(pageable).map(UserResponse::from);
        return ResponseEntity.ok(ApiResponse.success("Utilisateurs récupérés", PageResponse.from(users)));
    }

    /**
     * Crée un nouvel utilisateur (ADMIN uniquement).
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un utilisateur", description = "Crée un nouvel employé ou admin.")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userService.createUser(request, principal.id());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Utilisateur créé avec succès", UserResponse.from(user)));
    }

    /**
     * Récupère un utilisateur par son ID (ADMIN ou soi-même).
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Récupérer un utilisateur", description = "Retourne les détails d'un utilisateur.")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable String id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("Utilisateur récupéré", UserResponse.from(user)));
    }

    /**
     * Récupère le profil de l'utilisateur connecté.
     */
    @GetMapping("/me")
    @Operation(summary = "Mon profil", description = "Retourne le profil de l'utilisateur connecté.")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        User user = userService.getUserById(principal.id());
        return ResponseEntity.ok(ApiResponse.success("Profil récupéré", UserResponse.from(user)));
    }

    /**
     * Supprime un utilisateur (soft delete, ADMIN uniquement).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un utilisateur", description = "Désactive un utilisateur (soft delete).")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        userService.deleteUser(id, principal.id());
        return ResponseEntity.ok(ApiResponse.success("Utilisateur supprimé"));
    }

    /**
     * Active un utilisateur (ADMIN uniquement).
     */
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activer un utilisateur", description = "Réactive un utilisateur désactivé.")
    public ResponseEntity<ApiResponse<UserResponse>> activateUser(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userService.activateUser(id, principal.id());
        return ResponseEntity.ok(ApiResponse.success("Utilisateur activé", UserResponse.from(user)));
    }

    /**
     * Désactive un utilisateur (ADMIN uniquement).
     */
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Désactiver un utilisateur", description = "Désactive un utilisateur.")
    public ResponseEntity<ApiResponse<UserResponse>> deactivateUser(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userService.deactivateUser(id, principal.id());
        return ResponseEntity.ok(ApiResponse.success("Utilisateur désactivé", UserResponse.from(user)));
    }

    /**
     * Récupère l'historique des ventes d'un utilisateur (ADMIN ou soi-même).
     */
    @GetMapping("/{id}/sales")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Ventes d'un utilisateur", description = "Retourne l'historique des ventes d'un employé.")
    public ResponseEntity<ApiResponse<PageResponse<Sale>>> getUserSales(
            @PathVariable String id, Pageable pageable) {

        Page<Sale> sales = saleService.getSalesByEmployee(id, pageable);
        return ResponseEntity.ok(ApiResponse.success("Ventes récupérées", PageResponse.from(sales)));
    }
}
