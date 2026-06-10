package com.boutiquesync.dto.user;

// Réponse renvoyée au frontend lors de la vérification du token
public record InvitationVerifyResponse(
    String email,
    boolean valid,
    String message
) {}