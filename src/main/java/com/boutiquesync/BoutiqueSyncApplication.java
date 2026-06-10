package com.boutiquesync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Point d'entrée principal de l'application BoutiqueSync.
 * Système de gestion de boutique avec comptabilité OHADA SYSCOHADA.
 */
@SpringBootApplication
@EnableCaching
@EnableScheduling
public class BoutiqueSyncApplication {

    public static void main(String[] args) {
        SpringApplication.run(BoutiqueSyncApplication.class, args);
    }
}
