package com.boutiquesync.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// Requête de l'admin
public record InviteEmployeeRequest(
    @NotBlank @Email String email
) {}

