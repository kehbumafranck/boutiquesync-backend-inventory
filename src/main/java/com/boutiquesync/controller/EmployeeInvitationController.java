package com.boutiquesync.controller;

import com.boutiquesync.dto.user.*;
import com.boutiquesync.security.UserPrincipal;
import com.boutiquesync.service.EmployeeInvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeInvitationController {

    private final EmployeeInvitationService invitationService;

    // ADMIN seulement
    @PostMapping("/invite")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> inviteEmployee(
            @Valid @RequestBody InviteEmployeeRequest request,
            @AuthenticationPrincipal UserPrincipal admin) {

        invitationService.inviteEmployee(request, admin.email());
        return ResponseEntity.accepted().build();
    }

    // Public : le frontend appelle cet endpoint pour valider le token avant d'afficher le formulaire
    @GetMapping("/invite/verify")
    public ResponseEntity<InvitationVerifyResponse> verifyToken(
            @RequestParam String token) {

        return ResponseEntity.ok(invitationService.verifyToken(token));
    }

    // Public : soumission du formulaire par l'employé
    @PostMapping("/invite/complete")
    public ResponseEntity<Void> completeRegistration(
            @Valid @RequestBody CompleteEmployeeRegistrationRequest request) {

        invitationService.completeRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}