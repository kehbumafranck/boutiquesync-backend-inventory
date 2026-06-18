/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Percent,
  Calculator,
  UserPlus,
  Check,
  CreditCard,
  Ban,
  Printer,
  FileText,
  Mail,
  History,
  Info,
  ChevronRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { Product, Client, Sale, SaleItem } from '../types';
import { CATEGORIES } from '../mockData';

interface PosTerminalProps {
  products: Product[];
  clients: Client[];
  sales: Sale[];
  onAddSale: (sale: Sale) => void;
  onCancelSale: (id: string, updatedProducts: Product[]) => void;
  onUpdateProductQuantities: (updatedProducts: Product[]) => void;
  onAddAuditLog: (action: string, module: 'POS' | 'FINANCE' | 'STOCK', performedBy: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  operatorName: string;
}

export default function PosTerminal({
  products,
  clients,
  sales,
  onAddSale,
  onCancelSale,
  onUpdateProductQuantities,
  onAddAuditLog,
  operatorName
}: PosTerminalProps) {
  
  // POS Screen Toggles: 'CATALOG' (Active sale) vs 'HISTORY' (Audit bills)
  const [activeScreen, setActiveScreen] = useState<'CATALOG' | 'HISTORY'>('CATALOG');

  // Interactive Cart state
  const [cartItems, setCartItems] = useState<Omit<SaleItem, 'totalPrice'>[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('generic_passerby');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE'>('CARD');

  // Interactive Search & Categorization
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [scannedBarcode, setScannedBarcode] = useState('');

  // Post sale completed invoice PDF visual receipt modal
  const [justCompletedSale, setJustCompletedSale] = useState<Sale | null>(null);
  const [selectedHistorySale, setSelectedHistorySale] = useState<Sale | null>(null);

  // Barcode quick scan simulation
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode) return;

    const matchedProd = products.find(p => p.barcode === scannedBarcode || p.reference === scannedBarcode);
    if (matchedProd) {
      if (matchedProd.quantity === 0) {
        alert("Echec scan : L'article sélectionné est en rupture totale de stock.");
        setScannedBarcode('');
        return;
      }
      handleAddToCart(matchedProd);
    } else {
      alert(`Code-barres ou SKU "${scannedBarcode}" inconnu au catalogue.`);
    }
    setScannedBarcode('');
  };

  const handleAddToCart = (product: Product) => {
    if (product.quantity === 0) {
      alert("Impossible d'ajouter au panier : Stock épuisé.");
      return;
    }

    const alreadyInCartIdx = cartItems.findIndex(item => item.productId === product.id);
    if (alreadyInCartIdx > -1) {
      const currentQtyInCart = cartItems[alreadyInCartIdx].quantity;
      if (currentQtyInCart >= product.quantity) {
        alert(`Stock maximum de sécurité disponible pour cet article atteint (${product.quantity} pces).`);
        return;
      }
      const updated = [...cartItems];
      updated[alreadyInCartIdx].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discount: 0,
        taxRate: product.category === 'Santé & Pharmacie' || product.category === 'Alimentation & Boissons' ? 5.5 : 20
      }]);
    }
  };

  const handleUpdateItemQty = (prodId: string, delta: number) => {
    const targetProd = products.find(p => p.id === prodId);
    if (!targetProd) return;

    const idx = cartItems.findIndex(item => item.productId === prodId);
    if (idx === -1) return;

    const newQty = cartItems[idx].quantity + delta;

    if (newQty <= 0) {
      handleRemoveItem(prodId);
    } else if (newQty > targetProd.quantity) {
      alert(`Stock disponible insuffisant (${targetProd.quantity} pces maximum).`);
    } else {
      const updated = [...cartItems];
      updated[idx].quantity = newQty;
      setCartItems(updated);
    }
  };

  const handleItemDiscountChange = (prodId: string, discountPct: number) => {
    const idx = cartItems.findIndex(item => item.productId === prodId);
    if (idx === -1) return;
    const updated = [...cartItems];
    updated[idx].discount = Math.max(0, Math.min(100, discountPct));
    setCartItems(updated);
  };

  const handleItemTaxChange = (prodId: string, taxRatePct: number) => {
    const idx = cartItems.findIndex(item => item.productId === prodId);
    if (idx === -1) return;
    const updated = [...cartItems];
    updated[idx].taxRate = taxRatePct;
    setCartItems(updated);
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.productId !== id));
  };

  // CALCULATE INVOICE SUMS
  const computeCartTotals = () => {
    let subTotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    const itemsWithTotals: SaleItem[] = cartItems.map(item => {
      // Item total price is: quantity * unitPrice * (1 - discount/100)
      const baseVal = item.quantity * item.unitPrice;
      const discAmt = baseVal * (item.discount / 100);
      const discountedVal = baseVal - discAmt;
      const taxAmt = discountedVal * (item.taxRate / 100);

      subTotal += baseVal;
      discountAmount += discAmt;
      taxAmount += taxAmt;

      return {
        ...item,
        totalPrice: discountedVal
      };
    });

    const total = subTotal - discountAmount + taxAmount;

    return {
      itemsWithTotals,
      subTotal,
      discountAmount,
      taxAmount,
      total
    };
  };

  const { itemsWithTotals, subTotal, discountAmount, taxAmount, total } = computeCartTotals();

  // TERMINER LA VENTE TRIGGER
  const handleFinalizeSale = () => {
    if (cartItems.length === 0) {
      alert("Votre panier d'achats est vide.");
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId);
    const clientName = selectedClient ? selectedClient.name : "Passager Éphémère";

    // Deduct stock quantities from state
    const nextProducts = products.map(prod => {
      const soldItem = cartItems.find(item => item.productId === prod.id);
      if (soldItem) {
        return {
          ...prod,
          quantity: Math.max(0, prod.quantity - soldItem.quantity)
        };
      }
      return prod;
    });

    onUpdateProductQuantities(nextProducts);

    // Save sale object
    const finalSaleId = "VEN-2026-0" + (sales.length + 1);
    const completedSale: Sale = {
      id: finalSaleId,
      clientName,
      clientId: selectedClient?.id,
      items: itemsWithTotals,
      subTotal: parseFloat(subTotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      paymentMethod,
      createdBy: operatorName,
      createdAt: new Date().toISOString(),
      status: 'COMPLETED'
    };

    onAddSale(completedSale);

    // Write audit log entry
    onAddAuditLog(
      'Vente finalisée',
      'POS',
      operatorName,
      `Vente ${finalSaleId} complétée par ${operatorName} (${clientName}). Total: ${total.toFixed(2)} EUR. Paiement: ${paymentMethod}`,
      'INFO'
    );

    // If client had registered loyalty account, gain points (10 pt per 50 EUR spent)
    if (selectedClient && total > 50) {
      const addedPoints = Math.floor(total / 50) * 10;
      selectedClient.loyaltyPoints += addedPoints;
      completedSale.clientName += ` (+${addedPoints} pts Fidélisation)`;
    }

    // Trigger visual print modal
    setJustCompletedSale(completedSale);
    setCartItems([]); // Reset cart
  };

  // VOID / CANCEL TRANSACTION (restores properties)
  const handleVoidSale = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Alerte de sécurité : Êtes-vous sûr de vouloir annuler la vente ${sale.id} ? Cette action recréditera instantanément le stock des produits vendus.`)) {
      
      // Credit stock levels
      const restoredProducts = products.map(prod => {
        const soldProduct = sale.items.find(item => item.productId === prod.id);
        if (soldProduct) {
          return {
            ...prod,
            quantity: prod.quantity + soldProduct.quantity
          };
        }
        return prod;
      });

      onCancelSale(sale.id, restoredProducts);

      onAddAuditLog(
        'Vente annulée',
        'POS',
        operatorName,
        `Vente ${sale.id} annulée/créditée par l'administrateur. Rétablissement d'inventaire effectué.`,
        'CRITICAL'
      );

      alert(`La vente ${sale.id} a été annulée et le stock correspondant est réintégré.`);
    }
  };

  // Search filtered products
  const filteredCatalog = products
    .filter(p => !activeCategory || p.category === activeCategory)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.reference.toLowerCase().includes(search.toLowerCase()));

  // Visual receipt components print
  const InvoiceReceipt = ({ sale, onClose }: { sale: Sale, onClose: () => void }) => {
    return (
      <div id="invoice-sheet-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 flex flex-col justify-between animate-in zoom-in duration-200">
          
          <div className="border border-dashed border-slate-200 p-5 rounded-2xl bg-slate-50/50 font-mono text-xs text-slate-800 space-y-3 relative overflow-hidden">
            
            {/* Top receipt head */}
            <div className="text-center">
              <span className="text-base font-extrabold tracking-tight block">TICKETS NEXUS PME</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">SNC 12 RUE DE PARIS, FR</span>
              <span className="text-[9px] text-slate-400 block">Siret: 124 542 121 00010</span>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-3">
              <p>Facture : <span className="font-bold text-slate-900">{sale.id}</span></p>
              <p>Date : {new Date(sale.createdAt).toLocaleString('fr-FR')}</p>
              <p>Opérateur : {sale.createdBy}</p>
              <p>Client : {sale.clientName}</p>
            </div>

            {/* List items */}
            <div className="border-t border-dashed border-slate-300 pt-3 space-y-2">
              <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase">
                <span>Désignation</span>
                <span className="w-16 text-center">Qté * P.U</span>
                <span className="text-right">TTC</span>
              </div>
              <div className="divide-y divide-dotted divide-slate-200 space-y-1">
                {sale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between pt-1">
                    <span className="truncate max-w-[150px] font-semibold">{it.productName}</span>
                    <span className="w-16 text-center">{it.quantity} x {it.unitPrice.toFixed(0)}€</span>
                    <span className="text-right font-bold">{it.totalPrice.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mathematical Totals */}
            <div className="border-t border-dashed border-slate-350 pt-3 font-semibold space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Sous-total HT :</span>
                <span>{sale.subTotal.toFixed(2)} €</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-rose-650 text-rose-700">
                  <span>Remises cumulées :</span>
                  <span>-{sale.discountAmount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>TVA collectée :</span>
                <span>{sale.taxAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-950 pt-1.5 border-t border-dotted border-slate-305">
                <span>TOTAL PAYÉ :</span>
                <span>{sale.total.toFixed(2)} EUR</span>
              </div>
            </div>

            {/* Foot note */}
            <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-dashed border-slate-300">
              <p>Mode paiement : {sale.paymentMethod}</p>
              <p className="font-bold text-slate-800 mt-2">Merci pour votre confiance !</p>
              <p className="text-[8px]">Sauvegarde cloud cryptée sur SaaS Nexus</p>
            </div>

          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={() => {
                alert("Ouverture de l'interface d'impression système...");
                window.print();
              }}
              className="flex flex-col items-center justify-center p-2 border border-slate-150 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-600 mb-1" />
              <span className="text-[9px] font-bold text-slate-700">Imprimer</span>
            </button>
            <button
              onClick={() => alert("Simulation de création de PDF. Fichier 'facture_" + sale.id + ".pdf' généré en mémoire et prêt à être exporté.")}
              className="flex flex-col items-center justify-center p-2 border border-slate-150 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            >
              <FileText className="h-4 w-4 text-slate-600 mb-1" />
              <span className="text-[9px] font-bold text-slate-700">Export PDF</span>
            </button>
            <button
              onClick={() => alert("Simulé : Facture envoyée par courriel électronique sécurisé au client.")}
              className="flex flex-col items-center justify-center p-2 border border-slate-150 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            >
              <Mail className="h-4 w-4 text-slate-600 mb-1" />
              <span className="text-[9px] font-bold text-slate-700">Email</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Fermer le guichet de vente
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="pos-terminal-module" className="space-y-6 font-sans antialiased text-slate-800">
      
      {/* Title block & tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Caisse Enregistreuse POS Tactile</h2>
          <p className="text-xs text-slate-400 mt-1">Générez des factures professionnelles, appliquez des remises de fidélité et encaissez.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-205">
          <button
            onClick={() => {
              setActiveScreen('CATALOG');
              setSelectedHistorySale(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeScreen === 'CATALOG' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Guichet Vente Actif
          </button>
          <button
            id="pos-sales-history-btn"
            onClick={() => setActiveScreen('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeScreen === 'HISTORY' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3 w-3" />
            Historique tickets ({sales.length})
          </button>
        </div>
      </div>

      {/* COMPACT VIEW SCREEN SELECTOR */}
      {activeScreen === 'HISTORY' ? (
        
        /* POPULATING HISTORICAL SALES DIRECTORY */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tickets archivés ce trimestre</span>
            <span className="text-[10px] text-slate-400 font-mono">Système financier audité</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 font-mono uppercase">
                  <th className="py-3 px-4">Numéro Facture</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Articles vendus</th>
                  <th className="py-3 px-4 text-right">HT cumulé</th>
                  <th className="py-3 px-4 text-right">Taxes TVA</th>
                  <th className="py-3 px-4 text-right">Remise</th>
                  <th className="py-3 px-4 text-right">TTC Final</th>
                  <th className="py-3 px-4 text-center">Paiement</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sales
                  .slice()
                  .reverse()
                  .map((sale) => {
                    const isCancelled = sale.status === 'CANCELLED';
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedHistorySale(sale)}
                        className="hover:bg-slate-50/40 transition cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{sale.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-805">{sale.clientName}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500">
                          {sale.items.map(it => `${it.productName} (x${it.quantity})`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{sale.subTotal.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">{sale.taxAmount.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right font-mono text-rose-500">-{sale.discountAmount.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">{sale.total.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                            isCancelled ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          }`}>
                            {isCancelled ? 'ANNULÉ' : 'COMPLÉTÉ'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedHistorySale(sale)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                              title="Visualiser la facture"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            {!isCancelled && (
                              <button
                                onClick={(e) => handleVoidSale(sale, e)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                                title="Créditer / Annuler la vente"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* CATALOG POS TERMINAL GUICHET */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          
          {/* Left panel: Catalog Products Explorer (8 cols) */}
          <div className="xl:col-span-7 space-y-4">
            
            {/* Scanned/Barcode field & categories header */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              
              {/* Scan simulation */}
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Barcode className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Simuler scan code-barres (Saisissez EAN-13 ou SKU et validez par Entrée)"
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  className="block w-full border border-slate-200 rounded-xl bg-slate-50/50 pl-9 pr-24 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 transition font-mono"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Scanner
                </button>
              </form>

              {/* Free Search */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrer par nom..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="block w-full border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-950 transition"
                  />
                </div>
                
                {activeCategory && (
                  <button
                    onClick={() => setActiveCategory('')}
                    className="text-[10px] font-mono text-slate-400 hover:text-slate-950"
                  >
                    Effacer filtre
                  </button>
                )}
              </div>

              {/* Category selector row */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 invisible-scrollbar">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap cursor-pointer ${
                    !activeCategory ? 'bg-indigo-650 bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  TOUS
                </button>
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap cursor-pointer ${
                      activeCategory === cat ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>

            </div>

            {/* Clickable POS Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCatalog.map((p) => {
                const remains = p.quantity;
                const isOutOfStock = remains === 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && handleAddToCart(p)}
                    className={`bg-white p-3 rounded-2xl border border-slate-200 hover:border-slate-450 hover:shadow-md transition cursor-pointer select-none relative ${
                      isOutOfStock ? 'opacity-55 cursor-not-allowed' : ''
                    }`}
                  >
                    {isOutOfStock && (
                      <span className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-extrabold px-1.5 rounded uppercase">
                        Épuisé
                      </span>
                    )}
                    <div className="flex gap-2.5 items-start">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-12 w-12 rounded-lg object-cover bg-slate-50 shrink-0 border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">{p.category}</span>
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-tight mt-0.5">{p.name}</h4>
                        <p className="text-[10px] font-mono font-bold text-slate-700 mt-1">{p.sellingPrice.toFixed(2)} €</p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-mono">Ref: {p.reference}</span>
                      <span className={`font-semibold ${remains <= p.alertThreshold ? 'text-rose-550 text-rose-600 font-bold' : 'text-slate-500'}`}>
                        {remains} unités dispo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right panel: Active Cart & Invoicing calculations (5 cols) */}
          <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col justify-between self-stretch h-[600px] xl:sticky xl:top-20">
            
            {/* Header selection block */}
            <div className="p-4 bg-slate-50 border-b border-slate-150 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Panier d'encaissement</span>
              
              <div className="flex gap-2">
                {/* Client select */}
                <div className="flex-1">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs text-slate-750 focus:outline-none focus:ring-1 focus:ring-slate-950 font-semibold"
                  >
                    <option value="generic_passerby">👥 Passager Éphémère (Pas de fidélité)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        👤 {c.name} ({c.loyaltyPoints}pts)
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  type="button"
                  onClick={() => alert("Simulation d'invitation client. Renseignez directement ses coordonnées dans l'onglet 'Clients'.")}
                  className="p-1 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl cursor-pointer"
                  title="Ajouter un client"
                >
                  <UserPlus className="h-4 w-4 text-slate-650" />
                </button>
              </div>
            </div>

            {/* Middle: Cart list scrolls */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 hierarchy-scroll">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-10">
                  <Calculator className="h-10 w-10 text-slate-200 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Le panier est vierge</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Cliquez sur un produit du catalogue à gauche ou scannez un code-barres pour lancer la vente.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.productId} className="py-2.5 space-y-1.5 first:pt-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.productName}</p>
                        <span className="text-[10px] text-slate-400 font-mono">P.U: {item.unitPrice.toFixed(2)} €</span>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-slate-350 hover:text-rose-650 text-rose-500 cursor-pointer p-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      {/* Quantity editors */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(item.productId, -1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-200 text-xs transition cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-900 font-mono select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(item.productId, 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-200 text-xs transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Item discounts & tax selection */}
                      <div className="flex gap-2 items-center text-[10px]">
                        {/* Discount */}
                        <div className="flex items-center gap-1 border border-slate-150 rounded px-1 text-slate-600 bg-slate-50/50">
                          <Percent className="h-2.5 w-2.5 text-slate-400" />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => handleItemDiscountChange(item.productId, parseInt(e.target.value) || 0)}
                            className="w-8 border-none bg-transparent p-0 text-[10px] font-bold font-mono focus:outline-none focus:ring-0 text-center"
                            placeholder="0"
                          />
                        </div>

                        {/* Tax selectable */}
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleItemTaxChange(item.productId, parseFloat(e.target.value) || 20)}
                          className="border border-slate-150 bg-slate-50/50 rounded p-0 text-[10px] font-semibold text-slate-600 focus:outline-none"
                        >
                          <option value="20">TVA 20%</option>
                          <option value="5.5">TVA 5.5%</option>
                          <option value="0">TVA 0%</option>
                        </select>
                      </div>

                      {/* Cumulative item value */}
                      <span className="font-mono text-xs font-bold text-slate-950">
                        {((item.quantity * item.unitPrice) * (1 - item.discount/100)).toFixed(2)} €
                      </span>

                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Calculations & Cash-out panel (At Least 30% of standard dimensions) */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 space-y-4">
              <div className="space-y-1.5 text-xs font-medium">
                <div className="flex justify-between text-slate-500">
                  <span>Sous-total HT :</span>
                  <span className="font-mono">{subTotal.toFixed(2)} €</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-650 text-rose-700 font-semibold">
                    <span>Remises déduites :</span>
                    <span className="font-mono">-{discountAmount.toFixed(2)} €</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 border-b border-slate-200/50 pb-1.5">
                  <span>Taxes sur valeur ajoutée (TVA) :</span>
                  <span className="font-mono">{taxAmount.toFixed(2)} €</span>
                </div>

                <div className="flex justify-between text-sm font-black text-slate-950 pt-1">
                  <span>NET À PAYER TTC :</span>
                  <span className="text-base font-black font-mono">{total.toFixed(2)} €</span>
                </div>
              </div>

              {/* Payment selection */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mode de règlement</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'CARD', label: 'Carte' },
                    { id: 'CASH', label: 'Espèces' },
                    { id: 'TRANSFER', label: 'Vire.' },
                    { id: 'MOBILE', label: 'Mobile' }
                  ].map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setPaymentMethod(x.id as any)}
                      className={`py-2 border text-center rounded-xl text-[10px] font-bold cursor-pointer transition ${
                        paymentMethod === x.id ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={cartItems.length === 0}
                  onClick={() => {
                    if (confirm("Voulez-vous vider l'ensemble du panier actuel ?")) setCartItems([]);
                  }}
                  className="p-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-xl transition cursor-pointer disabled:opacity-50"
                  title="Abandonner / Vider le panier"
                >
                  <Ban className="h-4 w-4" />
                </button>

                <button
                  id="pos-finalize-sale-btn"
                  type="button"
                  onClick={handleFinalizeSale}
                  disabled={cartItems.length === 0}
                  className="flex-1 py-3 px-4 rounded-xl font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Enregistrer & Finaliser la vente</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* RENDER INVOICE MODAL (For complete sale receipt popup) */}
      {justCompletedSale && (
        <InvoiceReceipt sale={justCompletedSale} onClose={() => setJustCompletedSale(null)} />
      )}

      {selectedHistorySale && (
        <InvoiceReceipt sale={selectedHistorySale} onClose={() => setSelectedHistorySale(null)} />
      )}

    </div>
  );
}
