# Guide de Déploiement — BoutiqueSync ERP

> Version production · Ubuntu 22.04 · Docker · MongoDB standalone

---

## Architecture déployée

```
Navigateur
    │
    ├── http://VOTRE_IP:4000  →  [boutiquesync-frontend]  Nginx + React build
    │                                      │
    └── http://VOTRE_IP:8085  →  [boutiquesync-backend]   Spring Boot API
                                           │
                                    [mongo]  (conteneur existant sur l'hôte)
                                    port 27017
```

---

## Prérequis sur le serveur

- Docker ≥ 24
- Docker Compose v2 (`docker compose` — sans tiret)
- Conteneur `mongo` déjà en cours d'exécution
- Port **4000** et **8085** libres (vérifier avec `ss -tlnp`)

---

## ÉTAPE 1 — Récupérer le code source

### Option A : depuis GitHub (recommandé)

```bash
cd /opt
git clone https://github.com/VOTRE_COMPTE/boutiquesync.git
cd boutiquesync
```

### Option B : copier depuis votre machine locale

```bash
# Sur votre PC local :
scp -r /chemin/vers/boutiquesync root@VOTRE_IP:/opt/boutiquesync
```

---

## ÉTAPE 2 — Créer le fichier .env

Le fichier `.env` contient tous les secrets — il n'est **pas** dans Git.
Créez-le manuellement sur le serveur :

```bash
cd /opt/boutiquesync
nano .env
```

Copiez-collez ce contenu et remplissez les valeurs :

```dotenv
# ─────────────────────────────────────────────
# SPRING
# ─────────────────────────────────────────────
SPRING_PROFILES_ACTIVE=prod

# ─────────────────────────────────────────────
# MONGODB
# Utilise host.docker.internal pour atteindre
# le conteneur mongo qui tourne sur l'hôte Docker
# ─────────────────────────────────────────────
MONGODB_URI=mongodb://host.docker.internal:27017/boutiquesync

# ─────────────────────────────────────────────
# SÉCURITÉ JWT & TOTP
# Générer avec :
#   openssl rand -base64 32   → JWT_SECRET
#   openssl rand -base64 24   → TOTP_KEY
# ─────────────────────────────────────────────
JWT_SECRET=REMPLACER_PAR_openssl_rand_base64_32
TOTP_KEY=REMPLACER_PAR_openssl_rand_base64_24

# ─────────────────────────────────────────────
# MAIL (Gmail avec App Password)
# ─────────────────────────────────────────────
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre@gmail.com
MAIL_PASSWORD=votre_app_password_gmail
MAIL_FROM_NAME=BoutiqueSync

# ─────────────────────────────────────────────
# INFORMATIONS DE LA BOUTIQUE
# ─────────────────────────────────────────────
SHOP_NAME=Boutique Foka
SHOP_ADDRESS=Yaounde, Cameroun
SHOP_PHONE=+237657224748
SHOP_EMAIL=votre@email.com
SHOP_VAT_NUMBER=
INVITATION_EXPIRY_HOURS=24

# ─────────────────────────────────────────────
# FRONTEND & CORS
# Remplacer VOTRE_IP par l'IP publique du serveur
# ex : 102.208.107.234
# ─────────────────────────────────────────────
FRONTEND_URL=http://VOTRE_IP:4000
FRONTEND_BASE_URL=http://VOTRE_IP:4000
FRONTEND_EXTRA_URLS=
FRONTEND_PORT=4000
SERVER_PORT=8085

# URL de l'API vue depuis le navigateur du client
# (injectée dans le build Vite au moment du docker compose build)
VITE_API_URL=http://VOTRE_IP:8085/api

# ─────────────────────────────────────────────
# COOKIES
# false = HTTP (sans HTTPS)
# true  = HTTPS uniquement (nécessite un certificat SSL)
# ─────────────────────────────────────────────
COOKIE_SECURE=false
COOKIE_SAME_SITE=Lax
```

Sauvegarde : **Ctrl+O** → Entrée → **Ctrl+X**

---

## ÉTAPE 3 — Générer les clés secrètes

```bash
# Copier les valeurs affichées dans le .env
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "TOTP_KEY=$(openssl rand -base64 24)"

# Puis éditer le .env pour les insérer
nano .env
```

---

## ÉTAPE 4 — Vérifier la connexion MongoDB

```bash
# Obtenir l'IP du conteneur mongo (si host.docker.internal ne fonctionne pas)
docker inspect mongo | grep '"IPAddress"'

# Tester la connexion depuis un conteneur temporaire
docker run --rm --add-host=host.docker.internal:host-gateway \
  mongo:8 mongosh "mongodb://host.docker.internal:27017" --eval "db.stats()"
```

Si la connexion échoue, remplacer dans `.env` :
```dotenv
# Remplacer par l'IP réelle obtenue ci-dessus (ex: 172.17.0.5)
MONGODB_URI=mongodb://172.17.0.5:27017/boutiquesync
```

---

## ÉTAPE 5 — Builder les images Docker

```bash
cd /opt/boutiquesync

# Builder les deux images localement
# (backend ~10 min, frontend ~5 min la première fois)
docker compose build
```

Ce qui est buildé :
- `boutiquesync-backend` : Maven compile le JAR Spring Boot, JRE Alpine l'exécute
- `boutiquesync-frontend` : Node.js compile le build Vite, Nginx le sert

---

## ÉTAPE 6 — Démarrer les conteneurs

```bash
# Démarrer en arrière-plan
docker compose up -d

# Vérifier que tout est démarré
docker compose ps
```

Résultat attendu :
```
NAME                     STATUS
boutiquesync-backend     Up (healthy)
boutiquesync-frontend    Up
```

---

## ÉTAPE 7 — Vérifier le déploiement

```bash
# Santé du backend
curl http://localhost:8085/actuator/health
# → {"status":"UP"}

# Frontend accessible
curl -I http://localhost:4000
# → HTTP/1.1 200 OK
```

Depuis votre navigateur :
- **Application** : `http://VOTRE_IP:4000`
- **API (Swagger)** : `http://VOTRE_IP:8085/swagger-ui.html`

---

## Commandes de maintenance

```bash
# Voir les logs en temps réel
docker compose logs -f

# Logs d'un seul service
docker compose logs boutiquesync-backend --tail=100
docker compose logs boutiquesync-frontend --tail=50

# Arrêter les conteneurs (sans supprimer les images)
docker compose stop

# Arrêter et supprimer les conteneurs
docker compose down

# Redémarrer un seul service
docker compose restart boutiquesync-backend

# Voir l'utilisation des ressources
docker stats boutiquesync-backend boutiquesync-frontend
```

---

## Mettre à jour l'application

```bash
cd /opt/boutiquesync

# 1. Récupérer les dernières modifications
git pull

# 2. Rebuilder les images
docker compose build

# 3. Redémarrer avec les nouvelles images
docker compose up -d

# 4. Vérifier les logs
docker compose logs -f --tail=50
```

---

## Résolution des problèmes courants

### Le backend ne démarre pas — erreur MongoDB

```bash
docker compose logs boutiquesync-backend | grep -i "mongo\|exception\|error"
```

→ Vérifier `MONGODB_URI` dans `.env` et relancer :
```bash
docker compose restart boutiquesync-backend
```

### Le frontend affiche une erreur API (CORS ou connexion refusée)

→ Vérifier que `VITE_API_URL` dans `.env` correspond bien à l'IP publique du serveur.
→ Après modification, rebuilder obligatoirement (la valeur est injectée au build) :
```bash
docker compose build boutiquesync-frontend
docker compose up -d boutiquesync-frontend
```

### Port déjà utilisé

```bash
# Voir quel processus utilise un port
ss -tlnp | grep 4000
ss -tlnp | grep 8085

# Changer le port dans .env si nécessaire
# FRONTEND_PORT=4001  ou  SERVER_PORT=8086
```

### Cookies non envoyés (erreur 401 après login)

→ Si `COOKIE_SECURE=true` mais que l'app tourne en HTTP, les cookies sont bloqués.
→ Solution : `COOKIE_SECURE=false` tant qu'il n'y a pas de certificat HTTPS.

---

## Passage en HTTPS (optionnel)

Pour sécuriser avec un domaine et un certificat SSL :

1. Pointer votre domaine vers `VOTRE_IP`
2. Installer Nginx sur l'hôte comme reverse proxy
3. Obtenir un certificat via Let's Encrypt (`certbot`)
4. Mettre à jour le `.env` :
   ```dotenv
   FRONTEND_URL=https://votre-domaine.com
   FRONTEND_BASE_URL=https://votre-domaine.com
   VITE_API_URL=https://votre-domaine.com/api
   COOKIE_SECURE=true
   ```
5. Rebuilder et relancer : `docker compose build && docker compose up -d`

---

## Sauvegarde MongoDB

```bash
# Dump de la base boutiquesync
docker exec mongo mongodump \
  --db boutiquesync \
  --out /tmp/backup_$(date +%Y%m%d)

# Copier sur l'hôte
docker cp mongo:/tmp/backup_$(date +%Y%m%d) ./backups/

# Restaurer
docker exec mongo mongorestore \
  --db boutiquesync \
  /tmp/backup_YYYYMMDD/boutiquesync
```

---

*Dernière mise à jour : $(date +%Y-%m-%d)*
