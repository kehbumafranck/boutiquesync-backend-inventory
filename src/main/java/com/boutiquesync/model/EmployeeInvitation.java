package com.boutiquesync.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "employee_invitations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeInvitation {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    @Indexed(unique = true)
    private String token;

    private Instant expiresAt;

    @Builder.Default
    private boolean used = false;

    private String invitedBy; // email de l'admin

    private Instant createdAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !used && !isExpired();
    }
}