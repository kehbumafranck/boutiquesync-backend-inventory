/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  reference: string; // conservé côté frontend uniquement (le backend n'a pas ce champ)
  barcode: string;
  purchasePrice: number;
  sellingPrice: number;
  vatRate: number;
  quantity: number; // correspond à currentStock côté backend
  alertThreshold: number;
  unit: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: "IN" | "OUT" | "ADJUSTMENT_ADD" | "ADJUSTMENT_SUB" | "INVENTORY";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyPoints: number;
  createdAt: string;
  totalSpent?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage
  taxRate: number; // percentage
  totalPrice: number;
}

export interface Sale {
  id: string;
  clientName: string;
  clientId?: string;
  items: SaleItem[];
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "MOBILE";
  createdBy: string;
  createdAt: string;
  status: "COMPLETED" | "CANCELLED";
}

export type UserRole = "ADMIN" | "EMPLOYEE";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  mfaEnabled: boolean;
  lastLogin?: string;
  imageUrl?: string;
  password?: string;
  createdAt: string;
}

export interface ConnectedDevice {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  module:
    | "AUTH"
    | "SECURITY"
    | "PRODUCTS"
    | "STOCK"
    | "SALES"
    | "FINANCE"
    | "POS"
    | "CLIENTS"
    | "SUPPLIERS"
    | "ADMIN";
  performedBy: string;
  details: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "MFA_TRIGGERED"
    | "MFA_FAILED"
    | "MFA_SUCCESS"
    | "USER_SUSPENDED"
    | "MFA_ENFORCED"
    | "SESSION_REVOKED";
  userEmail: string;
  ip: string;
  device: string;
  location: string;
  details: string;
  status: "SUCCESS" | "FAILURE" | "ALERT";
}

export interface FinancialEntry {
  id: string;
  date: string;
  type: "REVENUE" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
  referenceId?: string; // saleId, stock purchase order, etc.
  createdBy: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS";
  read: boolean;
  createdAt: string;
}

// ─── Réponses backend pour l'auth ────────────────────────────────────────

/** Profil utilisateur minimal retourné par /auth/login et /auth/2fa/verify. */
export interface AuthUserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

/** Réponse de POST /auth/login — correspond à LoginResponse.toSafeResponse() côté Spring. */
export interface LoginResponseDto {
  tempToken: string | null;
  twoFactorRequired: boolean;
  method: string | null; // "TOTP" | "EMAIL_OTP"
  user: AuthUserInfo | null; // null si twoFactorRequired === true
}
/**
 * Enveloppe générique renvoyée par toutes les routes Spring Boot.
 * Le payload métier réel est toujours dans `data`.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}