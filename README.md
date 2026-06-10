# 🏪 BoutiqueSync Backend

**Système de gestion de boutique** — API REST Spring Boot pour gérer les ventes, l'inventaire, les factures PDF et les notifications WhatsApp. Conçu pour les petites boutiques en Afrique de l'Ouest (devise XAF, TVA 19.25%).

---

## Table des matières

1. [Démarrage rapide](#démarrage-rapide)
2. [Configuration](#configuration)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Intégration Frontend](#intégration-frontend)
6. [Authentification & Sécurité](#authentification--sécurité)
7. [WebSocket (temps réel)](#websocket-temps-réel)
8. [Modèles de données](#modèles-de-données)
9. [Flux métier](#flux-métier)

---

## Démarrage rapide

### Prérequis

- Java 21
- MongoDB 6+ (local ou distant)
- Maven 3.9+

### Installation

```bash
# Cloner et entrer dans le projet
git clone <repository>
cd boutiquesync-backend

# Copier le fichier d'environnement et le remplir
cp .env.example .env
# Éditer .env avec vos valeurs réelles

# Compiler
mvn clean compile

# Lancer
mvn spring-boot:run
```

### Accès

| Service | URL |
|---------|-----|
| API REST | `http://localhost:8085` |
| Swagger UI | `http://localhost:8085/swagger-ui.html` |
| API Docs JSON | `http://localhost:8085/api-docs` |
| WebSocket | `ws://localhost:8085/ws` |

---

## Configuration

### Variables d'environnement (.env)

```bash
# Profil
SPRING_PROFILES_ACTIVE=dev

# MongoDB
MONGODB_URI=mongodb://localhost:27017/boutiquesync

# Sécurité JWT (générer: openssl rand -base64 32)
JWT_SECRET=<clé base64 256 bits>
TOTP_KEY=<clé AES 32 bytes pour chiffrement TOTP>

# Email SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-app-password

# Boutique
SHOP_NAME=Ma Boutique
SHOP_ADDRESS=Yaoundé, Cameroun
SHOP_PHONE=+237600000000
SHOP_EMAIL=contact@maboutique.com

# Frontend
FRONTEND_BASE_URL=http://localhost:3000
```

### Profils Spring

| Profil | MongoDB | Logs | Usage |
|--------|---------|------|-------|
| `dev` | localhost:27017 | DEBUG | Développement local |
| `prod` | Variable `MONGODB_URI` | INFO | Production |

---

## Architecture

```
src/main/java/com/boutiquesync/
├── config/           # Configuration Spring (Security, Cache, WebSocket, Properties)
├── controller/       # Endpoints REST (9 contrôleurs)
├── service/          # Logique métier (13 services)
├── repository/       # Accès MongoDB (9 repositories)
├── model/            # Documents MongoDB + enums
├── dto/              # Objets de transfert (requêtes/réponses)
├── security/         # JWT filter, token provider
├── event/            # Événements asynchrones (vente, stock)
└── exception/        # Gestion globale des erreurs
```

### Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Spring Boot 3.3.5 (Java 21) |
| Base de données | MongoDB |
| Cache | Caffeine (TTL 5 min) |
| Temps réel | WebSocket STOMP + SockJS |
| Auth | JWT (access 15min + refresh 7j) + TOTP 2FA |
| PDF | iText 8 |
| Email | Spring Mail + Thymeleaf |
| Documentation | SpringDoc OpenAPI |

---

## API Endpoints

### Format de réponse uniforme

Toutes les réponses suivent ce format :

```json
{
  "success": true,
  "message": "Description de l'opération",
  "data": { ... },
  "errorCode": null,
  "timestamp": "2026-06-09T10:30:00"
}
```

En cas d'erreur :

```json
{
  "success": false,
  "message": "Description de l'erreur",
  "data": null,
  "errorCode": "ERROR_CODE",
  "details": { "field": "message d'erreur" },
  "timestamp": "2026-06-09T10:30:00"
}
```

### Pagination

Les endpoints paginés retournent :

```json
{
  "success": true,
  "data": {
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "first": true,
    "last": false
  }
}
```

Paramètres de pagination : `?page=0&size=20&sort=createdAt,desc`

---

### Authentification (`/api/auth`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/register-admin` | ❌ | Créer le premier admin (une seule fois) |
| POST | `/api/auth/login` | ❌ | Connexion email/password |
| POST | `/api/auth/2fa/verify` | ❌ | Vérifier code 2FA |
| POST | `/api/auth/refresh` | ❌ | Renouveler les tokens |
| POST | `/api/auth/logout` | ✅ | Déconnexion (révoque refresh token) |
| POST | `/api/auth/password/change` | ✅ | Changer mot de passe |
| POST | `/api/auth/2fa/totp/setup` | ✅ | Configurer TOTP (QR code) |
| POST | `/api/auth/2fa/totp/activate` | ✅ | Activer 2FA avec premier code |
| POST | `/api/auth/2fa/totp/disable` | ✅ | Désactiver 2FA |
| POST | `/api/auth/2fa/backup/regenerate` | ✅ | Régénérer codes de secours |

### Ventes (`/api/sales`)

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| POST | `/api/sales` | ADMIN, EMPLOYEE | Créer une vente |
| GET | `/api/sales` | ADMIN | Lister toutes les ventes (paginé) |
| GET | `/api/sales/{id}` | ADMIN, EMPLOYEE | Détail d'une vente |
| POST | `/api/sales/{id}/cancel` | ADMIN | Annuler une vente |
| GET | `/api/sales/today` | ADMIN | Ventes du jour |

### Produits (`/api/products`)

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| GET | `/api/products` | ADMIN, EMPLOYEE | Lister les produits (paginé) |
| GET | `/api/products/{id}` | ADMIN, EMPLOYEE | Détail d'un produit |
| POST | `/api/products` | ADMIN | Créer un produit |
| PUT | `/api/products/{id}` | ADMIN | Modifier un produit |
| DELETE | `/api/products/{id}` | ADMIN | Supprimer un produit (soft delete) |

### Factures (`/api/invoices`)

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| GET | `/api/invoices` | ADMIN | Lister les factures (paginé) |
| GET | `/api/invoices/{id}` | ADMIN | Détail d'une facture |
| GET | `/api/invoices/{id}/pdf` | ADMIN, EMPLOYEE | Télécharger le PDF |

### Dashboard (`/api/dashboard`)

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| GET | `/api/dashboard/summary` | ADMIN | KPIs (ventes jour/mois, alertes) |
| GET | `/api/dashboard/top-products` | ADMIN | Produits les plus vendus |
| GET | `/api/dashboard/bottom-products` | ADMIN | Produits les moins vendus |
| GET | `/api/dashboard/stock-alerts` | ADMIN | Produits en alerte stock |

### Utilisateurs (`/api/users`)

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| GET | `/api/users` | ADMIN | Lister les utilisateurs |
| GET | `/api/users/{id}` | ADMIN | Détail utilisateur |
| PUT | `/api/users/{id}/activate` | ADMIN | Activer un compte |
| PUT | `/api/users/{id}/deactivate` | ADMIN | Désactiver un compte |

### Invitation employés (`/api/employees`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/employees/invite` | ADMIN | Envoyer une invitation |
| GET | `/api/employees/invite/verify?token=xxx` | ❌ | Vérifier un token d'invitation |
| POST | `/api/employees/invite/complete` | ❌ | Compléter l'inscription |

### Inventaire (`/api/inventory`)

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| GET | `/api/inventory/movements` | ADMIN | Historique mouvements stock |
| POST | `/api/inventory/adjust` | ADMIN | Ajustement manuel stock |

---

## Intégration Frontend

### 1. Configuration Axios/Fetch

```typescript
// api/client.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8085';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer le refresh automatique
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh échoué → déconnecter
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. Flux d'authentification

```typescript
// api/auth.ts
import apiClient from './client';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string | null;
  refreshToken: string | null;
  tempToken: string | null;
  twoFactorRequired: boolean;
  method: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

// Étape 1 : Login
export async function login(credentials: LoginRequest) {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/login',
    credentials
  );

  if (data.data.twoFactorRequired) {
    // Stocker le tempToken, rediriger vers page 2FA
    sessionStorage.setItem('tempToken', data.data.tempToken!);
    return { requires2FA: true, method: data.data.method };
  }

  // Connexion directe (pas de 2FA)
  localStorage.setItem('accessToken', data.data.accessToken!);
  localStorage.setItem('refreshToken', data.data.refreshToken!);
  return { requires2FA: false, user: data.data.user };
}

// Étape 2 (si 2FA) : Vérifier le code
export async function verify2FA(code: string) {
  const tempToken = sessionStorage.getItem('tempToken');
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/2fa/verify',
    { tempToken, code }
  );

  localStorage.setItem('accessToken', data.data.accessToken!);
  localStorage.setItem('refreshToken', data.data.refreshToken!);
  sessionStorage.removeItem('tempToken');
  return data.data.user;
}

// Enregistrement du premier admin
export async function registerAdmin(payload: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}) {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/register-admin',
    payload
  );

  localStorage.setItem('accessToken', data.data.accessToken!);
  localStorage.setItem('refreshToken', data.data.refreshToken!);
  return data.data.user;
}

// Déconnexion
export async function logout() {
  await apiClient.post('/api/auth/logout');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

### 3. Gestion des ventes

```typescript
// api/sales.ts
import apiClient from './client';

interface SaleItemRequest {
  productId: string;
  quantity: number;
}

interface CreateSaleRequest {
  customerName?: string;
  customerPhone?: string;
  items: SaleItemRequest[];
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'TRANSFER';
  amountPaid: number;
}

// Créer une vente
export async function createSale(sale: CreateSaleRequest) {
  const { data } = await apiClient.post('/api/sales', sale);
  return data.data;
}

// Lister les ventes (paginé)
export async function getSales(page = 0, size = 20) {
  const { data } = await apiClient.get('/api/sales', {
    params: { page, size, sort: 'createdAt,desc' },
  });
  return data.data;
}

// Ventes du jour
export async function getTodaySales() {
  const { data } = await apiClient.get('/api/sales/today');
  return data.data;
}

// Annuler une vente
export async function cancelSale(saleId: string, reason: string) {
  const { data } = await apiClient.post(`/api/sales/${saleId}/cancel`, { reason });
  return data.data;
}
```

### 4. Gestion des produits

```typescript
// api/products.ts
import apiClient from './client';

interface CreateProductRequest {
  name: string;
  description?: string;
  barcode?: string;
  purchasePrice: number;
  sellingPrice: number;
  vatRate?: number;       // défaut: 19.25
  currentStock?: number;  // défaut: 0
  alertThreshold?: number; // défaut: 5
  unit?: string;          // défaut: "pièce"
}

// Lister les produits
export async function getProducts(page = 0, size = 20) {
  const { data } = await apiClient.get('/api/products', {
    params: { page, size },
  });
  return data.data;
}

// Créer un produit
export async function createProduct(product: CreateProductRequest) {
  const { data } = await apiClient.post('/api/products', product);
  return data.data;
}

// Modifier un produit
export async function updateProduct(id: string, product: Partial<CreateProductRequest>) {
  const { data } = await apiClient.put(`/api/products/${id}`, product);
  return data.data;
}

// Supprimer (soft delete)
export async function deleteProduct(id: string) {
  await apiClient.delete(`/api/products/${id}`);
}
```

### 5. Dashboard

```typescript
// api/dashboard.ts
import apiClient from './client';

interface DashboardSummary {
  todaySalesCount: number;
  todayRevenue: number;
  monthSalesCount: number;
  monthRevenue: number;
  stockAlertsCount: number;
}

interface ProductStat {
  productId: string;
  productName: string;
  quantitySold: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get('/api/dashboard/summary');
  return data.data;
}

export async function getTopProducts(
  period: 'week' | 'month' | 'year' = 'month',
  limit = 10
): Promise<ProductStat[]> {
  const { data } = await apiClient.get('/api/dashboard/top-products', {
    params: { period, limit },
  });
  return data.data;
}

export async function getStockAlerts() {
  const { data } = await apiClient.get('/api/dashboard/stock-alerts');
  return data.data;
}
```

### 6. Invitation employés

```typescript
// api/employees.ts
import apiClient from './client';

// Admin envoie une invitation
export async function inviteEmployee(email: string) {
  await apiClient.post('/api/employees/invite', { email });
}

// Employé vérifie son token (page d'inscription)
export async function verifyInvitationToken(token: string) {
  const { data } = await apiClient.get('/api/employees/invite/verify', {
    params: { token },
  });
  return data; // { email, valid, message }
}

// Employé complète son inscription
export async function completeRegistration(payload: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber?: string;
}) {
  await apiClient.post('/api/employees/invite/complete', payload);
}
```

### 7. Factures

```typescript
// api/invoices.ts
import apiClient from './client';

// Lister les factures
export async function getInvoices(page = 0, size = 20) {
  const { data } = await apiClient.get('/api/invoices', {
    params: { page, size },
  });
  return data.data;
}

// Télécharger le PDF
export async function downloadInvoicePdf(invoiceId: string) {
  const response = await apiClient.get(`/api/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  });

  // Créer un lien de téléchargement
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `facture-${invoiceId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
```

---

## Authentification & Sécurité

### Flux JWT

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ Frontend│         │  API    │         │ MongoDB  │
└────┬────┘         └────┬────┘         └────┬─────┘
     │ POST /login        │                   │
     │───────────────────>│                   │
     │                    │ findByEmail()     │
     │                    │──────────────────>│
     │                    │<──────────────────│
     │                    │ verify password   │
     │  {accessToken,     │                   │
     │   refreshToken}    │                   │
     │<───────────────────│                   │
     │                    │                   │
     │ GET /api/sales     │                   │
     │ Authorization:     │                   │
     │ Bearer <token>     │                   │
     │───────────────────>│                   │
     │                    │ validate JWT      │
     │   200 OK           │                   │
     │<───────────────────│                   │
     │                    │                   │
     │ (token expiré)     │                   │
     │ POST /refresh      │                   │
     │ {refreshToken}     │                   │
     │───────────────────>│                   │
     │  {newAccessToken,  │ rotate token     │
     │   newRefreshToken} │──────────────────>│
     │<───────────────────│                   │
```

### Headers requis

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Codes d'erreur courants

| Code HTTP | errorCode | Signification |
|-----------|-----------|---------------|
| 400 | `VALIDATION_ERROR` | Données invalides (détails dans `details`) |
| 400 | `INSUFFICIENT_STOCK` | Stock insuffisant pour la vente |
| 400 | `INSUFFICIENT_PAYMENT` | Montant payé insuffisant |
| 401 | `INVALID_CREDENTIALS` | Email ou mot de passe incorrect |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token expiré/révoqué |
| 401 | `INVALID_2FA_CODE` | Code 2FA incorrect |
| 403 | `ACCESS_DENIED` | Permissions insuffisantes |
| 403 | `ACCOUNT_LOCKED` | Compte verrouillé (trop de tentatives) |
| 404 | `PRODUCT_NOT_FOUND` | Produit inexistant |
| 404 | `SALE_NOT_FOUND` | Vente inexistante |

---

## WebSocket (temps réel)

### Connexion depuis le frontend

```typescript
// websocket/client.ts
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const WS_URL = 'http://localhost:8085/ws';

let stompClient: Client;

export function connectWebSocket(onDashboardUpdate: (data: any) => void) {
  stompClient = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('WebSocket connecté');

      // S'abonner aux mises à jour du dashboard
      stompClient.subscribe('/topic/dashboard', (message) => {
        const data = JSON.parse(message.body);
        onDashboardUpdate(data);
      });

      // S'abonner aux alertes stock
      stompClient.subscribe('/topic/alerts', (message) => {
        const alert = JSON.parse(message.body);
        console.log('Alerte stock:', alert);
        // Afficher notification
      });
    },
    onStompError: (frame) => {
      console.error('Erreur WebSocket:', frame.headers['message']);
    },
  });

  stompClient.activate();
}

export function disconnectWebSocket() {
  if (stompClient) {
    stompClient.deactivate();
  }
}
```

### Topics disponibles

| Topic | Données | Déclenché par |
|-------|---------|---------------|
| `/topic/dashboard` | `DashboardSummary` | Après chaque vente |
| `/topic/alerts` | `{ productId, productName, currentStock }` | Stock sous le seuil |

### Exemple React : Dashboard temps réel

```tsx
// components/Dashboard.tsx
import { useEffect, useState } from 'react';
import { connectWebSocket, disconnectWebSocket } from '../websocket/client';
import { getDashboardSummary } from '../api/dashboard';

export function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    // Charger les données initiales
    getDashboardSummary().then(setSummary);

    // Écouter les mises à jour temps réel
    connectWebSocket((data) => {
      setSummary(data);
    });

    return () => disconnectWebSocket();
  }, []);

  if (!summary) return <div>Chargement...</div>;

  return (
    <div className="dashboard">
      <div className="kpi-card">
        <h3>Ventes aujourd'hui</h3>
        <p>{summary.todaySalesCount}</p>
        <p>{summary.todayRevenue.toLocaleString()} XAF</p>
      </div>
      <div className="kpi-card">
        <h3>Ventes ce mois</h3>
        <p>{summary.monthSalesCount}</p>
        <p>{summary.monthRevenue.toLocaleString()} XAF</p>
      </div>
      <div className="kpi-card alert">
        <h3>Alertes stock</h3>
        <p>{summary.stockAlertsCount}</p>
      </div>
    </div>
  );
}
```

---

## Modèles de données

### Types TypeScript pour le frontend

```typescript
// types/index.ts

// Enums
type UserRole = 'ADMIN' | 'EMPLOYEE';
type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'TRANSFER';
type SaleStatus = 'COMPLETED' | 'CANCELLED';
type MovementType = 'SALE_OUT' | 'SUPPLIER_IN' | 'ADJUSTMENT' | 'RETURN';

// Modèles
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  phoneNumber?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  purchasePrice: number;
  sellingPrice: number;
  vatRate: number;
  currentStock: number;
  alertThreshold: number;
  unit: string;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  employeeId: string;
  employeeName: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  totalVat: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeGiven: number;
  status: SaleStatus;
  cancellationReason?: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  saleId: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  totalVat: number;
  totalAmount: number;
  pdfPath: string;
  whatsappSent: boolean;
  createdAt: string;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  referenceId: string;
  performedBy: string;
  note?: string;
  createdAt: string;
}

// Réponses API
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  details?: Record<string, string>;
  timestamp: string;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
```

---

## Flux métier

### Créer une vente (scénario complet)

```
Frontend                          Backend
   │                                │
   │ POST /api/sales                │
   │ {                              │
   │   items: [                     │
   │     {productId: "x", qty: 2}  │
   │   ],                          │
   │   paymentMethod: "CASH",      │
   │   amountPaid: 15000,          │
   │   customerName: "Jean",       │
   │   customerPhone: "+237..."    │
   │ }                              │
   │───────────────────────────────>│
   │                                │ 1. Valide stock
   │                                │ 2. Calcule TVA (19.25%)
   │                                │ 3. Crée Sale
   │                                │ 4. Décrémente stock
   │                                │ 5. Publie événement
   │                                │
   │  201 Created                   │
   │  { sale avec saleNumber }      │
   │<───────────────────────────────│
   │                                │
   │                                │ [ASYNC] Génère facture PDF
   │                                │ [ASYNC] Met à jour dashboard
   │                                │
   │  WebSocket /topic/dashboard    │
   │  { nouveaux KPIs }             │
   │<~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│
```

### Invitation employé

```
Admin                    Backend                    Employé
  │                        │                          │
  │ POST /invite           │                          │
  │ {email: "emp@x.com"}  │                          │
  │───────────────────────>│                          │
  │                        │ Génère token             │
  │                        │ Envoie email ───────────>│
  │  202 Accepted          │                          │
  │<───────────────────────│                          │
  │                        │                          │
  │                        │   GET /invite/verify     │
  │                        │   ?token=abc123          │
  │                        │<─────────────────────────│
  │                        │   {email, valid: true}   │
  │                        │──────────────────────────>│
  │                        │                          │
  │                        │   POST /invite/complete  │
  │                        │   {token, firstName,     │
  │                        │    lastName, password}   │
  │                        │<─────────────────────────│
  │                        │   201 Created            │
  │                        │──────────────────────────>│
```

---

## CORS

Le backend autorise les origines suivantes :

- `http://localhost:5173` (dev Vite)
- `http://localhost:3000` (dev React/Next)
- `https://app.boutiquesync.cm` (production)

Pour modifier, ajuster la variable `FRONTEND_URL` ou éditer `SecurityConfig.java`.

---

## Logs

- Fichier : `logs/boutiquesync.log`
- Rotation automatique quotidienne
- Niveaux : DEBUG (dev), INFO (prod)

---

## Tests

```bash
# Tests unitaires + intégration (nécessite Docker pour TestContainers)
mvn test
```

---

## Notes importantes

- La devise est le **XAF** (Franc CFA CEMAC)
- La TVA par défaut est **19.25%** (Cameroun), configurable par produit
- Les factures PDF sont stockées dans le dossier `invoices/`
- Le système WhatsApp est désactivé par défaut (nécessite configuration Meta Business)
- Le premier appel à `/api/auth/register-admin` crée l'admin initial. Cet endpoint devient inopérant ensuite.
