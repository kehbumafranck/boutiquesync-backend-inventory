/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  Shuffle,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  ClipboardList,
  Plus,
  Minus,
  AlertTriangle,
  History,
  X,
  FileDown,
} from "lucide-react";
import { Product, StockMovement } from "../types";
// AuditModule et AuditSeverity sont définis dans AppProvider et exportés
// pour éviter de dupliquer l'union littérale dans chaque composant.
import { AuditModule, AuditSeverity } from "../components/AppProvider";

interface StockManagementProps {
  products: Product[];
  stockMovements: StockMovement[];
  onAddStockMovement: (
    movement: Omit<StockMovement, "id" | "createdAt">,
  ) => void;
  onAddAuditLog: (
    action: string,
    module: AuditModule,
    performedBy: string,
    details: string,
    severity: AuditSeverity,
  ) => void;
  operatorName: string;
}

export default function StockManagement({
  products,
  stockMovements,
  onAddStockMovement,
  onAddAuditLog,
  operatorName,
}: StockManagementProps) {
  // Tab inner view: 'HISTORY' vs 'NEW_ADJUST'
  const [activeTab, setActiveTab] = useState<"HISTORY" | "ADJUST">("HISTORY");

  // New movement Form state
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id || "",
  );
  const [mvtType, setMvtType] = useState<
    "IN" | "OUT" | "ADJUSTMENT_ADD" | "ADJUSTMENT_SUB" | "INVENTORY"
  >("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Approvisionnement fournisseur");

  const selectedProductObj = products.find((p) => p.id === selectedProductId);

  const handleSubmitMvt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) {
      alert("Veuillez sélectionner un article et entrer une quantité valide.");
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) {
      alert("Article introuvable.");
      return;
    }

    let prevQty = prod.quantity;
    let newQty = prevQty;

    if (mvtType === "IN" || mvtType === "ADJUSTMENT_ADD") {
      newQty = prevQty + quantity;
    } else if (mvtType === "OUT" || mvtType === "ADJUSTMENT_SUB") {
      if (prevQty < quantity) {
        alert(
          "Action impossible : Le stock disponible est inférieur au retrait demandé.",
        );
        return;
      }
      newQty = prevQty - quantity;
    } else if (mvtType === "INVENTORY") {
      newQty = quantity; // sets to exactly quantity
    }

    // Call dynamic app state updater
    onAddStockMovement({
      productId: selectedProductId,
      productName: prod.name,
      type: mvtType,
      quantity,
      previousQuantity: prevQty,
      newQuantity: newQty,
      reason,
      createdBy: operatorName,
    });

    // Logging to audit
    const actionLabel =
      mvtType === "IN"
        ? "Entrée de Stock"
        : mvtType === "OUT"
          ? "Sortie de Stock"
          : "Ajustement manuel";
    onAddAuditLog(
      actionLabel,
      "STOCK",
      operatorName,
      `Modif stock pour '${prod.name}' (${prod.reference}). Qte: ${prevQty} -> ${newQty}. Raison: ${reason}`,
      mvtType === "IN" ? "INFO" : "WARNING",
    );

    alert(
      `Mouvement enregistré avec succès ! Le stock de '${prod.name}' est maintenant de ${newQty} pièces.`,
    );

    // Clear and reset
    setActiveTab("HISTORY");
    setQuantity(1);
    setReason("Approvisionnement fournisseur");
  };

  // Quick preset reason helpers depending on selected transaction type
  const handleTypeChange = (type: typeof mvtType) => {
    setMvtType(type);
    if (type === "IN") setReason("Réassortiment fournisseur");
    else if (type === "OUT") setReason("Casse ou produit endommagé");
    else if (type === "ADJUSTMENT_ADD")
      setReason("Correction d'inventaire / Surplus");
    else if (type === "ADJUSTMENT_SUB") setReason("Vol ou d'écart constaté");
    else if (type === "INVENTORY")
      setReason("Régularisation suite audit annuel");
  };

  // Stat metrics computations
  const totalStockVolume = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalAlerts = products.filter(
    (p) => p.quantity <= p.alertThreshold,
  ).length;

  const inMovementsCount = stockMovements.filter(
    (m) => m.type === "IN" || m.type === "ADJUSTMENT_ADD",
  ).length;
  const outMovementsCount = stockMovements.filter(
    (m) => m.type === "OUT" || m.type === "ADJUSTMENT_SUB",
  ).length;

  return (
    <div
      id="stock-module"
      className="space-y-6 font-sans antialiased text-slate-800"
    >
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Suivi des Flux & Entrées/Sorties
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Contrôlez les variations d'inventaire, enregistrez les
            réapprovisionnements et résolvez les écarts de saisie.
          </p>
        </div>

        {/* Adjust button toggler */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-205">
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "HISTORY"
                ? "bg-slate-950 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Historique complet
          </button>
          <button
            id="stock-adjust-form-toggle"
            onClick={() => setActiveTab("ADJUST")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeTab === "ADJUST"
                ? "bg-slate-950 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shuffle className="h-3 w-3" />
            Corriger / Approvisionner
          </button>
        </div>
      </div>

      {/* LOWER GRID LAYOUT STATS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center rounded-xl shrink-0">
            <Scale className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
              Inventaire total
            </span>
            <span className="text-sm font-black text-slate-900">
              {totalStockVolume} pièces
            </span>
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
          <div
            className={`h-9 w-9 flex items-center justify-center rounded-xl shrink-0 ${
              totalAlerts > 0
                ? "bg-rose-50 border border-rose-100 text-rose-750 font-bold"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
              Stocks Critiques
            </span>
            <span className="text-sm font-black text-slate-900">
              {totalAlerts} références
            </span>
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="h-9 w-9 bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center rounded-xl shrink-0">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
              Entrées validées
            </span>
            <span className="text-sm font-black text-slate-900">
              {inMovementsCount} flux
            </span>
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="h-9 w-9 bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center rounded-xl shrink-0">
            <TrendingDown className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
              Retraits stock
            </span>
            <span className="text-sm font-black text-slate-900">
              {outMovementsCount} flux
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE SCREEN RENDERER */}
      {activeTab === "ADJUST" ? (
        /* ADJUSTMENT FORM SCREEN */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden max-w-xl mx-auto">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Déclarer un mouvement de stock manuel
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Saisissez les informations avec exactitude. Toutes les écritures
              sont signées et auditées.
            </p>
          </div>

          <form
            onSubmit={handleSubmitMvt}
            className="p-5 space-y-4 text-xs font-medium"
          >
            {/* Choose product */}
            <div>
              <label className="block text-slate-700 mb-1">
                Sélectionner l'article concerné *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 font-semibold focus:bg-white focus:outline-none transition leading-normal"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (SKU: {p.reference} • Reste: {p.quantity} pces)
                  </option>
                ))}
              </select>
            </div>

            {/* Choose type */}
            <div>
              <label className="block text-slate-700 mb-1.5">
                Action et Type de mouvement *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange("IN")}
                  className={`py-2 px-3 border rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                    mvtType === "IN"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-250 ring-1 ring-emerald-600"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" /> Entrée réassort
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("OUT")}
                  className={`py-2 px-3 border rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                    mvtType === "OUT"
                      ? "bg-rose-50 text-rose-800 border-rose-250 ring-1 ring-rose-600"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <Minus className="h-3.5 w-3.5" /> Retrait exceptionnel
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("INVENTORY")}
                  className={`py-2 px-3 border rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                    mvtType === "INVENTORY"
                      ? "bg-indigo-50 text-indigo-800 border-indigo-250 ring-1 ring-indigo-600"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Réglage Inventaire
                </button>
              </div>
            </div>

            {/* Two col: Quantity and product state display */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-1">
                  {mvtType === "INVENTORY"
                    ? "Quantité recensée *"
                    : "Quantité deltas (pièces) *"}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition font-sans font-bold"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 block uppercase">
                  Variation simulée
                </span>
                {selectedProductObj && (
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5">
                    {mvtType === "INVENTORY"
                      ? `Ecart corrigé : ${quantity - selectedProductObj.quantity} pces`
                      : `${selectedProductObj.quantity} pces → ${
                          mvtType === "IN" || mvtType === "ADJUSTMENT_ADD"
                            ? selectedProductObj.quantity + quantity
                            : selectedProductObj.quantity - quantity
                        } pces`}
                  </span>
                )}
              </div>
            </div>

            {/* Reason input */}
            <div>
              <label className="block text-slate-700 mb-1">
                Justification et Motif réglementaire *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: Commande de réassort fournisseur numéro #452"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition leading-normal"
              />
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Signer et valider l'ajustement
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("HISTORY")}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* HISTORY LOG TABLE */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <History className="h-4 w-4 text-indigo-500" /> Journal historique
              des mouvements physiques
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Affichage chronologique
            </span>
          </div>

          <div className="overflow-x-auto">
            {stockMovements.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Aucun mouvement de stock n'a été répertorié.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 font-mono">
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Produit concerné</th>
                    <th className="py-3 px-4 text-center">Type flux</th>
                    <th className="py-3 px-4 text-center">Quantité delta</th>
                    <th className="py-3 px-4 text-center">Variation stock</th>
                    <th className="py-3 px-4">Motif d'action</th>
                    <th className="py-3 px-4">Opérateur auteur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {stockMovements
                    .slice()
                    .reverse()
                    .map((mvt) => {
                      const isAddition =
                        mvt.type === "IN" || mvt.type === "ADJUSTMENT_ADD";
                      const isSub =
                        mvt.type === "OUT" || mvt.type === "ADJUSTMENT_SUB";
                      const isInventory = mvt.type === "INVENTORY";

                      return (
                        <tr
                          key={mvt.id}
                          className="hover:bg-slate-50/40 transition"
                        >
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(mvt.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {mvt.productName}
                          </td>

                          <td className="py-3 px-4 text-center shrink-0">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                                isAddition
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                  : isSub
                                    ? "bg-rose-50 text-rose-800 border border-rose-100"
                                    : "bg-indigo-50 text-indigo-800 border border-indigo-100"
                              }`}
                            >
                              {mvt.type}
                            </span>
                          </td>

                          <td
                            className={`py-3 px-4 text-center font-bold font-mono ${
                              isAddition
                                ? "text-emerald-700"
                                : isSub
                                  ? "text-rose-700"
                                  : "text-indigo-700"
                            }`}
                          >
                            {isAddition
                              ? `+${mvt.quantity}`
                              : isSub
                                ? `-${mvt.quantity}`
                                : `Fix: ${mvt.quantity}`}
                          </td>

                          <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {mvt.previousQuantity} pces →{" "}
                            <span className="font-bold text-slate-800">
                              {mvt.newQuantity} pces
                            </span>
                          </td>

                          <td
                            className="py-3 px-4 text-xs font-medium text-slate-600 truncate max-w-xs"
                            title={mvt.reason}
                          >
                            {mvt.reason}
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                            {mvt.createdBy}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
