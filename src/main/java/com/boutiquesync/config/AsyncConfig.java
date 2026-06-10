package com.boutiquesync.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync  // Active les méthodes @Async dans tout le projet
public class AsyncConfig {
    
}