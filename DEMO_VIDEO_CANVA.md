# 🎬 Guide de Réalisation — Démo Vidéo BoutiqueSync dans Canva

> Ce guide couvre toutes les étapes pour produire une vidéo de présentation professionnelle de BoutiqueSync en utilisant Canva.

---

## 📋 Avant de Commencer — Prérequis

### Ce dont tu as besoin
- Un compte Canva (gratuit ou Pro — le Pro donne accès à plus de transitions et de musique)
- Des captures d'écran ou un enregistrement d'écran de l'interface BoutiqueSync
- Un outil d'enregistrement d'écran (OBS Studio, Loom, ou l'enregistreur intégré Windows/Mac)
- Optionnel : micro pour narration voix-off

### Durée recommandée de la vidéo
- **Courte (réseaux sociaux)** : 60–90 secondes
- **Complète (présentation client)** : 3–5 minutes

---

## 🎯 Étape 1 — Définir le Scénario de la Démo

Avant de toucher Canva, décide ce que tu veux montrer. Voici un scénario recommandé pour BoutiqueSync :

### Séquence narrative (ordre suggéré)

| N° | Scène | Durée | Ce qu'on montre |
|----|-------|-------|-----------------|
| 1 | **Accroche** | 5–8 sec | Logo + slogan animé |
| 2 | **Problème** | 10–15 sec | Texte : "Gérer une boutique sans outil, c'est compliqué..." |
| 3 | **Connexion** | 8–10 sec | Écran de login BoutiqueSync (avec 2FA) |
| 4 | **Tableau de bord** | 15–20 sec | Dashboard admin — KPIs, graphe semaine, alertes stock |
| 5 | **Caisse POS** | 20–25 sec | Sélection de produits, calcul automatique TVA 19.25%, encaissement |
| 6 | **Facture PDF** | 10–12 sec | Génération et téléchargement de la facture PDF |
| 7 | **Gestion stock** | 10–12 sec | Liste produits, alertes de stock faible |
| 8 | **Gestion utilisateurs** | 8–10 sec | Invitation employé par email |
| 9 | **Call to Action** | 5–8 sec | Contact / lien / QR code |

---

## 📸 Étape 2 — Capturer les Visuels du Projet

### 2.1 Démarrer l'application

```bash
# Terminal 1 — Backend
mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend
npm run dev
```

L'interface sera disponible sur `http://localhost:5173`

### 2.2 Captures d'écran à faire (liste)

Prends une capture de chaque écran ci-dessous et nomme les fichiers de manière organisée :

```
demo-assets/
├── 01_login.png              ← Écran de connexion
├── 02_login_2fa.png          ← Étape 2FA (si activé)
├── 03_dashboard_admin.png    ← Dashboard complet avec KPIs
├── 04_dashboard_graph.png    ← Zoom sur le graphe semaine
├── 05_stock_alerts.png       ← Alertes stock (produits en rouge)
├── 06_pos_terminal.png       ← Caisse POS avec produits dans le panier
├── 07_pos_paiement.png       ← Modal de paiement (montant + rendu monnaie)
├── 08_facture_pdf.png        ← PDF généré (FAC-2026-xxxxx)
├── 09_produits_liste.png     ← Liste des produits
├── 10_users_management.png   ← Gestion des utilisateurs
├── 11_invitation_email.png   ← Formulaire d'invitation employé
├── 12_audit_logs.png         ← Journal d'audit de sécurité
```

### 2.3 Enregistrement d'écran (optionnel mais recommandé)

Pour les parties dynamiques (caisse POS, navigation), un enregistrement de 15–30 sec est plus percutant qu'une image statique.

**Avec OBS Studio :**
1. Ouvre OBS → Scène → Ajoute "Capture de fenêtre" → sélectionne le navigateur
2. Lance l'enregistrement
3. Navigue dans l'application naturellement
4. Exporte en MP4

**Avec Loom (plus simple) :**
1. Va sur [loom.com](https://www.loom.com) → installe l'extension Chrome
2. Clique sur l'icône Loom → "Écran uniquement"
3. Enregistre, puis télécharge la vidéo en MP4

---

## 🎨 Étape 3 — Créer le Projet dans Canva

### 3.1 Créer une nouvelle présentation vidéo

1. Ouvre [canva.com](https://www.canva.com)
2. Clique sur **"Créer un design"**
3. Cherche **"Présentation vidéo"** dans la barre de recherche
4. Choisis le format **16:9 (1920×1080)** pour une vidéo HD

### 3.2 Choisir un template

Dans la barre de gauche → **Templates** → cherche :
- "Tech startup presentation"
- "App demo"
- "Product showcase"

Recommandé : un template sombre (fond noir/navy) ou blanc épuré qui mettra en valeur les screenshots de l'interface.

### 3.3 Palette de couleurs BoutiqueSync

Pour rester cohérent avec l'interface du projet, utilise ces couleurs :

| Rôle | Couleur | Code HEX |
|------|---------|----------|
| Fond principal | Blanc | `#FFFFFF` |
| Fond sombre | Slate 950 | `#020617` |
| Accent principal | Indigo | `#4F46E5` |
| Accent succès | Emerald | `#059669` |
| Accent alerte | Rose | `#E11D48` |
| Accent chaud | Amber | `#D97706` |
| Texte secondaire | Slate 400 | `#94A3B8` |

Pour ajouter des couleurs personnalisées dans Canva :
- Sélectionne un élément → clique sur la couleur → "Couleurs du document" → "+" → colle le code HEX

---

## 🛠 Étape 4 — Construire les Slides/Scènes

### Scène 1 — Accroche (Titre)

**Structure :**
- Fond : `#020617` (noir slate)
- Centre : Logo ou nom **BoutiqueSync** en grande police (bold, blanc)
- Sous-titre : *"Système de gestion de boutique tout-en-un"*
- Badge : Petit tag "XAF · Cameroun · Spring Boot + React"
- Animation : Fondu à l'entrée sur le titre

**Comment faire dans Canva :**
1. Clique sur la page → choisis une couleur de fond `#020617`
2. Ajoute un bloc texte → tape "BoutiqueSync" → taille 80–100px → police Bold
3. Ajoute un deuxième bloc → sous-titre → taille 24px → couleur grise
4. Clique sur le titre → **Animer** → "Fondu" ou "Apparaître"

---

### Scène 2 — Le Problème (optionnel mais efficace)

**Structure :**
- 2–3 icônes + texte court (ex: "📋 Gestion manuelle = erreurs", "📉 Pas de vision sur le stock")
- Animation : apparition un par un

---

### Scène 3 — Écran de Connexion

**Structure :**
- Fond léger (gris clair)
- Screenshot `01_login.png` centré avec ombre portée
- Texte latéral : "Connexion sécurisée JWT + 2FA TOTP"
- Icône cadenas

**Comment ajouter une ombre dans Canva :**
- Sélectionne l'image → **Effets** → "Ombre" → ajuste la distance et le flou

---

### Scène 4 — Tableau de Bord

C'est la scène la plus importante. Montre la puissance du dashboard.

**Option A — Image statique annotée :**
1. Insère `03_dashboard_admin.png` en plein écran
2. Ajoute des callouts (flèches + bulles) pour pointer :
   - Les KPIs jour/semaine/mois
   - Le graphe des ventes
   - Les alertes stock

**Option B — Vidéo screencast :**
1. Uploads → ta vidéo MP4 du dashboard
2. Insère-la dans la scène
3. Découpe avec les outils de trim de Canva

**Textes d'annotation suggérés :**
- "📊 KPIs en temps réel"
- "⚠️ Alertes stock automatiques"
- "📈 Tendance vs mois précédent"

---

### Scène 5 — Caisse POS (Point de Vente)

**Structure :**
- Screenshot `06_pos_terminal.png` à gauche (60% de la largeur)
- Texte à droite :
  - ✅ Scan/sélection de produits
  - ✅ TVA 19.25% calculée automatiquement
  - ✅ Rendu monnaie instantané
  - ✅ Paiement Cash / Mobile Money / Carte

---

### Scène 6 — Génération de Facture PDF

**Structure :**
- Screenshot du PDF généré (ex: FAC-2026-00001.pdf ouvert)
- Texte : "Factures PDF automatiques numérotées"
- Badge : "iText 8 · Format professionnel"

Pour montrer un vrai PDF :
1. Ouvre l'un des fichiers dans `invoices/` (ex: `FAC-2026-00001.pdf`)
2. Fais une capture d'écran du PDF ouvert
3. Insère cette capture dans Canva

---

### Scène 7 — Gestion du Stock

**Structure :**
- Screenshot `05_stock_alerts.png`
- Superposition : badge rouge "Stock faible" sur les lignes concernées
- Texte : "Seuils d'alerte configurables par produit"

---

### Scène 8 — Gestion des Utilisateurs

**Structure :**
- Screenshot `10_users_management.png`
- Texte : "Rôles ADMIN / EMPLOYEE · Invitation par email"
- Animation d'un email qui "vole" vers une adresse (Canva a des animations de ce type)

---

### Scène 9 — Call to Action Final

**Structure :**
- Fond sombre `#020617`
- Titre : "Prêt à moderniser votre boutique ?"
- Bloc contact :
  - 📧 Email / WhatsApp
  - 🔗 Lien GitHub ou site web
  - QR Code (générable sur Canva ou [qr-code-generator.com](https://www.qr-code-generator.com))
- Animation finale : "Pulse" sur le bouton CTA

---

## 🎵 Étape 5 — Ajouter Son et Transitions

### Musique de fond

Dans Canva :
1. Clique sur **Audio** dans la barre latérale
2. Cherche : "corporate", "tech", "upbeat minimal"
3. Ajoute la piste → ajuste le volume à **20–30%** pour ne pas couvrir la voix

Alternatives gratuites sans copyright :
- [pixabay.com/music](https://pixabay.com/music/) → filtre "Corporate"
- [bensound.com](https://www.bensound.com) → "Ukulele" ou "Inspire"

### Transitions entre scènes

1. Clique sur le **trait vertical** entre deux scènes dans la timeline
2. Choisis : **"Fondu"** (le plus professionnel) ou **"Glissement"**
3. Durée recommandée : 0.5 secondes

### Voix-off (optionnel)

Si tu veux une narration :
1. Enregistre ta voix avec Audacity ou directement sur ton téléphone
2. Uploads → ton fichier audio MP3
3. Dans Canva → Timeline → ajoute la piste audio et synchronise avec les scènes

---

## 🖼 Étape 6 — Conseils Visuels pour les Screenshots

### Rendre les captures plus professionnelles

**Ajoute un cadre de navigateur mockup :**
- Dans Canva, cherche dans les éléments : "browser mockup" ou "browser frame"
- Glisse ton screenshot à l'intérieur du mockup pour simuler un vrai écran

**Ajoute de l'ombre et du flou d'arrière-plan :**
- Effets → Ombre (offset 8px, flou 20px, opacité 30%)
- Met un fond légèrement coloré derrière l'image pour la faire ressortir

**Zoom animé sur une zone précise :**
- Canva Pro : utilise l'animation "Zoom" sur l'image
- Sinon : crée deux scènes — la vue globale puis un crop de la zone importante

---

## ✅ Étape 7 — Export et Partage

### Exporter la vidéo

1. Clique sur **Partager** (coin supérieur droit)
2. → **Télécharger**
3. → Format : **MP4 (vidéo)**
4. → Qualité : **1080p** (recommandé)
5. Lance le téléchargement

### Durées d'export estimées
- Vidéo de 1 min : ~2–3 minutes
- Vidéo de 5 min : ~8–12 minutes

### Où partager
| Plateforme | Format optimal | Durée max |
|------------|---------------|-----------|
| LinkedIn | MP4 16:9 1080p | 10 min |
| WhatsApp Business | MP4 compressé | 16 Mo |
| YouTube | MP4 1080p | Illimitée |
| Instagram Reels | MP4 9:16 (vertical) | 90 sec |

> Pour Instagram Reels, recrée une version 9:16 dans Canva (1080×1920) avec les mêmes slides adaptées.

---

## 💡 Astuces Supplémentaires

### Raccourcis Canva utiles
| Action | Raccourci |
|--------|-----------|
| Dupliquer une page | `Ctrl + D` |
| Grouper des éléments | `Ctrl + G` |
| Aligner au centre | Sélectionne → Position → Centre |
| Prévisualiser la vidéo | `Espace` ou bouton ▶ |
| Zoom avant/arrière | `Ctrl + scroll` |

### Checklist finale avant export

- [ ] Toutes les scènes ont une durée définie (clique sur la page → ajuste en bas)
- [ ] Les transitions sont appliquées
- [ ] La musique est au bon volume (pas de pic audio)
- [ ] Le texte est lisible sur mobile (taille min 18px pour les sous-titres)
- [ ] Le logo/nom BoutiqueSync apparaît au début ET à la fin
- [ ] Le Call to Action final est clair

---

## 📂 Structure des fichiers à créer

```
demo-assets/               ← Crée ce dossier dans ton projet
├── screenshots/           ← Toutes les captures d'écran
├── screencasts/           ← Vidéos OBS/Loom MP4
├── logo/                  ← Logo BoutiqueSync (si tu en as un)
└── audio/                 ← Musique de fond si téléchargée
```

---

## 🔗 Ressources utiles

| Ressource | Lien | Usage |
|-----------|------|-------|
| Canva | [canva.com](https://www.canva.com) | Outil principal |
| Mockup navigateur | Cherche "browser mockup" dans Canva | Encadrer les screenshots |
| Musique libre | [pixabay.com/music](https://pixabay.com/music) | Fond sonore |
| Générateur QR Code | [qr-code-generator.com](https://www.qr-code-generator.com) | CTA final |
| Enregistrement (Loom) | [loom.com](https://www.loom.com) | Screencasts rapides |
| Enregistrement (OBS) | [obsproject.com](https://obsproject.com) | Screencasts avancés |
| Compression vidéo | [handbrake.fr](https://handbrake.fr) | Réduire la taille MP4 |

---

*Document généré pour le projet BoutiqueSync — Système de gestion de boutique (Spring Boot 3 · React · MongoDB · XAF)*
