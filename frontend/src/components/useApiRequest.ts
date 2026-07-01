/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useApiRequest — Hook bas niveau pour toutes les requêtes HTTP (Axios).
 *
 * Stratégie :
 * - L'instance Axios est créée une seule fois ici (module-level singleton)
 *   et c'est CETTE instance qui est utilisée PARTOUT dans l'app (notamment
 *   importée par apiClient.ts) pour que l'intercepteur de refresh
 *   s'applique à toutes les requêtes sans exception.
 * - Les intercepteurs sont montés IMMÉDIATEMENT au chargement de ce module
 *   (voir mountInterceptors() en bas de fichier), et non plus à l'intérieur
 *   du hook React. C'est ce qui garantit qu'ils sont actifs dès la première
 *   requête, même si apiClient.ts importe axiosInstance sans jamais appeler
 *   useApiRequest() lui-même.
 * - Intercepteur de REQUÊTE : bloque toute requête sortante (sauf
 *   /auth/login et /auth/refresh) tant qu'un refresh est en cours, pour
 *   éviter qu'une rafale de requêtes parte en parallèle pendant la fenêtre
 *   de renouvellement du token.
 * - Intercepteur de RÉPONSE : gère le refresh sur 403.
 *     • Verrou `isRefreshing` → un seul appel refresh à la fois.
 *     • File `pendingQueue` → les requêtes déjà parties et tombées en 403
 *       attendent le nouveau cookie avant d'être rejouées.
 *     • Les endpoints auth (/auth/login, /auth/refresh) ne sont jamais
 *       relancés, pour éviter une boucle infinie.
 * - Si le refresh échoue : toutes les requêtes en attente sont rejetées, et
 *   `onRefreshFailed` est appelé pour déclencher la déconnexion côté UI
 *   (injecté depuis AppProvider pour éviter une dépendance circulaire).
 * - `requestJson<T>` : raccourci typé qui retourne directement la data.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { useCallback } from "react";
import { getApiConfig } from "../services/apiClient";

// ---------------------------------------------------------------------------
// Endpoints qui ne doivent JAMAIS être bloqués ni relancés via le refresh
// ---------------------------------------------------------------------------
const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh"];

function isAuthEndpoint(urlPath: string | undefined): boolean {
  if (!urlPath) return false;
  return AUTH_ENDPOINTS.some((e) => urlPath.includes(e));
}

// ---------------------------------------------------------------------------
// Singleton Axios — créé une seule fois au niveau du module.
// C'EST CETTE INSTANCE qui doit être importée par apiClient.ts (et tout
// autre module qui fait des appels réseau), afin que l'intercepteur de
// refresh s'applique uniformément à toute l'application.
// ---------------------------------------------------------------------------
export const axiosInstance: AxiosInstance = axios.create({
  // baseURL est injectée dynamiquement dans chaque requête via getApiConfig()
  withCredentials: true, // envoie les cookies HttpOnly à chaque requête
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------------
// Callback de déconnexion — injecté depuis AppProvider au démarrage de l'app,
// pour éviter un import circulaire (AppProvider importe apiClient/useApiRequest,
// donc ce fichier ne doit jamais importer AppProvider directement).
// ---------------------------------------------------------------------------
type RefreshFailedHandler = () => void;

let onRefreshFailedHandler: RefreshFailedHandler | null = null;

/**
 * À appeler une seule fois au démarrage de l'app (ex: dans AppProvider,
 * via un useEffect au montage) pour brancher la déconnexion automatique
 * en cas d'échec du refresh token.
 */
export function setOnRefreshFailed(handler: RefreshFailedHandler): void {
  onRefreshFailedHandler = handler;
}

// ---------------------------------------------------------------------------
// Types internes pour la file d'attente des requêtes déjà en échec (403)
// ---------------------------------------------------------------------------
type QueueItem = {
  config: InternalAxiosRequestConfig & { _retry?: boolean };
  resolve: (response: AxiosResponse) => void;
  reject: (err: unknown) => void;
};

// ---------------------------------------------------------------------------
// État partagé du refresh (module-level pour ne pas être recréé à chaque render)
// ---------------------------------------------------------------------------
let isRefreshing = false;

/** Requêtes qui ont déjà échoué en 403 et attendent le résultat du refresh. */
const pendingQueue: QueueItem[] = [];

/** Fonctions de rejet pour les requêtes bloquées préventivement par l'intercepteur de requête. */
const blockedRequestRejectors: Array<(err: unknown) => void> = [];

/** Résolveurs pour les requêtes bloquées préventivement, à relâcher une fois le refresh terminé. */
let waitingResolvers: Array<() => void> = [];

function flushPendingQueue(error: unknown): void {
  while (pendingQueue.length > 0) {
    const item = pendingQueue.shift()!;
    if (error) {
      item.reject(error);
    } else {
      item.config._retry = true;
      axiosInstance(item.config).then(item.resolve).catch(item.reject);
    }
  }
}

function flushBlockedRequests(error: unknown): void {
  while (blockedRequestRejectors.length > 0) {
    const reject = blockedRequestRejectors.shift()!;
    if (error) {
      reject(error);
    }
    // Si pas d'erreur, on ne fait rien ici : resolveWaitingRequests() s'en
    // charge séparément, en résolvant chaque promesse côté intercepteur
    // de requête avec la config d'origine.
  }
}

function resolveWaitingRequests(): void {
  waitingResolvers.forEach((resolve) => resolve());
  waitingResolvers = [];
}

function rejectWaitingRequests(): void {
  // Les rejets effectifs sont déjà déclenchés par flushBlockedRequests().
  // On vide juste la liste des résolveurs en attente côté succès.
  waitingResolvers = [];
}

// ---------------------------------------------------------------------------
// Déclenche le refresh, une seule fois, peu importe combien de requêtes
// échouent ou sont bloquées en même temps.
// ---------------------------------------------------------------------------
async function performRefresh(): Promise<void> {
  isRefreshing = true;
  try {
    const config = getApiConfig();
    await axiosInstance.post(
      `${config.baseUrl.replace(/\/$/, "")}/auth/refresh`,
      {},
    );

    // Refresh réussi → on libère tout le monde
    flushPendingQueue(null);
    flushBlockedRequests(null);
    resolveWaitingRequests();
  } catch (refreshError) {
    // Refresh échoué → on rejette tout le monde et on déclenche la déconnexion
    flushPendingQueue(refreshError);
    flushBlockedRequests(refreshError);
    rejectWaitingRequests();

    if (onRefreshFailedHandler) {
      onRefreshFailedHandler();
    }
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

// ---------------------------------------------------------------------------
// Intercepteurs — montés une seule fois, AU CHARGEMENT DU MODULE.
//
// apiClient.ts importe `axiosInstance` directement sans jamais appeler
// useApiRequest(). Si le montage dépendait du hook React, il pourrait ne
// jamais avoir lieu, ou avoir lieu trop tard, selon quels composants sont
// montés et dans quel ordre. On garantit donc l'activation dès l'évaluation
// de ce module, qui se produit automatiquement à la première ligne
// `import ... from "useApiRequest"` exécutée n'importe où dans l'app —
// y compris depuis apiClient.ts lui-même.
// ---------------------------------------------------------------------------
let interceptorsMounted = false;

function mountInterceptors(): void {
  if (interceptorsMounted) return;
  interceptorsMounted = true;

  // --- Intercepteur de REQUÊTE ---
  // Bloque toute requête sortante (sauf /auth/login et /auth/refresh)
  // tant qu'un refresh est en cours.
  axiosInstance.interceptors.request.use(
    (config) => {
      if (isAuthEndpoint(config.url) || !isRefreshing) {
        return config;
      }

      return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
        waitingResolvers.push(() => resolve(config));
        blockedRequestRejectors.push(reject);
      });
    },
    (error) => Promise.reject(error),
  );

  // --- Intercepteur de RÉPONSE ---
  // Gère le déclenchement et la mise en file lors d'un 403.
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,

    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      const status = error.response?.status;

      // Pas un 401, ou déjà réessayé, ou endpoint auth → on propage l'erreur
      // 401 = non authentifié (token expiré) → on tente le refresh
      // 403 = authentifié mais accès refusé (mauvais rôle) → on ne tente PAS le refresh
      if (
        status !== 401 ||
        originalRequest?._retry ||
        isAuthEndpoint(originalRequest?.url)
      ) {
        return Promise.reject(error);
      }

      // --- Premier 403 détecté sur cette requête ---
      if (isRefreshing) {
        // Un refresh est déjà en cours : on s'enfile et on attend le résultat
        return new Promise<AxiosResponse>((resolve, reject) => {
          pendingQueue.push({ config: originalRequest, resolve, reject });
        });
      }

      // On est le déclencheur : on lance le refresh pour tout le monde
      try {
        await performRefresh();
        // Refresh réussi → on rejoue la requête d'origine
        originalRequest._retry = true;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    },
  );
}

// Montage immédiat, exécuté une seule fois à l'import de ce module.
mountInterceptors();

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------
export interface ApiRequestOptions extends AxiosRequestConfig {
  /** Réservé pour usage futur : court-circuiter le refresh même sur 403. */
  skipRefresh?: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useApiRequest() {
  const request = useCallback(
    async <T = unknown>(
      path: string,
      options: ApiRequestOptions = {},
    ): Promise<AxiosResponse<T>> => {
      const { skipRefresh: _skip, ...axiosOptions } = options;
      const config = getApiConfig();

      return axiosInstance.request<T>({
        url: `${config.baseUrl.replace(/\/$/, "")}${path}`,
        ...axiosOptions,
      });
    },
    [],
  );

  const requestJson = useCallback(
    async <T = unknown>(
      path: string,
      options: ApiRequestOptions = {},
    ): Promise<T> => {
      const response = await request<T>(path, options);
      return response.data;
    },
    [request],
  );

  return {
    request,
    requestJson,
    axiosInstance,
  };
}
