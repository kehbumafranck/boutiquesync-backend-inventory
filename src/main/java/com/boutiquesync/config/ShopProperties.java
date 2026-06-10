package com.boutiquesync.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

/**
 * Propriétés de configuration de la boutique.
 * Utilisées pour les factures, rapports et documents officiels.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "boutiquesync.shop")
public class ShopProperties {

    /** Nom de la boutique */
    private String name = "Ma Boutique";

    /** Adresse physique */
    private String address;

    /** Numéro de téléphone */
    private String phone;

    /** Email de contact */
    private String email;

    /** Numéro d'identification fiscale */
    private String vatNumber;

    /** Devise utilisée (XAF = Franc CFA) */
    private String currency = "XAF";

    /** Taux de TVA par défaut (19.25% au Cameroun) */
    private BigDecimal defaultVatRate = new BigDecimal("19.25");
}
