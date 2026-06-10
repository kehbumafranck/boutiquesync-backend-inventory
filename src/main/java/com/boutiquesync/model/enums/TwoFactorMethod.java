package com.boutiquesync.model.enums;

/**
 * Méthodes d'authentification à deux facteurs supportées.
 * TOTP : Google Authenticator (RFC 6238).
 * EMAIL_OTP : Code à 6 chiffres envoyé par email.
 * DISABLED : 2FA désactivé.
 */
public enum TwoFactorMethod {
    TOTP,
    EMAIL_OTP,
    DISABLED
}
