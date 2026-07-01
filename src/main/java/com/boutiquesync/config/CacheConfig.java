package com.boutiquesync.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration du cache en mémoire avec Caffeine.
 * TTL réduit à 60 secondes pour que le dashboard reste proche du temps réel.
 * L'invalidation manuelle via @CacheEvict est déclenchée après chaque vente,
 * annulation et ajustement de stock.
 */
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
            "dashboard",
            "topProducts",
            "categories",
            "stockAlerts"
        );
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(500)
            .expireAfterWrite(60, TimeUnit.SECONDS) // 60s au lieu de 5 min
            .recordStats());
        return cacheManager;
    }
}
