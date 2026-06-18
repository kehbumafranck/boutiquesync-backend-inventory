/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * navigationRef — Pont entre le code hors-React (intercepteurs Axios,
 * utilitaires) et React Router.
 *
 * Pourquoi ce fichier existe :
 * `useNavigate()` ne fonctionne que dans un composant rendu SOUS <Router>.
 * Ici, AppProvider englobe le Router (donc ne peut pas l'utiliser), et
 * useApiRequest.ts est un module hors-composant. On expose donc une
 * référence mutable, branchée une seule fois par un petit composant
 * monté à l'intérieur du Router.
 */

import type { NavigateFunction } from "react-router-dom";

let navigateRef: NavigateFunction | null = null;

/** Appelé une seule fois par <NavigationBridge> au montage. */
export function setNavigateRef(fn: NavigateFunction): void {
  navigateRef = fn;
}

/** Utilisé par le code hors-composant (intercepteurs, etc.) pour naviguer. */
export function navigateTo(path: string): void {
  if (navigateRef) {
    navigateRef(path, { replace: true });
  } else {
    // Filet de sécurité si le bridge n'est pas encore monté.
    window.location.href = path;
  }
}
