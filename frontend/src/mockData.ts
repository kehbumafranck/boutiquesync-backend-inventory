/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Client, Supplier, User, Sale, StockMovement, FinancialEntry, AuditLog, SecurityEvent, Notification, ConnectedDevice } from './types';

// Static categories represent what a typical French SME deals with
export const CATEGORIES = [
  'Électronique',
  'Alimentation & Boissons',
  'Santé & Pharmacie',
  'Mode & Textile',
  'Bureautique & Mobilier',
  'Services & Consommables'
];

interface InitialState {
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
}

const INITIAL_STATE: InitialState = {
  products: [
    {
      id: "prod-1",
      name: "Ordinateur Portable UltraBook Pro",
      reference: "LAP-8796-PRO",
      barcode: "3600524321650",
      category: "Électronique",
      purchasePrice: 650,
      sellingPrice: 1099,
      quantity: 14,
      alertThreshold: 5,
      vatRate: 19.25,
      unit: "pièce",
      description: "Ordinateur ultra-fin haute performance avec écran 14 pouces, 16Go RAM et 512Go SSD. Idéal pour les professionnels.",
      imageUrl: "https://images.unsplash.com/photo-1496181130204-755241524eab?auto=format&fit=crop&w=300&q=80",
      createdAt: "2026-01-10T08:30:00Z"
    },
    {
      id: "prod-2",
      name: "Café Arabica Bio Équitable 1kg",
      reference: "CAF-AR-1KG",
      barcode: "3250392147040",
      category: "Alimentation & Boissons",
      purchasePrice: 12.50,
      sellingPrice: 24.90,
      quantity: 45,
      alertThreshold: 10,
      vatRate: 5.5,
      unit: "pièce",
      description: "Grains de café arabica d'altitude biologique, torréfié à l'ancienne en France. Notes chocolatées et fruitées.",
      imageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=80",
      createdAt: "2026-02-15T11:20:00Z"
    },
    {
      id: "prod-3",
      name: "Tensiomètre Électronique Bras",
      reference: "SAN-TEN-BR3",
      barcode: "4015566120934",
      category: "Santé & Pharmacie",
      purchasePrice: 22.10,
      sellingPrice: 49.99,
      quantity: 3, // Low stock on purpose
      alertThreshold: 5,
      vatRate: 19.25,
      unit: "pièce",
      description: "Appareil de mesure automatique de la tension artérielle au bras. Validé cliniquement, grand écran de lecture.",
      imageUrl: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80",
      createdAt: "2026-03-04T15:45:00Z"
    },
    {
      id: "prod-4",
      name: "Veste Blazer Homme Slim-Fit",
      reference: "MOD-BLZ-H01",
      barcode: "3584821034012",
      category: "Mode & Textile",
      purchasePrice: 35.00,
      sellingPrice: 89.90,
      quantity: 18,
      alertThreshold: 4,
      vatRate: 20,
      unit: "pièce",
      description: "Veste de costume ajustée moderne, tissu respirant infroissable. Parfaite pour le bureau ou les événements.",
      imageUrl: "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=300&q=80",
      createdAt: "2026-03-12T09:15:00Z"
    },
    {
      id: "prod-5",
      name: "Chaise Ergonomique de Bureau Mesh",
      reference: "CHR-ERGO-09",
      barcode: "3260812934057",
      category: "Bureautique & Mobilier",
      purchasePrice: 85.00,
      sellingPrice: 179.90,
      quantity: 0, // Out of stock on purpose
      alertThreshold: 3,
      vatRate: 19.25,
      unit: "pièce",
      description: "Fauteuil ajustable, support lombaire ergonomique, accoudoirs 3D et assise rembourrée haute densité.",
      imageUrl: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=300&q=80",
      createdAt: "2026-04-01T14:00:00Z"
    },
    {
      id: "prod-6",
      name: "Smartphone Z-PhonX Neon",
      reference: "PHN-ZNE-128",
      barcode: "4971850186591",
      category: "Électronique",
      purchasePrice: 350.00,
      sellingPrice: 599.00,
      quantity: 9,
      alertThreshold: 3,
      vatRate: 19.25,
      unit: "pièce",
      description: "Téléphone intelligent 5G, écran OLED 120Hz, photo 64 Mpx et stockage 128Go. Edition couleur Néon.",
      imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80",
      createdAt: "2026-04-10T16:20:00Z"
    },
    {
      id: "prod-7",
      name: "Boîte de Masques Chirurgicaux x50",
      reference: "MSK-CHIR-X50",
      barcode: "3401560021356",
      category: "Santé & Pharmacie",
      purchasePrice: 1.20,
      sellingPrice: 4.50,
      quantity: 120,
      alertThreshold: 15,
      vatRate: 5.5,
      unit: "pièce",
      description: "Masques jetables 3 plis haute filtration bactérienne. Conformes aux normes de sécurité médicale de l'UE.",
      imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80",
      createdAt: "2026-04-18T10:10:00Z"
    }
  ],
  clients: [
    {
      id: "cli-1",
      name: "Stéphane Martin",
      email: "stephane.martin@gmail.com",
      phone: "+33 6 12 34 56 78",
      address: "14 Rue de Rivoli, 75001 Paris, France",
      loyaltyPoints: 320,
      createdAt: "2026-01-15T09:45:00Z",
      totalSpent: 1845.50
    },
    {
      id: "cli-2",
      name: "Sophie Dubreuil",
      email: "sophie.dub@hotmail.fr",
      phone: "+33 7 89 45 12 23",
      address: "42 Boulevard de la Croix-Rousse, 69004 Lyon, France",
      loyaltyPoints: 85,
      createdAt: "2026-02-20T14:30:00Z",
      totalSpent: 420.00
    },
    {
      id: "cli-3",
      name: "Jean-Régis Petit",
      email: "jr.petit@corporate-innov.com",
      phone: "+33 1 45 56 89 00",
      address: "Avenue de l'Europe, Immeuble Thalès, 31000 Toulouse, France",
      loyaltyPoints: 1240,
      createdAt: "2026-03-01T10:00:00Z",
      totalSpent: 4890.00
    },
    {
      id: "cli-4",
      name: "Amandine Leclerc",
      email: "amandine.lec@leclerc-avocats.fr",
      phone: "+33 6 88 77 66 55",
      address: "5 Cours Mirabeau, 13100 Aix-en-Provence, France",
      loyaltyPoints: 410,
      createdAt: "2026-03-18T16:15:00Z",
      totalSpent: 1290.90
    }
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "Global Tech Distribution",
      contactName: "Marc Fontaine",
      email: "m.fontaine@globaltech-dist.com",
      phone: "+33 1 80 90 22 11",
      address: "Zone Industrielle de Courtaboeuf, 91190 Les Ulis, France",
      categories: ["Électronique", "Bureautique & Mobilier"],
      createdAt: "2026-01-05T08:00:00Z"
    },
    {
      id: "sup-2",
      name: "Terroirs & Bio France",
      contactName: "Hélène Dubois",
      email: "h.dubois@terroirsbio.fr",
      phone: "+33 4 90 45 88 99",
      address: "Route de Nyons, 26110 Vinsobres, France",
      categories: ["Alimentation & Boissons"],
      createdAt: "2026-01-10T11:00:00Z"
    },
    {
      id: "sup-3",
      name: "Euro Pharma Santé",
      contactName: "Lucas Bernard",
      email: "l.bernard@europharmasante.eu",
      phone: "+33 3 88 55 44 33",
      address: "12 Avenue de l'Europe, 67000 Strasbourg, France",
      categories: ["Santé & Pharmacie"],
      createdAt: "2021-01-12T09:30:00Z"
    },
    {
      id: "sup-4",
      name: "Textiles du Rhone SAS",
      contactName: "Gérard Dumas",
      email: "contact@textilesrhone.fr",
      phone: "+33 4 72 00 11 22",
      address: "8 Rue de la Ruche, 69003 Lyon, France",
      categories: ["Mode & Textile"],
      createdAt: "2026-02-01T15:00:00Z"
    }
  ],
  users: [
    {
      id: "usr-1",
      firstName: "Gabriel",
      lastName: "Rousseau",
      email: "alimabodouin@gmail.com", // matches current active email for local simulation realism
      username: "gabriel_admin",
      role: "ADMIN",
      status: "ACTIVE",
      mfaEnabled: true,
      lastLogin: "2026-06-09T09:45:00Z",
      createdAt: "2026-01-01T08:00:00Z"
    },
    {
      id: "usr-2",
      firstName: "Clara",
      lastName: "Moreau",
      email: "clara.m@pme-entreprise.fr",
      username: "clara_employe",
      role: "EMPLOYEE",
      status: "ACTIVE",
      mfaEnabled: false,
      lastLogin: "2026-06-09T08:12:00Z",
      createdAt: "2026-02-10T09:30:00Z"
    },
    {
      id: "usr-3",
      firstName: "Thomas",
      lastName: "Dubois",
      email: "t.dubois@pme-entreprise.fr",
      username: "thomas_dubois",
      role: "EMPLOYEE",
      status: "PENDING", // Invitation sent but not activated on purpose
      mfaEnabled: false,
      createdAt: "2026-06-08T14:20:00Z"
    },
    {
      id: "usr-4",
      firstName: "Julie",
      lastName: "Muller",
      email: "j.muller@pme-entreprise.fr",
      username: "julie_m",
      role: "EMPLOYEE",
      status: "SUSPENDED", // Suspended on purpose
      mfaEnabled: true,
      lastLogin: "2026-05-24T17:10:00Z",
      createdAt: "2026-03-01T11:00:00Z"
    }
  ],
  sales: [
    {
      id: "VEN-2026-001",
      clientName: "Stéphane Martin",
      clientId: "cli-1",
      items: [
        {
          productId: "prod-1",
          productName: "Ordinateur Portable UltraBook Pro",
          quantity: 1,
          unitPrice: 1099,
          discount: 0,
          taxRate: 20,
          totalPrice: 1099
        }
      ],
      subTotal: 1099,
      taxAmount: 219.80,
      discountAmount: 0,
      total: 1318.80,
      paymentMethod: "CARD",
      createdBy: "Clara Moreau",
      createdAt: "2026-06-08T11:30:00Z",
      status: "COMPLETED"
    },
    {
      id: "VEN-2026-002",
      clientName: "Sophie Dubreuil",
      clientId: "cli-2",
      items: [
        {
          productId: "prod-2",
          productName: "Café Arabica Bio Équitable 1kg",
          quantity: 2,
          unitPrice: 24.90,
          discount: 10,
          taxRate: 5.5,
          totalPrice: 44.82
        },
        {
          productId: "prod-7",
          productName: "Boîte de Masques Chirurgicaux x50",
          quantity: 2,
          unitPrice: 4.50,
          discount: 0,
          taxRate: 20,
          totalPrice: 9.00
        }
      ],
      subTotal: 53.82,
      taxAmount: 4.26,
      discountAmount: 4.98,
      total: 53.10,
      paymentMethod: "CASH",
      createdBy: "Clara Moreau",
      createdAt: "2026-06-08T15:45:00Z",
      status: "COMPLETED"
    },
    {
      id: "VEN-2026-003",
      clientName: "Passager Éphémère",
      items: [
        {
          productId: "prod-4",
          productName: "Veste Blazer Homme Slim-Fit",
          quantity: 1,
          unitPrice: 89.90,
          discount: 0,
          taxRate: 20,
          totalPrice: 89.90
        }
      ],
      subTotal: 89.90,
      taxAmount: 17.98,
      discountAmount: 0,
      total: 107.88,
      paymentMethod: "MOBILE",
      createdBy: "Gabriel Rousseau",
      createdAt: "2026-06-09T08:30:00Z",
      status: "COMPLETED"
    },
    {
      id: "VEN-2026-004",
      clientName: "Amandine Leclerc",
      clientId: "cli-4",
      items: [
        {
          productId: "prod-3",
          productName: "Tensiomètre Électronique Bras",
          quantity: 1,
          unitPrice: 49.99,
          discount: 15,
          taxRate: 20,
          totalPrice: 42.49
        }
      ],
      subTotal: 42.49,
      taxAmount: 8.50,
      discountAmount: 7.50,
      total: 43.49,
      paymentMethod: "TRANSFER",
      createdBy: "Gabriel Rousseau",
      createdAt: "2026-06-09T09:15:00Z",
      status: "COMPLETED"
    },
    {
      id: "VEN-2026-005",
      clientName: "Jean-Régis Petit",
      clientId: "cli-3",
      items: [
        {
          productId: "prod-1",
          productName: "Ordinateur Portable UltraBook Pro",
          quantity: 1,
          unitPrice: 1099,
          discount: 5,
          taxRate: 20,
          totalPrice: 1044.05
        }
      ],
      subTotal: 1044.05,
      taxAmount: 208.81,
      discountAmount: 54.95,
      total: 1198.00, // Cancelled order to showcase inventory roll-back
      paymentMethod: "CARD",
      createdBy: "Clara Moreau",
      createdAt: "2026-06-07T10:15:00Z",
      status: "CANCELLED"
    }
  ],
  stockMovements: [
    {
      id: "mov-1",
      productId: "prod-1",
      productName: "Ordinateur Portable UltraBook Pro",
      type: "IN",
      quantity: 10,
      previousQuantity: 5,
      newQuantity: 15,
      reason: "Approvisionnement mensuel Global Tech",
      createdBy: "Gabriel Rousseau",
      createdAt: "2026-06-01T09:00:00Z"
    },
    {
      id: "mov-2",
      productId: "prod-3",
      productName: "Tensiomètre Électronique Bras",
      type: "ADJUSTMENT_SUB",
      quantity: 1,
      previousQuantity: 4,
      newQuantity: 3,
      reason: "Unité d'exposition endommagée retirée",
      createdBy: "Gabriel Rousseau",
      createdAt: "2026-06-03T11:20:00Z"
    },
    {
      id: "mov-3",
      productId: "prod-5",
      productName: "Chaise Ergonomique de Bureau Mesh",
      type: "INVENTORY",
      quantity: 0,
      previousQuantity: 2,
      newQuantity: 0,
      reason: "Inventaire physique annuel - constat d'écart de stock nul",
      createdBy: "Gabriel Rousseau",
      createdAt: "2026-06-05T16:00:00Z"
    },
    {
      id: "mov-4",
      productId: "prod-1",
      productName: "Ordinateur Portable UltraBook Pro",
      type: "OUT",
      quantity: 1,
      previousQuantity: 15,
      newQuantity: 14,
      reason: "Vente VEN-2026-001",
      createdBy: "Clara Moreau",
      createdAt: "2026-06-08T11:30:00Z"
    }
  ],
  financialEntries: [
    {
      id: "fin-1",
      date: "2026-06-01",
      type: "EXPENSE",
      category: "Approvisionnements",
      description: "Achat de stock - Global Tech Distribution (LAP-8796-PRO x10)",
      amount: 6500.00,
      createdBy: "Gabriel Rousseau"
    },
    {
      id: "fin-2",
      date: "2026-06-02",
      type: "EXPENSE",
      category: "Loyer & Charges",
      description: "Loyer du local commercial - Juin 2026",
      amount: 1250.00,
      createdBy: "Gabriel Rousseau"
    },
    {
      id: "fin-3",
      date: "2026-06-03",
      type: "EXPENSE",
      category: "Marketing",
      description: "Campagne publicitaire locale Google Ads",
      amount: 350.00,
      createdBy: "Gabriel Rousseau"
    },
    {
      id: "fin-4",
      date: "2026-06-08",
      type: "REVENUE",
      category: "Ventes POS",
      description: "Vente VEN-2026-001 (Stéphane Martin)",
      amount: 1318.80,
      referenceId: "VEN-2026-001",
      createdBy: "Clara Moreau"
    },
    {
      id: "fin-5",
      date: "2026-06-08",
      type: "REVENUE",
      category: "Ventes POS",
      description: "Vente VEN-2026-002 (Sophie Dubreuil)",
      amount: 53.10,
      referenceId: "VEN-2026-002",
      createdBy: "Clara Moreau"
    },
    {
      id: "fin-6",
      date: "2026-06-09",
      type: "REVENUE",
      category: "Ventes POS",
      description: "Vente VEN-2026-003 (Passager)",
      amount: 107.88,
      referenceId: "VEN-2026-003",
      createdBy: "Gabriel Rousseau"
    },
    {
      id: "fin-7",
      date: "2026-06-09",
      type: "REVENUE",
      category: "Ventes POS",
      description: "Vente VEN-2026-004 (Amandine Leclerc)",
      amount: 43.49,
      referenceId: "VEN-2026-004",
      createdBy: "Gabriel Rousseau"
    }
  ],
  auditLogs: [
    {
      id: "aud-1",
      timestamp: "2026-06-01T09:00:00Z",
      action: "Entrée de stock",
      module: "STOCK",
      performedBy: "Gabriel Rousseau",
      details: "Ajout de 10 unités pour 'Ordinateur Portable UltraBook Pro'. Nouveau stock: 15.",
      severity: "INFO"
    },
    {
      id: "aud-2",
      timestamp: "2026-06-03T11:20:00Z",
      action: "Ajustement de stock",
      module: "STOCK",
      performedBy: "Gabriel Rousseau",
      details: "Retrait de 1 unité pour 'Tensiomètre Électronique Bras'. Raison: Unité d'exposition endommagée.",
      severity: "WARNING"
    },
    {
      id: "aud-3",
      timestamp: "2026-06-05T16:00:00Z",
      action: "Inventaire de stock",
      module: "STOCK",
      performedBy: "Gabriel Rousseau",
      details: "Inventaire complet sur 'Chaise Ergonomique de Bureau Mesh'. Quantité ajustée à 0.",
      severity: "WARNING"
    },
    {
      id: "aud-4",
      timestamp: "2026-06-08T11:30:00Z",
      action: "Finalisation de vente",
      module: "POS",
      performedBy: "Clara Moreau",
      details: "Vente VEN-2026-001 réussie. Client: Stéphane Martin. Montant: 1318.80 EUR.",
      severity: "INFO"
    },
    {
      id: "aud-5",
      timestamp: "2026-06-09T08:12:00Z",
      action: "Connexion utilisateur",
      module: "AUTH",
      performedBy: "Clara Moreau",
      details: "Session ouverte avec succès pour l'adresse clara.m@pme-entreprise.fr.",
      severity: "INFO"
    },
    {
      id: "aud-6",
      timestamp: "2026-06-09T09:45:00Z",
      action: "Connexion administrateur",
      module: "AUTH",
      performedBy: "Gabriel Rousseau",
      details: "Connexion réussie avec MFA activé pour alimabodouin@gmail.com.",
      severity: "INFO"
    }
  ],
  securityEvents: [
    {
      id: "sec-1",
      timestamp: "2026-06-09T09:45:00Z",
      eventType: "LOGIN_SUCCESS",
      userEmail: "alimabodouin@gmail.com",
      ip: "193.252.10.42",
      device: "MacBook Pro / Chrome 125",
      location: "Paris, FR",
      details: "Connexion vérifiée par mot de passe valide.",
      status: "SUCCESS"
    },
    {
      id: "sec-2",
      timestamp: "2026-06-09T09:45:15Z",
      eventType: "MFA_SUCCESS",
      userEmail: "alimabodouin@gmail.com",
      ip: "193.252.10.42",
      device: "MacBook Pro / Chrome 125",
      location: "Paris, FR",
      details: "MFA OTP à 6 chiffres validé avec succès.",
      status: "SUCCESS"
    },
    {
      id: "sec-3",
      timestamp: "2026-06-09T07:15:00Z",
      eventType: "LOGIN_FAILED",
      userEmail: "hacker_test@pme-entreprise.fr",
      ip: "89.23.45.167",
      device: "Linux / Firefox 120",
      location: "Frankfurt, DE",
      details: "Tentative avortée. Compte inexistant.",
      status: "FAILURE"
    },
    {
      id: "sec-4",
      timestamp: "2026-06-08T18:30:20Z",
      eventType: "MFA_FAILED",
      userEmail: "julie.m@pme-entreprise.fr",
      ip: "195.154.23.11",
      device: "iPhone 15 / Safari",
      location: "Marseille, FR",
      details: "Échec de validation OTP (Code incorrect). Tentative 1/3.",
      status: "FAILURE"
    }
  ],
  notifications: [
    {
      id: "not-1",
      title: "Rupture de Stock Critique",
      description: "Le produit 'Chaise Ergonomique de Bureau Mesh' est actuellement en rupture totale (0 disponible).",
      type: "CRITICAL",
      read: false,
      createdAt: "2026-06-05T16:00:00Z"
    },
    {
      id: "not-2",
      title: "Stock Faible",
      description: "Le stock de 'Tensiomètre Électronique Bras' (3 disponibles) est inférieur au seuil d'alerte (5).",
      type: "WARNING",
      read: false,
      createdAt: "2026-06-03T11:20:00Z"
    },
    {
      id: "not-3",
      title: "Vente Importante Enregistrée",
      description: "Un montant de 1,318.80 EUR a été facturé pour Stéphane Martin (VEN-2026-001).",
      type: "SUCCESS",
      read: true,
      createdAt: "2026-06-08T11:30:00Z"
    }
  ],
  devices: [
    {
      id: "dev-1",
      device: "MacBook Pro - Chrome (Paris, France)",
      ip: "193.252.10.42",
      location: "Paris, France",
      lastActive: "Actif maintenant",
      isCurrent: true
    },
    {
      id: "dev-2",
      device: "iPhone 15 Pro Max - Safari (Lyon, France)",
      ip: "176.128.43.19",
      location: "Lyon, France",
      lastActive: "Il y a 3 heures",
      isCurrent: false
    }
  ],
  globalMfaEnforced: false
};

// Local storage helpers
export function getSavedState(): InitialState {
  try {
    const data = localStorage.getItem('saas_erp_state');
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading localStorage", e);
  }
  return INITIAL_STATE;
}

export function saveState(state: InitialState) {
  try {
    localStorage.setItem('saas_erp_state', JSON.stringify(state));
  } catch (e) {
    console.error("Error saving to localStorage", e);
  }
}
