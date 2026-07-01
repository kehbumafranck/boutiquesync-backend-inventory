/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API backend (ex: https://api.mondomaine.com/api) */
  readonly VITE_API_URL?: string;
  /** Désactiver le HMR en mode agent */
  readonly DISABLE_HMR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
