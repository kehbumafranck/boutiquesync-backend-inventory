# 🐛 BoutiqueSync — Résolution des Bugs & Corrections

**Date** : 9 juin 2026  
**Version** : 1.0.0-SNAPSHOT  

---

## Résumé

| # | Sévérité | Fichier | Problème | Statut |
|---|----------|---------|----------|--------|
| 1 | 🔴 CRITIQUE | `.env` | JWT_SECRET invalide (pas du base64) | ✅ Corrigé |
| 2 | 🔴 CRITIQUE | `application.yml` | Propriétés `boutiquesync.mail.*` absentes en profil dev | ✅ Corrigé |
| 3 | 🔴 CRITIQUE | `InvoiceService.java` | Appel à `whatsAppSender` non commenté (bean inexistant) | ✅ Corrigé |
| 4 | 🔴 CRITIQUE | `SaleService.java` | `subtotal` et `totalVat` commentés dans le builder Sale | ✅ Corrigé |
| 5 | 🟠 HAUTE | `.env` / `application.yml` | Secrets et mots de passe en clair dans le code source | ✅ Corrigé |
| 6 | 🟠 HAUTE | `SecurityConfig.java` | Endpoints invitation non déclarés en `permitAll()` | ✅ Corrigé |
| 7 | 🟠 HAUTE | `JwtTokenProvider.java` | `SignatureAlgorithm.HS256` deprecated dans jjwt 0.12+ | ✅ Corrigé |
| 8 | 🟡 MOYENNE | `pom.xml` | Doublon `spring-boot-starter-mail` | ✅ Corrigé |
| 9 | 🟡 MOYENNE | `JwtTokenProvider.java` | Aucune validation du secret au démarrage | ✅ Corrigé |
| 10 | 🟡 MOYENNE | Système OHADA | Code OHADA partiellement commenté, incohérent | ✅ Commenté entièrement |
| 11 | 🟢 BASSE | Divers services | Imports inutilisés (warnings compilation) | ✅ Nettoyé |
| 12 | 🟢 BASSE | `src/gitignore` | Fichier vide et mal placé | ✅ Supprimé |
| 13 | 🟢 BASSE | Racine projet | Pas de `.gitignore` → secrets commités | ✅ Créé |

---

## Détail des corrections

---

### Bug #1 — JWT_SECRET invalide (base64)

**Symptôme** :
```
Caused by: java.lang.IllegalArgumentException: Illegal base64 character 5f
    at com.boutiquesync.security.JwtTokenProvider.init(JwtTokenProvider.java:33)
```

**Cause** :  
Le `.env` contenait un placeholder texte `CHANGE_ME_IN_PRODUCTION_USE_A_SECURE_256_BIT_KEY_BASE64` qui contient des underscores (`_` = 0x5f), caractère illégal en base64 standard.

**Correction** :  
Génération d'une vraie clé base64 256 bits :
```bash
openssl rand -base64 32
```

**Fichier** : `.env`
```diff
- JWT_SECRET=CHANGE_ME_IN_PRODUCTION_USE_A_SECURE_256_BIT_KEY_BASE64
+ JWT_SECRET=3kQUs5gKe/FN1kC+fZCtMMGEJK5JZ2OYMHjGJGZgfzQ=
```

---

### Bug #2 — Propriété `boutiquesync.mail.from` introuvable

**Symptôme** :
```
Could not resolve placeholder 'boutiquesync.mail.from' in value "${boutiquesync.mail.from}"
```

**Cause** :  
Les propriétés `boutiquesync.mail`, `boutiquesync.invitation` et `boutiquesync.frontend` étaient placées dans le bloc YAML du **profil prod** (après le second `---`). Quand le profil actif est `dev`, Spring ne lit pas ce bloc.

**Correction** :  
Déplacement de ces propriétés dans la **section commune** (avant le premier `---`) pour qu'elles soient disponibles quel que soit le profil.

**Fichier** : `src/main/resources/application.yml`
```diff
  # Section commune (avant ---)
  boutiquesync:
    security: ...
    shop: ...
+   mail:
+     from: ${MAIL_USERNAME:}
+     from-name: ${MAIL_FROM_NAME:BoutiqueSync}
+   invitation:
+     token-expiry-hours: ${INVITATION_EXPIRY_HOURS:24}
+   frontend:
+     base-url: ${FRONTEND_BASE_URL:http://localhost:3000}
    scheduler: ...
```

---

### Bug #3 — InvoiceService appelle un bean commenté

**Symptôme** :  
Erreur de compilation — `whatsAppSender` n'existe pas (le champ et le service sont commentés).

**Cause** :  
Le `WhatsAppSender` est entièrement commenté mais `InvoiceService.generateInvoice()` contenait encore un appel actif à `whatsAppSender.sendInvoice(invoice)`.

**Correction** :  
Mise en commentaire du bloc d'envoi WhatsApp dans `InvoiceService`.

**Fichier** : `src/main/java/com/boutiquesync/service/InvoiceService.java`
```diff
-       // Envoyer par WhatsApp si numéro disponible
-       if (sale.getCustomerPhone() != null && !sale.getCustomerPhone().isBlank()) {
-           try {
-               whatsAppSender.sendInvoice(invoice);
-               ...
+       // TODO: WhatsApp désactivé pour le moment
+       // if (sale.getCustomerPhone() != null && !sale.getCustomerPhone().isBlank()) {
+       //     try {
+       //         whatsAppSender.sendInvoice(invoice);
+       //         ...
```

---

### Bug #4 — Données financières perdues dans Sale

**Symptôme** :  
Les ventes créées avaient `subtotal = null` et `totalVat = null` en base MongoDB.

**Cause** :  
Dans `SaleService.createSale()`, les lignes `.subtotal(subtotal)` et `.totalVat(totalVat)` étaient commentées dans le builder.

**Correction** :  
Décommentage des deux lignes.

**Fichier** : `src/main/java/com/boutiquesync/service/SaleService.java`
```diff
  Sale sale = Sale.builder()
      .saleNumber(saleNumber)
      ...
-     //.subtotal(subtotal)
-     //.totalVat(totalVat)
+     .subtotal(subtotal)
+     .totalVat(totalVat)
      .totalAmount(totalAmount)
      ...
```

---

### Bug #5 — Secrets exposés dans le code source

**Symptôme** :  
Le fichier `.env` commité contenait de vrais credentials (Gmail app password, JWT secret, TOTP key).

**Risque** : Compromission complète du système si le repo est partagé.

**Correction** :
1. Remplacement des valeurs réelles par des clés générées pour le dev uniquement
2. Suppression des emails personnels des fallbacks dans `application.yml`
3. Création d'un `.gitignore` excluant `.env`
4. Création d'un `.env.example` documentant les variables attendues

**Fichiers** : `.env`, `application.yml`, `.gitignore` (nouveau), `.env.example` (nouveau)

---

### Bug #6 — Endpoints invitation bloqués par Spring Security

**Symptôme** :  
HTTP 401 sur `GET /api/employees/invite/verify` et `POST /api/employees/invite/complete` (endpoints publics).

**Cause** :  
Ces endpoints n'étaient pas listés dans le `permitAll()` de `SecurityConfig` ni dans le `shouldNotFilter` du `JwtAuthenticationFilter`.

**Correction** :  
Ajout des deux routes dans les deux fichiers.

**Fichier** : `src/main/java/com/boutiquesync/config/SecurityConfig.java`
```diff
  .requestMatchers(
      "/api/auth/login",
      ...
+     "/api/employees/invite/verify",
+     "/api/employees/invite/complete",
      "/ws/**",
      ...
  ).permitAll()
```

**Fichier** : `src/main/java/com/boutiquesync/security/JwtAuthenticationFilter.java`
```diff
  private static final List<String> PUBLIC_PATHS = List.of(
      "/api/auth/login",
      ...
+     "/api/employees/invite/verify",
+     "/api/employees/invite/complete",
      "/swagger-ui",
      ...
  );
```

---

### Bug #7 — SignatureAlgorithm deprecated

**Symptôme** :  
Warning de compilation + risque de rupture dans futures versions de jjwt.

**Cause** :  
Dans jjwt 0.12+, `signWith(key, SignatureAlgorithm.HS256)` est deprecated. L'algorithme est inféré automatiquement depuis le type et la taille de la clé.

**Correction** :  
Remplacement par `signWith(secretKey)` (sans spécifier l'algorithme).

**Fichier** : `src/main/java/com/boutiquesync/security/JwtTokenProvider.java`
```diff
- .signWith(secretKey, SignatureAlgorithm.HS256)
+ .signWith(secretKey)
```

---

### Bug #8 — Doublon de dépendance Maven

**Symptôme** :  
Warning Maven "duplicate dependency" pour `spring-boot-starter-mail`.

**Correction** :  
Suppression de la deuxième déclaration.

**Fichier** : `pom.xml`

---

### Bug #9 — Pas de validation du JWT_SECRET au démarrage

**Symptôme** :  
Stack trace cryptique si le secret est vide, trop court, ou pas du base64.

**Correction** :  
Ajout de validations explicites dans `@PostConstruct` avec messages clairs.

**Fichier** : `src/main/java/com/boutiquesync/security/JwtTokenProvider.java`
```java
@PostConstruct
public void init() {
    String secret = securityProperties.getJwt().getSecret();
    if (secret == null || secret.isBlank()) {
        throw new IllegalStateException(
            "JWT_SECRET non configuré. Générez avec: openssl rand -base64 32");
    }
    try {
        byte[] decodedKey = Base64.getDecoder().decode(secret);
        if (decodedKey.length < 32) {
            throw new IllegalStateException(
                "JWT_SECRET trop court. Minimum: 256 bits.");
        }
        this.secretKey = Keys.hmacShaKeyFor(decodedKey);
    } catch (IllegalArgumentException e) {
        throw new IllegalStateException(
            "JWT_SECRET invalide (pas du base64). Générez avec: openssl rand -base64 32", e);
    }
}
```

---

### Bug #10 — Système OHADA incohérent

**Symptôme** :  
Certains fichiers OHADA étaient commentés, d'autres non → incohérence, imports cassés potentiels.

**Correction** :  
Commentaire complet et uniforme de tout le système OHADA :
- `OhadaAccountCode.java` — enum commenté
- `AccountingLine.java` — record commenté
- `JournalEntry.java` — déjà commenté ✓
- `AccountingService.java` — déjà commenté ✓
- `AccountingController.java` — déjà commenté ✓
- `JournalEntryRepository.java` — déjà commenté ✓

---

### Bug #11 — Imports inutilisés

**Fichiers corrigés** :
- `UserService.java` — suppression import `TwoFactorMethod`
- `DashboardService.java` — suppression import `Comparator`
- `DashboardController.java` — suppression import `LocalTime`
- `JwtTokenProvider.java` — suppression import `StandardCharsets`

---

### Bug #12 & #13 — Gitignore

- Suppression de `src/gitignore` (fichier vide, mal placé)
- Création de `.gitignore` à la racine avec exclusions appropriées
- Création de `.env.example` pour documenter la configuration

---

## Comment vérifier que tout fonctionne

```bash
# 1. Compiler (doit passer sans erreur)
mvn clean compile

# 2. Vérifier le .env (doit contenir des vraies clés base64)
cat .env | grep JWT_SECRET

# 3. Lancer l'application
mvn spring-boot:run

# 4. Vérifier le démarrage (chercher cette ligne dans les logs)
# INFO  c.b.security.JwtTokenProvider : JWT Secret key initialized (size: 256 bits)
# INFO  o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port 8085

# 5. Tester un endpoint public
curl http://localhost:8085/actuator/health
# → {"status":"UP"}

# 6. Tester Swagger
# Ouvrir http://localhost:8085/swagger-ui.html
```

---

## Prérequis pour le démarrage

1. **MongoDB** doit tourner sur `localhost:27017`
2. **`.env`** doit contenir des clés valides (voir `.env.example`)
3. **Java 21** installé
4. **Maven 3.9+** installé
