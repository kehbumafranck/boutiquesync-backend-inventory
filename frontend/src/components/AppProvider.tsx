/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppProvider — Gestion centralisée de l'état et de la logique métier.
 *
 * Responsabilités :
 *  - Maintenir l'état global de l'application (produits, ventes, users…).
 *  - Charger l'état initial depuis le backend Spring Boot au démarrage.
 *  - Déléguer toutes les requêtes réseau à `boutiqueApi` (apiClient.ts),
 *    qui utilise l'instance Axios partagée avec cookies HttpOnly +
 *    intercepteur de refresh automatique (useApiRequest.ts).
 *  - Exposer les handlers métier aux composants enfants via AppContext.
 *
 * Ce qui N'est PAS ici :
 *  - Logique réseau (Axios, headers, tokens) → apiClient.ts + useApiRequest.ts
 *  - Mapping backend ↔ frontend → apiClient.ts
 *  - Redirection après déconnexion (gérée par AppRouter via currentUser)
 *  - Données mockées : l'application fonctionne exclusivement contre le
 *    backend réel, il n'existe plus de mode hors-ligne / sandbox.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getApiConfig,
  saveApiConfig,
  boutiqueApi,
  ApiConfig,
} from "../services/apiClient";
import {
  Product,
  Client,
  Supplier,
  User,
  Sale,
  StockMovement,
  FinancialEntry,
  AuditLog,
  SecurityEvent,
  Notification,
  ConnectedDevice,
  DashboardSummaryDto,
} from "../types";
import { setOnRefreshFailed } from "./useApiRequest";

// ─────────────────────────────────────────────────────────────────────────
// TYPES AUDIT & SÉCURITÉ PARTAGÉS
// ─────────────────────────────────────────────────────────────────────────

export type AuditModule =
  | "AUTH"
  | "SECURITY"
  | "PRODUCTS"
  | "STOCK"
  | "FINANCE"
  | "POS"
  | "CLIENTS"
  | "SUPPLIERS"
  | "ADMIN";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "MFA_TRIGGERED"
  | "MFA_FAILED"
  | "MFA_SUCCESS"
  | "USER_SUSPENDED"
  | "MFA_ENFORCED"
  | "SESSION_REVOKED";

export type SecurityEventStatus = "SUCCESS" | "FAILURE" | "ALERT";

export type AddAuditLogFn = (
  action: string,
  module: AuditModule,
  performedBy: string,
  details: string,
  severity: AuditSeverity,
) => void;

export type AddSecurityEventFn = (
  eventType: SecurityEventType,
  userEmail: string,
  details: string,
  status: SecurityEventStatus,
) => void;

// ─────────────────────────────────────────────────────────────────────────
// TYPES D'ÉTAT
// ─────────────────────────────────────────────────────────────────────────

interface AppState {
  products: Product[];
  clients: Client[];
  suppliers: Supplier[];
  users: User[];
  sales: Sale[];
  stockMovements: StockMovement[];
  financialEntries: FinancialEntry[];
  auditLogs: AuditLog[];
  securityEvents: SecurityEvent[];
  notifications: Notification[];
  devices: ConnectedDevice[];
  globalMfaEnforced: boolean;
  /** KPIs du dashboard calculés côté backend sur toute la base de données */
  dashboardSummary: DashboardSummaryDto | null;
}

/** État initial vide : toutes les données réelles viennent du backend. */
const EMPTY_APP_STATE: AppState = {
  products: [],
  clients: [],
  suppliers: [],
  users: [],
  sales: [],
  stockMovements: [],
  financialEntries: [],
  auditLogs: [],
  securityEvents: [],
  notifications: [],
  devices: [],
  globalMfaEnforced: false,
  dashboardSummary: null,
};

interface AppContextType {
  appState: AppState;
  currentUser: User | null;
  apiConfig: ApiConfig;
  isLoadingInitialData: boolean;

  handleLoginSuccess: (user: User) => void;
  handleLogout: () => void;

  handleUpdateApiConfig: (newConfig: Partial<ApiConfig>) => void;

  handleAddAuditLog: AddAuditLogFn;
  handleAddSecurityEvent: AddSecurityEventFn;

  handleAddProduct: (
    payload: Omit<Product, "id" | "createdAt">,
  ) => Promise<void>;
  handleUpdateProduct: (updated: Product) => Promise<void>;
  handleDeleteProduct: (id: string) => Promise<void>;

  handleAddStockMovement: (
    payload: Omit<StockMovement, "id" | "createdAt">,
  ) => Promise<void>;

  handleAddSale: (completedSale: Sale) => Promise<void>;
  handleCancelSale: (
    saleId: string,
    updatedProducts: Product[],
  ) => Promise<void>;
  handleUpdateProductQuantities: (updatedProducts: Product[]) => void;

  handleAddClient: (payload: Omit<Client, "id" | "createdAt">) => Promise<void>;
  handleUpdateClient: (updated: Client) => Promise<void>;
  handleDeleteClient: (id: string) => Promise<void>;

  handleAddSupplier: (
    payload: Omit<Supplier, "id" | "createdAt">,
  ) => Promise<void>;
  handleUpdateSupplier: (updated: Supplier) => Promise<void>;
  handleDeleteSupplier: (id: string) => Promise<void>;

  handleAddNewExpense: (payload: Omit<FinancialEntry, "id">) => void;

  handleInviteUser: (email: string) => void;
  handleUpdateUser: (updated: User) => void;
  handleDeleteUser: (id: string) => void;

  handleTerminateSession: (id: string) => void;

  handleMarkNotifRead: (id: string) => void;
  handleClearNotifications: () => void;

  handleSelfMfaToggle: () => void;
  handleUpdateCurrentUser: (updatedFields: Partial<User>) => void;

  currentUserFullName: string;
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────

/** Génère une entrée financière REVENUE pour une vente POS. */
function makeSaleRevenueEntry(sale: Sale): FinancialEntry {
  return {
    id: `fin-pos-${sale.id}`,
    date: new Date().toISOString().substring(0, 10),
    type: "REVENUE",
    category: "Ventes POS",
    description: `Vente de caisse #${sale.id} (${sale.clientName})`,
    amount: sale.total,
    createdBy: sale.createdBy,
  };
}

/** Génère une entrée financière EXPENSE pour une annulation de vente. */
function makeSaleCancelEntry(
  saleId: string,
  amount: number,
  operatorName: string,
): FinancialEntry {
  return {
    id: `fin-pos-void-${saleId}`,
    date: new Date().toISOString().substring(0, 10),
    type: "EXPENSE",
    category: "Ventes POS",
    description: `Annulation de la vente #${saleId}`,
    amount,
    createdBy: operatorName,
  };
}

const STORAGE_KEYS = {
  CURRENT_USER: "nexus_current_user",
} as const;

// ─────────────────────────────────────────────────────────────────────────
// CONTEXTE
// ─────────────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(EMPTY_APP_STATE);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [apiConfig, setApiConfigState] = useState<ApiConfig>(() =>
    getApiConfig(),
  );

  // ── Persistance du currentUser ──────────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify(currentUser),
      );
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  // ── Déconnexion automatique si le refresh token échoue ─────────────────
  // La redirection vers /login n'est pas gérée ici : AppRouter réagit déjà
  // à currentUser === null et redirige automatiquement.
  useEffect(() => {
    setOnRefreshFailed(() => {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      setCurrentUser(null);
    });
  }, []);

  // ── Mise à jour de la config API (URL backend) ──────────────────────────
  const handleUpdateApiConfig = useCallback((newConfig: Partial<ApiConfig>) => {
    saveApiConfig(newConfig);
    setApiConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []);

  // ── Chargement initial des données depuis Spring Boot ──────────────────
  // Ne se lance qu'une fois authentifié, puisque toutes les routes backend
  // nécessitent une session valide (cookies HttpOnly).
  useEffect(() => {
    if (!currentUser) return;

    const loadInitialData = async () => {
      setIsLoadingInitialData(true);

      let products: Product[] = [];
      try {
        products = await boutiqueApi.products.list(0, 50);
      } catch (err) {
        console.error("[AppProvider] Impossible de charger les produits.", err);
      }

      let sales: Sale[] = [];
      try {
        // ADMIN : toutes les ventes | EMPLOYEE : seulement ses ventes
        if (currentUser?.role === "ADMIN") {
          sales = await boutiqueApi.sales.list(0, 200);
        } else {
          sales = await boutiqueApi.sales.listMine(0, 200);
        }
      } catch (err) {
        console.error("[AppProvider] Impossible de charger les ventes.", err);
      }

      let clients: Client[] = [];
      // TODO: ClientController n'existe pas encore dans le backend
      // try {
      //   clients = await boutiqueApi.clients.list();
      // } catch (err) {
      //   console.error("[AppProvider] Impossible de charger les clients.", err);
      // }

      let suppliers: Supplier[] = [];
      // TODO: SupplierController n'existe pas encore dans le backend
      // try {
      //   suppliers = await boutiqueApi.suppliers.list();
      // } catch (err) {
      //   console.error("[AppProvider] Impossible de charger les fournisseurs.", err);
      // }

      let users: User[] = [];
      try {
        users = await boutiqueApi.users.list();
      } catch (err) {
        console.warn(
          "[AppProvider] Impossible de charger les utilisateurs.",
          err,
        );
      }

      let stockMovements: StockMovement[] = [];
      // Mouvements de stock réservés à l'ADMIN
      if (currentUser?.role === "ADMIN") {
        try {
          stockMovements = await boutiqueApi.inventory.getMovements();
        } catch (err) {
          console.warn(
            "[AppProvider] Impossible de charger les mouvements de stock.",
            err,
          );
        }
      }

      // Dashboard summary — métriques calculées sur toute la BD côté backend
      let dashboardSummary: DashboardSummaryDto | null = null;
      if (currentUser?.role === "ADMIN") {
        try {
          dashboardSummary = await boutiqueApi.dashboard.getSummary();
        } catch (err) {
          console.warn("[AppProvider] Impossible de charger le dashboard summary.", err);
        }
      }

      // Journal d'audit — chargé depuis MongoDB (rétention 5 ans)
      let auditLogs: AuditLog[] = [];
      if (currentUser?.role === "ADMIN") {
        try {
          const rawLogs = await boutiqueApi.auditLogs.list(0, 100);
          auditLogs = rawLogs as AuditLog[];
        } catch (err) {
          console.warn("[AppProvider] Impossible de charger les logs d'audit.", err);
        }
      }

      setAppState((prev) => ({
        ...prev,
        products,
        sales,
        clients,
        suppliers,
        users,
        stockMovements,
        dashboardSummary,
        auditLogs,
      }));

      setIsLoadingInitialData(false);
    };

    loadInitialData();
  }, [currentUser, apiConfig.baseUrl]);

  // ── Polling dashboard toutes les 30 secondes ────────────────────────────
  // Pour ADMIN : rafraîchit le summary (KPIs backend)
  // Pour EMPLOYEE : rafraîchit la liste des ventes (pour que le dashboard reste à jour)
  useEffect(() => {
    if (!currentUser) return;

    const refreshData = async () => {
      try {
        if (currentUser.role === "ADMIN") {
          const dashboardSummary = await boutiqueApi.dashboard.getSummary();
          setAppState((prev) => ({ ...prev, dashboardSummary }));
        } else {
          // Employé : recharger ses ventes pour que les métriques soient à jour
          const sales = await boutiqueApi.sales.listMine(0, 200);
          setAppState((prev) => ({ ...prev, sales }));
        }
      } catch {
        // silencieux
      }
    };

    const intervalId = setInterval(refreshData, 30_000);
    return () => clearInterval(intervalId);
  }, [currentUser]);
  // ── Moteur d'alertes stock automatiques ─────────────────────────────────
  useEffect(() => {
    const newAlerts: Notification[] = [];

    appState.products.forEach((p) => {
      if (p.quantity === 0) {
        const id = `not-rupture-${p.id}`;
        if (!appState.notifications.some((n) => n.id === id)) {
          newAlerts.push({
            id,
            title: "⚠️ Rupture de Stock Critique",
            description: `L'article "${p.name}" (${p.reference}) est en rupture totale de stock.`,
            type: "CRITICAL",
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (p.quantity <= p.alertThreshold) {
        const id = `not-low-${p.id}`;
        if (!appState.notifications.some((n) => n.id === id)) {
          newAlerts.push({
            id,
            title: "🔔 Niveau de Stock Faible",
            description: `Le stock restant de "${p.name}" (${p.quantity} pces) est inférieur au seuil d'alerte.`,
            type: "WARNING",
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setAppState((prev) => ({
        ...prev,
        notifications: [...newAlerts, ...prev.notifications],
      }));
    }
  }, [appState.products]);

  // ─────────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────────

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    if (currentUser) {
      handleAddAuditLog(
        "Fermeture de session",
        "AUTH",
        `${currentUser.firstName} ${currentUser.lastName}`,
        "Fermeture de session utilisateur sécurisée",
        "INFO",
      );
      boutiqueApi.auth.logout().catch(console.warn);
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setCurrentUser(null);
    setAppState(EMPTY_APP_STATE);
  }, [currentUser]);

  // ─────────────────────────────────────────────────────────────────────
  // AUDIT & SÉCURITÉ
  // ─────────────────────────────────────────────────────────────────────

  const handleAddAuditLog = useCallback(
    (
      action: string,
      module: AuditModule,
      performedBy: string,
      details: string,
      severity: AuditSeverity,
    ) => {
      const log: AuditLog = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        action,
        module,
        performedBy,
        details,
        severity,
      };
      setAppState((prev) => ({ ...prev, auditLogs: [...prev.auditLogs, log] }));
    },
    [],
  );

  const handleAddSecurityEvent = useCallback(
    (
      eventType: SecurityEventType,
      userEmail: string,
      details: string,
      status: SecurityEventStatus,
    ) => {
      const ev: SecurityEvent = {
        id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        eventType,
        userEmail,
        ip: "193.125.10.200",
        device: "Navigateur Client SaaS Interface",
        location: "Yaoundé, CM",
        details,
        status,
      };
      setAppState((prev) => ({
        ...prev,
        securityEvents: [ev, ...prev.securityEvents],
      }));
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────
  // PRODUITS
  // ─────────────────────────────────────────────────────────────────────

  const handleAddProduct = useCallback(
    async (payload: Omit<Product, "id" | "createdAt">) => {
      const created = await boutiqueApi.products.create(payload);
      setAppState((prev) => ({
        ...prev,
        products: [...prev.products, created],
      }));
    },
    [],
  );

  const handleUpdateProduct = useCallback(async (updated: Product) => {
    const saved = await boutiqueApi.products.update(updated.id, updated);
    // Recharger tous les produits depuis le backend pour avoir les données fraîches
    // (le backend peut avoir recalculé des champs, notamment currentStock)
    try {
      const products = await boutiqueApi.products.list(0, 200);
      setAppState((prev) => ({ ...prev, products }));
    } catch {
      // Fallback : mise à jour locale uniquement
      setAppState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === updated.id ? saved : p)),
      }));
    }
  }, []);

  const handleDeleteProduct = useCallback(async (id: string) => {
    await boutiqueApi.products.delete(id);
    setAppState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // STOCK
  // ─────────────────────────────────────────────────────────────────────

  const handleAddStockMovement = useCallback(
    async (payload: Omit<StockMovement, "id" | "createdAt">) => {
      try {
        // Le backend attend la nouvelle quantité absolue (pas un delta)
        await boutiqueApi.inventory.adjustStock(
          payload.productId,
          payload.newQuantity,
          payload.reason,
        );

        // Rafraîchir immédiatement les produits et mouvements depuis le backend
        const [products, stockMovements] = await Promise.all([
          boutiqueApi.products.list(0, 200), // taille plus grande pour tout récupérer
          boutiqueApi.inventory.getMovements(),
        ]);

        setAppState((prev) => ({ ...prev, products, stockMovements }));

        // Rafraîchir le summary dashboard (alertes stock, marge)
        try {
          const dashboardSummary = await boutiqueApi.dashboard.getSummary();
          setAppState((prev) => ({ ...prev, dashboardSummary }));
        } catch { /* silencieux */ }
      } catch (err: any) {
        alert(err?.response?.data?.message || err.message || "Échec de l'ajustement de stock.");
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────
  // VENTES
  // ─────────────────────────────────────────────────────────────────────

  const handleAddSale = useCallback(async (completedSale: Sale) => {
    try {
      const created = await boutiqueApi.sales.create(completedSale);

      // Recharger les produits ET les ventes depuis le backend immédiatement
      const [products, sales] = await Promise.all([
        boutiqueApi.products.list(0, 200),
        // ADMIN voit toutes les ventes, EMPLOYEE voit seulement les siennes
        currentUser?.role === "ADMIN"
          ? boutiqueApi.sales.list(0, 200)
          : boutiqueApi.sales.listMine(0, 200),
      ]);

      // Rafraîchir le summary dashboard après chaque vente
      let dashboardSummary: DashboardSummaryDto | null = null;
      try {
        dashboardSummary = await boutiqueApi.dashboard.getSummary();
      } catch { /* silencieux */ }

      setAppState((prev) => ({
        ...prev,
        products,
        sales,  // ← liste fraîche incluant la nouvelle vente avec le bon createdBy
        dashboardSummary: dashboardSummary ?? prev.dashboardSummary,
        financialEntries: [
          ...prev.financialEntries,
          makeSaleRevenueEntry(created),
        ],
      }));
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || "Échec de création de la vente.");
    }
  }, []);

  const handleCancelSale = useCallback(
    async (saleId: string) => {
      const operatorName = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : "System";

      try {
        await boutiqueApi.sales.cancel(
          saleId,
          "Annulation par l'opérateur de caisse",
        );
        const products = await boutiqueApi.products.list(0, 50);

        setAppState((prev) => ({
          ...prev,
          products,
          sales: prev.sales.map((s) =>
            s.id === saleId ? { ...s, status: "CANCELLED" } : s,
          ),
          financialEntries: [
            ...prev.financialEntries,
            makeSaleCancelEntry(
              saleId,
              prev.sales.find((s) => s.id === saleId)?.total ?? 0,
              operatorName,
            ),
          ],
        }));

        // Rafraîchir le summary dashboard après annulation
        try {
          const dashboardSummary = await boutiqueApi.dashboard.getSummary();
          setAppState((prev) => ({ ...prev, dashboardSummary }));
        } catch { /* silencieux */ }
      } catch (err: any) {
        alert(err.message || "Échec d'annulation de la vente.");
      }
    },
    [currentUser],
  );

  const handleUpdateProductQuantities = useCallback(
    (updatedProducts: Product[]) => {
      setAppState((prev) => ({ ...prev, products: updatedProducts }));
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────
  // CLIENTS
  // ─────────────────────────────────────────────────────────────────────

  const handleAddClient = useCallback(
    async (payload: Omit<Client, "id" | "createdAt">) => {
      try {
        const created = await boutiqueApi.clients.create(payload);
        setAppState((prev) => ({
          ...prev,
          clients: [...prev.clients, created],
        }));
      } catch (err: any) {
        alert(err.message || "Échec de création du client.");
      }
    },
    [],
  );

  const handleUpdateClient = useCallback(async (updated: Client) => {
    try {
      const saved = await boutiqueApi.clients.update(updated.id, updated);
      setAppState((prev) => ({
        ...prev,
        clients: prev.clients.map((c) => (c.id === updated.id ? saved : c)),
      }));
    } catch (err: any) {
      alert(err.message || "Échec de modification du client.");
    }
  }, []);

  const handleDeleteClient = useCallback(async (id: string) => {
    try {
      await boutiqueApi.clients.delete(id);
      setAppState((prev) => ({
        ...prev,
        clients: prev.clients.filter((c) => c.id !== id),
      }));
    } catch (err: any) {
      alert(err.message || "Échec de suppression du client.");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // FOURNISSEURS
  // ─────────────────────────────────────────────────────────────────────

  const handleAddSupplier = useCallback(
    async (payload: Omit<Supplier, "id" | "createdAt">) => {
      try {
        const created = await boutiqueApi.suppliers.create(payload);
        setAppState((prev) => ({
          ...prev,
          suppliers: [...prev.suppliers, created],
        }));
      } catch (err: any) {
        alert(err.message || "Échec de création du fournisseur.");
      }
    },
    [],
  );

  const handleUpdateSupplier = useCallback(async (updated: Supplier) => {
    try {
      const saved = await boutiqueApi.suppliers.update(updated.id, updated);
      setAppState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) => (s.id === updated.id ? saved : s)),
      }));
    } catch (err: any) {
      alert(err.message || "Échec de modification du fournisseur.");
    }
  }, []);

  const handleDeleteSupplier = useCallback(async (id: string) => {
    try {
      await boutiqueApi.suppliers.delete(id);
      setAppState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.filter((s) => s.id !== id),
      }));
    } catch (err: any) {
      alert(err.message || "Échec de suppression du fournisseur.");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // FINANCE (pas encore d'endpoint backend dédié)
  // ─────────────────────────────────────────────────────────────────────

  const handleAddNewExpense = useCallback(
    (payload: Omit<FinancialEntry, "id">) => {
      const entry: FinancialEntry = { ...payload, id: `fin-man-${Date.now()}` };
      setAppState((prev) => ({
        ...prev,
        financialEntries: [...prev.financialEntries, entry],
      }));
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────
  // UTILISATEURS
  // ─────────────────────────────────────────────────────────────────────

  const handleInviteUser = useCallback(async (email: string) => {
    try {
      await boutiqueApi.users.inviteEmployee(email);
      // Ne pas recharger la liste immédiatement — ça causerait un re-render
      // qui réinitialiserait le formulaire d'invitation.
      // La liste se mettra à jour au prochain rechargement ou manuellement.
    } catch (err: any) {
      alert(err?.response?.data?.message || "Échec de l'invitation.");
    }
  }, []);

  const handleUpdateUser = useCallback((updated: User) => {
    setAppState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
    }));
  }, []);

  const handleDeleteUser = useCallback((id: string) => {
    setAppState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // SESSIONS / APPAREILS
  // ─────────────────────────────────────────────────────────────────────

  const handleTerminateSession = useCallback((id: string) => {
    setAppState((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== id),
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────────

  const handleMarkNotifRead = useCallback((id: string) => {
    setAppState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
  }, []);

  const handleClearNotifications = useCallback(() => {
    setAppState((prev) => ({ ...prev, notifications: [] }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // PROFIL DE L'OPÉRATEUR CONNECTÉ
  // ─────────────────────────────────────────────────────────────────────

  const handleSelfMfaToggle = useCallback(() => {
    if (!currentUser) return;
    const nextMfa = !currentUser.mfaEnabled;
    const updated: User = { ...currentUser, mfaEnabled: nextMfa };

    setCurrentUser(updated);
    setAppState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updated : u)),
    }));

    handleAddAuditLog(
      "MFA Profil modifié",
      "SECURITY",
      `${currentUser.firstName} ${currentUser.lastName}`,
      `Authentification forte MFA ${nextMfa ? "enclenchée" : "débrayée"} par l'opérateur`,
      "INFO",
    );

    alert(`MFA configuré sur : ${nextMfa ? "ACTIF" : "INACTIF"}`);
  }, [currentUser, handleAddAuditLog]);

  const handleUpdateCurrentUser = useCallback(
    (updatedFields: Partial<User>) => {
      if (!currentUser) return;
      const updated = { ...currentUser, ...updatedFields } as User;
      setCurrentUser(updated);
      handleUpdateUser(updated);
    },
    [currentUser, handleUpdateUser],
  );

  // ─────────────────────────────────────────────────────────────────────
  // VALEUR EXPOSÉE AU CONTEXTE
  // ─────────────────────────────────────────────────────────────────────

  const currentUserFullName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : "Démonstrateur";

  const value: AppContextType = {
    appState,
    currentUser,
    apiConfig,
    isLoadingInitialData,
    handleLoginSuccess,
    handleLogout,
    handleUpdateApiConfig,
    handleAddAuditLog,
    handleAddSecurityEvent,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddStockMovement,
    handleAddSale,
    handleCancelSale,
    handleUpdateProductQuantities,
    handleAddClient,
    handleUpdateClient,
    handleDeleteClient,
    handleAddSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,
    handleAddNewExpense,
    handleInviteUser,
    handleUpdateUser,
    handleDeleteUser,
    handleTerminateSession,
    handleMarkNotifRead,
    handleClearNotifications,
    handleSelfMfaToggle,
    handleUpdateCurrentUser,
    currentUserFullName,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────
// HOOK D'ACCÈS AU CONTEXTE
// ─────────────────────────────────────────────────────────────────────────

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
