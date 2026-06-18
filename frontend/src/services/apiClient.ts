/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * apiClient.ts — Configuration API et modules métier Spring Boot.
 *
 * Responsabilités de ce fichier :
 *  1. Lire / persister la configuration de connexion au backend (URL, mode).
 *  2. Exposer les data-mappers entre le format backend Spring et le format frontend.
 *  3. Exposer `boutiqueApi` : modules métier organisés par domaine.
 *
 * Ce qui N'est PAS ici :
 *  - Gestion du token d'accès → cookie HttpOnly posé par le serveur, lu
 *    automatiquement par le navigateur via `withCredentials: true` (Axios).
 *  - Gestion du refresh token → idem, cookie HttpOnly, géré par l'interceptor
 *    Axios dans `useApiRequest.ts`.
 *  - Logique de retry / refresh → dans `useApiRequest.ts`.
 */

import {
  ApiEnvelope,
  AuthUserInfo,
  Client,
  LoginResponseDto,
  Product,
  Sale,
  StockMovement,
  Supplier,
  User,
} from "../types";
import { axiosInstance } from "../components/useApiRequest";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONFIGURATION API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape de la configuration persistée en localStorage.
 *
 * `token` et `refreshToken` ont été retirés : les tokens sont désormais
 * stockés exclusivement en cookies HttpOnly côté serveur.  Le frontend n'y
 * a jamais accès via JavaScript, ce qui élimine les risques XSS associés
 * au stockage en localStorage.
 */
export interface ApiConfig {
  /** URL de base du backend Spring Boot, configurable depuis l'interface admin. */
  baseUrl: string;
}

/** Valeurs par défaut utilisées au premier lancement. */
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: "http://192.168.43.138:8085/api",
};

/**
 * Lit la configuration courante depuis localStorage.
 * L'administrateur peut modifier `baseUrl` et `apiMode` depuis l'interface.
 */
export function getApiConfig(): ApiConfig {
  return {
    baseUrl: localStorage.getItem("boutique_api_url") ?? DEFAULT_CONFIG.baseUrl,
  };
}

/**
 * Persiste une mise à jour partielle de la configuration en localStorage.
 * Appelé depuis le panneau d'administration quand l'admin change l'URL ou
 * bascule le mode API.
 */
export function saveApiConfig(config: Partial<ApiConfig>): void {
  if (config.baseUrl !== undefined) {
    localStorage.setItem("boutique_api_url", config.baseUrl);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. INSTANCE AXIOS PARTAGÉE
//    Importée ici pour les cas où un module a besoin d'un accès direct
//    (ex. téléchargement de blob).  L'interceptor de refresh est monté dans
//    useApiRequest.ts — ne pas dupliquer ici.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 3. DATA MAPPERS  (Spring Boot ↔ React Frontend)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforme un produit au format backend Spring en objet `Product` frontend.
 * Centraliser ce mapping évite la duplication dans chaque module et facilite
 * l'adaptation si le contrat d'API change.
 */
export function mapBackendProductToFrontend(bp: any): Product {
  return {
    id: bp.id,
    name: bp.name ?? "Produit sans nom",
    reference: bp.barcode ?? bp.id ?? "REF-GEN", // pas de champ reference côté backend, on retombe sur le barcode
    barcode: bp.barcode ?? "",
    purchasePrice: bp.purchasePrice ?? 0,
    sellingPrice: bp.sellingPrice ?? 0,
    vatRate: bp.vatRate ?? 19.25,
    quantity: bp.currentStock ?? 0,
    alertThreshold: bp.alertThreshold ?? 5,
    unit: bp.unit ?? "pièce",
    description: bp.description ?? "",
    imageUrl:
      bp.imageUrl ??
      "https://images.unsplash.com/photo-1496181130204-755241524eab?auto=format&fit=crop&w=300&q=80",
    createdAt: bp.createdAt ?? new Date().toISOString(),
  };
}

/** Convertit le profil minimal d'auth en objet User complet utilisable dans AppState. */
export function mapAuthUserToFrontend(au: AuthUserInfo): User {
  return {
    id: au.id,
    firstName: au.firstName,
    lastName: au.lastName,
    email: au.email,
    username: au.email.split("@")[0],
    role: au.role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
    status: "ACTIVE", // on vient de se connecter, donc forcément actif
    mfaEnabled: false, // information non retournée ici ; à corriger si besoin via /users/me
    createdAt: new Date().toISOString(), // valeur provisoire, pas critique pour la session
  };
}

/**
 * Transforme un objet `Product` frontend en payload attendu par Spring Boot.
 * Le champ `vatRate` est fixé à 19,25 % conformément à la TVA en vigueur
 * en Afrique centrale (Cameroun).
 */

/** Construit le payload exact attendu par CreateProductRequest / UpdateProductRequest côté Spring. */
export function mapFrontendProductToBackend(fp: Partial<Product>): any {
  return {
    name: fp.name,
    description: fp.description ?? "",
    barcode: fp.barcode ?? "",
    purchasePrice: fp.purchasePrice ?? 0,
    sellingPrice: fp.sellingPrice ?? 0,
    vatRate: fp.vatRate ?? 19.25,
    currentStock: fp.quantity ?? 0,
    alertThreshold: fp.alertThreshold ?? 5,
    unit: fp.unit ?? "pièce",
    imageUrl: fp.imageUrl ?? "",
  };
}
/**
 * Transforme une vente backend en objet `Sale` frontend.
 * Gère la différence de nommage (`customerName` → `clientName`, etc.)
 * et normalise les méthodes de paiement.
 */
export function mapBackendSaleToFrontend(bs: any): Sale {
  return {
    id: bs.id,
    clientName: bs.customerName ?? "Client de Passage",
    clientId: bs.customerPhone ?? undefined,
    items: (bs.items ?? []).map((item: any) => ({
      productId: item.productId,
      productName: item.productName ?? "Article",
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
      discount: 0,
      taxRate: item.vatRate ?? 19.25,
      totalPrice: item.lineTotal ?? item.quantity * item.unitPrice,
    })),
    subTotal: bs.subtotal ?? bs.totalAmount,
    taxAmount: bs.totalVat ?? 0,
    discountAmount: 0,
    total: bs.totalAmount ?? 0,
    paymentMethod:
      bs.paymentMethod === "MOBILE_MONEY"
        ? "MOBILE"
        : (bs.paymentMethod ?? "CASH"),
    createdBy: bs.employeeName ?? "Opérateur",
    createdAt: bs.createdAt ?? new Date().toISOString(),
    status: bs.status ?? "COMPLETED",
  };
}

/**
 * Transforme un mouvement de stock backend en objet `StockMovement` frontend.
 * Normalise les types (`SALE_OUT` → `OUT`, `SUPPLIER_IN` → `IN`, reste → `INVENTORY`).
 */
function mapBackendMovementToFrontend(m: any): StockMovement {
  const typeMap: Record<string, StockMovement["type"]> = {
    SALE_OUT: "OUT",
    SUPPLIER_IN: "IN",
  };
  return {
    id: m.id ?? `mov-spring-${Date.now()}`,
    productId: m.productId,
    productName: m.productName ?? "Article",
    type: typeMap[m.type] ?? "INVENTORY",
    quantity: Math.abs(m.quantityChange),
    previousQuantity: m.quantityBefore,
    newQuantity: m.quantityAfter,
    reason: m.note ?? "Mouvement de stock enregistré",
    createdBy: m.performedBy ?? "Spring System",
    createdAt: m.createdAt ?? new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MODULES MÉTIER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit l'URL absolue vers le backend à partir de la config courante.
 * Appelé à l'intérieur de chaque méthode pour toujours lire l'URL la plus
 * récente (l'admin peut la changer à chaud depuis l'interface).
 */
function url(path: string): string {
  const { baseUrl } = getApiConfig();
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export const boutiqueApi = {
  // ── AUTHENTIFICATION ──────────────────────────────────────────────────────
  //
  // Les tokens (access + refresh) sont posés par Spring Boot en cookies
  // HttpOnly : le frontend ne les lit jamais.  Ces méthodes se contentent
  // d'envoyer les credentials et de lire les données métier de la réponse.

  auth: {
    /**
     * Connexion email/mot de passe.
     * Si twoFactorRequired === true, retourne un tempToken à utiliser pour /2fa/verify.
     * Sinon, retourne directement le user (cookies posés par le serveur).
     */
    async login(credentials: {
      email: string;
      password: string;
    }): Promise<LoginResponseDto> {
      const { data: envelope } = await axiosInstance.post<
        ApiEnvelope<LoginResponseDto>
      >(url("/auth/login"), credentials);
      return envelope.data; // ✅ respecte maintenant vraiment LoginResponseDto
    },
    /**
     * Validation du code OTP/TOTP avec le tempToken obtenu après login.
     * En cas de succès, les cookies de session sont posés par le serveur
     * et le profil utilisateur final est retourné.
     */
    async verify2FA(
      tempToken: string,
      code: string,
    ): Promise<LoginResponseDto> {
      const { data: envelope } = await axiosInstance.post<
        ApiEnvelope<LoginResponseDto>
      >(url("/auth/2fa/verify"), { tempToken, code });
      return envelope.data;
    },

    async logout() {
      try {
        await axiosInstance.post(url("/auth/logout"), {});
      } catch (err) {
        console.warn("Logout silencieux", err);
      }
    },

    async changePassword(passwords: {
      currentPassword: string;
      newPassword: string;
    }) {
      const { data: envelope } = await axiosInstance.post<ApiEnvelope<any>>(
        url("/auth/password/change"),
        passwords,
      );
      return envelope.data;
    },
  },

  // ── PRODUITS ──────────────────────────────────────────────────────────────

  products: {
    /** Récupère une page de produits et les mappe au format frontend. */
    async list(page = 0, size = 50): Promise<Product[]> {
      const { data: envelope } = await axiosInstance.get<ApiEnvelope<any>>(
        url(`/products?page=${page}&size=${size}`),
      );
      // envelope.data est l'objet de pagination Spring : { content, page, size, totalElements, ... }
      const content = envelope.data?.content ?? [];
      return (content as any[]).map(mapBackendProductToFrontend);
    },

    /** Récupère un produit par son identifiant. */
    async get(id: string): Promise<Product> {
      const { data: envelope } = await axiosInstance.get<ApiEnvelope<any>>(
        url(`/products/${id}`),
      );
      return mapBackendProductToFrontend(envelope.data);
    },

    /** Crée un nouveau produit. */
    async create(product: Partial<Product>): Promise<Product> {
      const { data: envelope } = await axiosInstance.post<ApiEnvelope<any>>(
        url("/products"),
        mapFrontendProductToBackend(product),
      );
      return mapBackendProductToFrontend(envelope.data);
    },

    /** Met à jour un produit existant. */
    async update(id: string, product: Partial<Product>): Promise<Product> {
      const { data: envelope } = await axiosInstance.put<ApiEnvelope<any>>(
        url(`/products/${id}`),
        mapFrontendProductToBackend(product),
      );
      return mapBackendProductToFrontend(envelope.data);
    },

    /** Supprime un produit (réponse 204 attendue, pas d'enveloppe à dépaqueter). */
    async delete(id: string): Promise<void> {
      await axiosInstance.delete(url(`/products/${id}`));
    },
  },

  // ── VENTES ────────────────────────────────────────────────────────────────

  sales: {
    /** Récupère une page de ventes triées par date décroissante. */
    async list(page = 0, size = 50): Promise<Sale[]> {
      const { data: envelope } = await axiosInstance.get<ApiEnvelope<any>>(
        url(`/sales?page=${page}&size=${size}&sort=createdAt,desc`),
      );
      const content = envelope.data?.content ?? [];
      return (content as any[]).map(mapBackendSaleToFrontend);
    },

    /**
     * Enregistre une vente complète depuis la caisse tactile (POS).
     * Le backend recalcule les totaux et déduit le stock.
     */
    async create(sale: Partial<Sale>): Promise<Sale> {
      const payload = {
        customerName: sale.clientName ?? "Client de Passage",
        customerPhone: sale.clientId ?? "",
        items: (sale.items ?? []).map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        // Normalise MOBILE → MOBILE_MONEY attendu par Spring Boot
        paymentMethod:
          sale.paymentMethod === "MOBILE"
            ? "MOBILE_MONEY"
            : (sale.paymentMethod ?? "CASH"),
        amountPaid: sale.total ?? 0,
      };
      const { data } = await axiosInstance.post(url("/sales"), payload);
      return mapBackendSaleToFrontend(data);
    },

    /** Annule une vente et restitue le stock. */
    async cancel(saleId: string, reason: string): Promise<void> {
      await axiosInstance.post(url(`/sales/${saleId}/cancel`), { reason });
    },
  },

  // ── FACTURES ──────────────────────────────────────────────────────────────

  invoices: {
    /**
     * Télécharge la facture PDF d'une vente sous forme de Blob.
     * `responseType: "blob"` demande à Axios de ne pas tenter de parser JSON.
     * Les cookies sont envoyés automatiquement via `withCredentials`.
     */
    async downloadPdf(invoiceId: string): Promise<Blob> {
      const { data } = await axiosInstance.get(
        url(`/invoices/${invoiceId}/pdf`),
        { responseType: "blob" },
      );
      return data as Blob;
    },
  },

  // ── TABLEAU DE BORD ───────────────────────────────────────────────────────

  dashboard: {
    /** KPIs globaux : CA, commandes, marge, etc. */
    async getSummary() {
      const { data } = await axiosInstance.get(url("/dashboard/summary"));
      return data;
    },

    /** Top produits du mois courant (limite à 10). */
    async getTopProducts() {
      const { data } = await axiosInstance.get(
        url("/dashboard/top-products?period=month&limit=10"),
      );
      return data;
    },

    /** Produits dont le stock est sous le seuil d'alerte. */
    async getStockAlerts() {
      const { data } = await axiosInstance.get(url("/dashboard/stock-alerts"));
      return data;
    },
  },

  // ── INVENTAIRE ────────────────────────────────────────────────────────────

  inventory: {
    /** Récupère l'historique des mouvements de stock et le mappe au format frontend. */
    async getMovements(): Promise<StockMovement[]> {
      const { data: envelope } = await axiosInstance.get<ApiEnvelope<any>>(
        url("/inventory/movements"),
      );
      const movements = envelope.data?.content ?? envelope.data ?? [];
      return (movements as any[]).map(mapBackendMovementToFrontend);
    },

    /**
     * Ajuste le stock d'un produit par delta (positif = entrée, négatif = sortie).
     * `note` est la raison affichée dans l'historique des mouvements.
     */
    async adjustStock(
      productId: string,
      quantityChange: number,
      note: string,
    ): Promise<void> {
      await axiosInstance.post(url("/inventory/adjust"), {
        productId,
        quantityChange,
        note,
      });
    },
  },

  // ── UTILISATEURS ─────────────────────────────────────────────────────────

  users: {
    /** Récupère la liste de tous les utilisateurs et la normalise. */
    async list(): Promise<User[]> {
      const { data: envelope } = await axiosInstance.get<ApiEnvelope<any[]>>(
        url("/users"),
      );
      return (envelope.data ?? []).map((bu) => ({
        id: bu.id,
        firstName: bu.firstName ?? "Sans",
        lastName: bu.lastName ?? "Nom",
        email: bu.email,
        username: bu.email.split("@")[0],
        role: bu.role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
        status: bu.active ? "ACTIVE" : "SUSPENDED",
        mfaEnabled: bu.twoFactorEnabled ?? false,
        createdAt: bu.createdAt ?? new Date().toISOString(),
      }));
    },

    /**
     * Invite un employé par email.
     * Spring Boot envoie un lien d'activation par email.
     */
    async inviteEmployee(email: string) {
      const { data } = await axiosInstance.post(url("/employees/invite"), {
        email,
      });
      return data;
    },

    /** Réactive un compte utilisateur suspendu. */
    async activateUser(id: string) {
      const { data } = await axiosInstance.put(url(`/users/${id}/activate`));
      return data;
    },

    /** Suspend un compte utilisateur actif. */
    async deactivateUser(id: string) {
      const { data } = await axiosInstance.put(url(`/users/${id}/deactivate`));
      return data;
    },
  },

  // ── CLIENTS ──────────────────────────────────────────────────────────────

  clients: {
    /** Récupère la liste des clients. */
    async list(): Promise<Client[]> {
      const { data: envelope } = await axiosInstance.get<ApiEnvelope<Client[]>>(
        url("/clients"),
      );
      return envelope.data;
    },

    /** Crée un nouveau client. */
    async create(client: Omit<Client, "id" | "createdAt">): Promise<Client> {
      const { data: envelope } = await axiosInstance.post<ApiEnvelope<Client>>(
        url("/clients"),
        client,
      );
      return envelope.data;
    },

    /** Met à jour un client existant. */
    async update(id: string, client: Partial<Client>): Promise<Client> {
      const { data: envelope } = await axiosInstance.put<ApiEnvelope<Client>>(
        url(`/clients/${id}`),
        client,
      );
      return envelope.data;
    },

    /** Supprime un client. */
    async delete(id: string): Promise<void> {
      await axiosInstance.delete(url(`/clients/${id}`));
    },
  },

  // ── FOURNISSEURS ────────────────────────────────────────────────────────

  suppliers: {
    /** Récupère la liste des fournisseurs. */
    async list(): Promise<Supplier[]> {
      const { data: envelope } = await axiosInstance.get<
        ApiEnvelope<Supplier[]>
      >(url("/suppliers"));
      return envelope.data;
    },

    /** Crée un nouveau fournisseur. */
    async create(
      supplier: Omit<Supplier, "id" | "createdAt">,
    ): Promise<Supplier> {
      const { data: envelope } = await axiosInstance.post<
        ApiEnvelope<Supplier>
      >(url("/suppliers"), supplier);
      return envelope.data;
    },

    /** Met à jour un fournisseur existant. */
    async update(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
      const { data: envelope } = await axiosInstance.put<ApiEnvelope<Supplier>>(
        url(`/suppliers/${id}`),
        supplier,
      );
      return envelope.data;
    },

    /** Supprime un fournisseur. */
    async delete(id: string): Promise<void> {
      await axiosInstance.delete(url(`/suppliers/${id}`));
    },
  },
};
