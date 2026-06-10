# === PHASE 1 : Compilation ===
# On prend une image qui a Maven + Java 21 pour compiler
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

# On copie pom.xml EN PREMIER (astuce : si le code change mais pas les dépendances,
# Docker réutilise le cache et ne re-télécharge pas tout Maven)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Maintenant on copie le code et on compile → produit target/boutiquesync-backend.jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# === PHASE 2 : Image finale légère ===
# On repart d'une image légère (alpine) qui a juste Java 21 pour exécuter
# On ne garde PAS Maven ni le code source → image plus petite
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Sécurité : on crée un utilisateur dédié, pas root
RUN addgroup -S boutiquesync && adduser -S boutiquesync -G boutiquesync

# On récupère UNIQUEMENT le JAR compilé depuis la Phase 1
COPY --from=build /app/target/*.jar app.jar

# Dossier pour les logs
RUN mkdir -p logs && chown -R boutiquesync:boutiquesync /app

USER boutiquesync

# Port exposé (le même que dans ton application.yml)
EXPOSE 8085

# Commande de démarrage
ENTRYPOINT ["java", "-jar", "app.jar"]
