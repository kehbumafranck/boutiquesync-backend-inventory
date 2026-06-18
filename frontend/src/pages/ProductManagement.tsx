/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProductManagement — Gestion du catalogue produits, branchée directement
 * sur le backend via AppProvider (handleAddProduct / handleUpdateProduct /
 * handleDeleteProduct, qui appellent boutiqueApi en interne).
 *
 * Alignement avec CreateProductRequest (backend) :
 *  - Pas de catégorie ni de fournisseur : ces champs ne sont pas (encore)
 *    persistés côté entité Mongo Product (categoryId est commenté dans
 *    le modèle backend). À réintroduire quand le backend les supportera.
 *  - `unit` est une liste fixe : pièce, kg, litre, carton, autre.
 *  - Les actions CRUD sont asynchrones et peuvent échouer côté backend :
 *    le modal reste ouvert et affiche l'erreur tant que l'opération
 *    n'a pas réussi, au lieu de se fermer optimistiquement.
 */

import React, { useState } from "react";
import {
  Search,
  Grid,
  List,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  Package,
  Eye,
  X,
  FileSpreadsheet,
  Percent,
  AlertCircle,
} from "lucide-react";
import { Product, User } from "../types";
import { AuditModule, AuditSeverity } from "../components/AppProvider";

// ─────────────────────────────────────────────────────────────────────────
// UNITÉS DE MESURE — liste fixe côté frontend
// ─────────────────────────────────────────────────────────────────────────

const UNITS = ["pièce", "kg", "litre", "carton", "autre"] as const;

// ─────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddAuditLog: (
    action: string,
    module: AuditModule,
    performedBy: string,
    details: string,
    severity: AuditSeverity,
  ) => void;
  operatorName: string;
  currentUser?: User;
}

export default function ProductManagement({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddAuditLog,
  operatorName,
  currentUser,
}: ProductManagementProps) {
  // UX layout and filter states
  const [viewMode, setViewMode] = useState<"TABLE" | "CARDS">("TABLE");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof Product>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Form / Drawer modals states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT" | "VIEW">("ADD");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form input fields
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [vatRate, setVatRate] = useState(19.25);
  const [quantity, setQuantity] = useState(0);
  const [alertThreshold, setAlertThreshold] = useState(3);
  const [unit, setUnit] = useState<string>(UNITS[0]);
  const [description, setDescription] = useState("");

  // Sorter logic
  const handleSort = (field: keyof Product) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Processing CRUD triggers
  const handleOpenAddModal = () => {
    setModalMode("ADD");
    setSelectedProduct(null);
    setFormError("");
    setName("");
    setBarcode(
      String(3250000000000 + Math.floor(10000000 + Math.random() * 90000000)),
    );
    setPurchasePrice(10);
    setSellingPrice(19.9);
    setVatRate(19.25);
    setQuantity(5);
    setAlertThreshold(2);
    setUnit(UNITS[0]);
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalMode("EDIT");
    setSelectedProduct(p);
    setFormError("");
    setName(p.name);
    setBarcode(p.barcode);
    setPurchasePrice(p.purchasePrice);
    setSellingPrice(p.sellingPrice);
    setVatRate(p.vatRate);
    setQuantity(p.quantity);
    setAlertThreshold(p.alertThreshold);
    setUnit(p.unit || UNITS[0]);
    setDescription(p.description);
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (p: Product) => {
    setModalMode("VIEW");
    setSelectedProduct(p);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name || !barcode) {
      setFormError("Veuillez remplir les informations obligatoires.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "ADD") {
        await onAddProduct({
          name,
          reference: barcode, // pas de champ reference côté backend ; on aligne sur le barcode
          barcode,
          purchasePrice,
          sellingPrice,
          vatRate,
          quantity,
          alertThreshold,
          unit,
          description,
          imageUrl: "",
        });
        onAddAuditLog(
          "Produit créé",
          "PRODUCTS",
          operatorName,
          `Création du produit '${name}' (Code-barres: ${barcode})`,
          "INFO",
        );
      } else if (modalMode === "EDIT" && selectedProduct) {
        await onUpdateProduct({
          ...selectedProduct,
          name,
          barcode,
          purchasePrice,
          sellingPrice,
          vatRate,
          quantity,
          alertThreshold,
          unit,
          description,
        });
        onAddAuditLog(
          "Produit modifié",
          "PRODUCTS",
          operatorName,
          `Mise à jour des informations de '${name}' (${selectedProduct.id})`,
          "INFO",
        );
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || err?.message || "Échec de l'opération.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (
    id: string,
    name: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (
      !confirm(
        `Êtes-vous absolument sûr de vouloir détruire définitivement le produit '${name}' ? Cette action supprimera également sa visibilité en caisse.`,
      )
    ) {
      return;
    }

    try {
      await onDeleteProduct(id);
      onAddAuditLog(
        "Produit supprimé",
        "PRODUCTS",
        operatorName,
        `Destruction définitive du produit '${name}' (ID: ${id})`,
        "CRITICAL",
      );
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Échec de la suppression.",
      );
    }
  };

  // Perform dynamic filtering and sorting locally
  const filteredProducts = products
    .filter((p) => {
      return (
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      if (typeof valA === "string" && typeof valB === "string") {
        const compare = valA.localeCompare(valB);
        return sortOrder === "asc" ? compare : -compare;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });

  const handleExportCSV = () => {
    alert(
      "Export CSV/Excel initié. Un tableur formaté contenant les coordonnées d'achat/vente de vos produits va être généré pour votre comptabilité.",
    );
  };

  return (
    <div
      id="product-module"
      className="space-y-6 font-sans antialiased text-slate-800"
    >
      {/* Title & Top triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Catalogue Articles & Produits
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gérez le catalogue officiel de l'entreprise, visualisez les marges
            théoriques et ajustez les alertes.
          </p>
        </div>

        {currentUser?.role !== "EMPLOYEE" && (
          <div className="flex items-center gap-2">
            <button
              id="products-export-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Excel / CSV</span>
            </button>

            <button
              id="products-add-btn"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 transition shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel Article</span>
            </button>
          </div>
        )}
      </div>

      {/* FILTERS & SEARCH ROW */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Recherche nom ou code-barres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full border border-slate-250/70 rounded-xl bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 transition"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as keyof Product)}
                className="block w-full border border-slate-250/70 rounded-xl bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 transition"
              >
                <option value="name">Trier par Nom</option>
                <option value="sellingPrice">Trier par Prix</option>
                <option value="quantity">Trier par Stock</option>
              </select>
            </div>

            <div className="flex border border-slate-200 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("TABLE")}
                className={`p-2 transition cursor-pointer ${viewMode === "TABLE" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-500 hover:text-slate-950"}`}
                title="Vue en tableau classique"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("CARDS")}
                className={`p-2 transition cursor-pointer ${viewMode === "CARDS" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-500 hover:text-slate-950"}`}
                title="Vue en grille cartes"
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CORE PRODUCTS DISCOVERY COMPONENT */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <Package className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-sm font-bold text-slate-800">
            Aucun produit ne correspond à ces critères
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Essayez de réinitialiser votre recherche ou créez un nouvel article
            pour garnir votre catalogue.
          </p>
        </div>
      ) : viewMode === "TABLE" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort("name")}
                  >
                    Article
                  </th>
                  <th className="py-3 px-4">Code Barre</th>
                  <th className="py-3 px-4">Unité</th>
                  {currentUser?.role !== "EMPLOYEE" && (
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                      onClick={() => handleSort("purchasePrice")}
                    >
                      P. Achat
                    </th>
                  )}
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                    onClick={() => handleSort("sellingPrice")}
                  >
                    P. Vente
                  </th>
                  {currentUser?.role !== "EMPLOYEE" && (
                    <th className="py-3 px-4 text-right">Marge théo</th>
                  )}
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 text-center"
                    onClick={() => handleSort("quantity")}
                  >
                    Stock qté
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((p) => {
                  const marginAmt = p.sellingPrice - p.purchasePrice;
                  const marginPct =
                    p.sellingPrice > 0 ? (marginAmt / p.sellingPrice) * 100 : 0;
                  const alertTriggered = p.quantity <= p.alertThreshold;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenViewModal(p)}
                      className="hover:bg-slate-50/55 cursor-pointer transition text-slate-700"
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <p className="truncate font-bold text-slate-900 max-w-[200px]">
                          {p.name}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Barcode className="h-3 w-3 text-slate-400" />{" "}
                          {p.barcode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {p.unit}
                        </span>
                      </td>

                      {currentUser?.role !== "EMPLOYEE" && (
                        <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                          {p.purchasePrice.toFixed(2)} €
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {p.sellingPrice.toFixed(2)} €
                      </td>

                      {currentUser?.role !== "EMPLOYEE" && (
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-semibold bg-emerald-50/10">
                          <span className="block">
                            {marginAmt.toFixed(2)} €
                          </span>
                          <span className="text-[10px] text-emerald-500 font-light">
                            ({marginPct.toFixed(0)}%)
                          </span>
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-xs ${alertTriggered ? "text-rose-600 font-black" : "text-slate-800"}`}
                          >
                            {p.quantity} {p.unit}
                          </span>
                          {p.quantity === 0 ? (
                            <span className="text-[8px] tracking-wider uppercase font-bold text-rose-500 bg-rose-50 px-1 rounded">
                              Rupture
                            </span>
                          ) : alertTriggered ? (
                            <span className="text-[8px] tracking-wider uppercase font-bold text-amber-500 bg-amber-50 px-1 rounded">
                              Seuil {p.alertThreshold}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenViewModal(p)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
                            title="Regarder en détail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {currentUser?.role !== "EMPLOYEE" && (
                            <>
                              <button
                                onClick={(e) => handleOpenEditModal(p, e)}
                                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
                                title="Modifier les dimensions"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(p.id, p.name, e)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition duration-150 cursor-pointer"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.quantity === 0;
            const alertTriggered = p.quantity <= p.alertThreshold;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenViewModal(p)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-400 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between overflow-hidden cursor-pointer relative group"
              >
                {isOutOfStock && (
                  <div className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    Rupture de Stock
                  </div>
                )}
                {!isOutOfStock && alertTriggered && (
                  <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    Critique
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 font-bold uppercase rounded tracking-wide">
                      {p.unit}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-1.5 line-clamp-1 group-hover:text-indigo-600 transition">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {p.barcode}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                      {p.description ||
                        "Aucune description fournie pour cet article."}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          P.V. Public
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {p.sellingPrice.toFixed(2)} €
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Stock dispo
                        </span>
                        <span
                          className={`text-xs font-bold font-mono ${alertTriggered ? "text-rose-600 font-extrabold" : "text-slate-800"}`}
                        >
                          {p.quantity} {p.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between mt-3 gap-2">
                      {currentUser?.role !== "EMPLOYEE" ? (
                        <>
                          <button
                            onClick={(e) => handleOpenEditModal(p, e)}
                            className="flex-1 text-center py-1.5 rounded-lg border border-slate-150 hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition cursor-pointer"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenViewModal(p);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                            title="Détails complets"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenViewModal(p);
                          }}
                          className="w-full text-center py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 font-bold hover:bg-indigo-105 text-[10px] text-indigo-700 transition cursor-pointer flex justify-center items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Consulter l'article
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAWER MODAL COMPONENT (FOR ADD / EDIT / VIEW) */}
      {isModalOpen && (
        <div
          id="product-modal-backdrop"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            id="product-modal-window"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in duration-150"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {modalMode === "ADD" && "Créer un nouvel article au catalogue"}
                {modalMode === "EDIT" && "Modifier la fiche produit"}
                {modalMode === "VIEW" && "Fiche Signalétique Article"}
              </h3>
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-950 transition cursor-pointer disabled:opacity-40"
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalMode === "VIEW" && selectedProduct ? (
              <div
                id="product-view-details"
                className="mt-4 space-y-4 text-slate-700"
              >
                <div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider">
                    {selectedProduct.unit}
                  </span>
                  <h4 className="text-base font-black text-slate-900 mt-1">
                    {selectedProduct.name}
                  </h4>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    ID: {selectedProduct.id}
                  </p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Code-barres: {selectedProduct.barcode}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  {currentUser?.role !== "EMPLOYEE" ? (
                    <>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                          Tarif d'Achat
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {selectedProduct.purchasePrice.toFixed(2)} €
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                          Tarif de Vente
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {selectedProduct.sellingPrice.toFixed(2)} €
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center col-span-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                        Tarif de Vente Public
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {selectedProduct.sellingPrice.toFixed(2)} €
                      </span>
                    </div>
                  )}
                </div>

                {currentUser?.role !== "EMPLOYEE" && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                      Taux de TVA
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedProduct.vatRate.toFixed(2)} %
                    </span>
                  </div>
                )}

                {currentUser?.role !== "EMPLOYEE" && (
                  <div className="bg-emerald-50/50 p-3.5 border border-emerald-100/70 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                        <Percent className="h-3.5 w-3.5 text-emerald-600" />
                        Rentabilité théorique (marge brute)
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-100">
                        +
                        {(
                          selectedProduct.sellingPrice -
                          selectedProduct.purchasePrice
                        ).toFixed(2)}{" "}
                        €
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-1.5 flex justify-between">
                      <span>Taux de marque :</span>
                      <span className="font-bold">
                        {(
                          ((selectedProduct.sellingPrice -
                            selectedProduct.purchasePrice) /
                            selectedProduct.sellingPrice) *
                          100
                        ).toFixed(1)}{" "}
                        %
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Description d'utilisation
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/20 p-3 border border-slate-100 rounded-xl">
                    {selectedProduct.description ||
                      "Aucune description détaillée n'a été saisie pour ce produit."}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Stock Courant
                  </span>
                  <span
                    className={`text-sm font-bold font-mono inline-flex items-center gap-1 ${
                      selectedProduct.quantity <= selectedProduct.alertThreshold
                        ? "text-rose-600"
                        : "text-slate-800"
                    }`}
                  >
                    {selectedProduct.quantity} {selectedProduct.unit}
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={(e) => handleOpenEditModal(selectedProduct, e)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Basculer en Édition
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-4 space-y-4 text-xs font-medium"
              >
                {formError && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="text-rose-800 font-semibold">
                      {formError}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 mb-1">
                      Nom du produit *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Chaise ajustable Noire"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 transition"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-700 mb-1">
                      Code-barres *
                    </label>
                    <input
                      type="text"
                      required
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="EAN-13"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">
                      Unité de mesure
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none transition"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">
                      Taux de TVA (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={vatRate}
                      onChange={(e) =>
                        setVatRate(parseFloat(e.target.value) || 0)
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">
                      Prix d'Achat HT (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={purchasePrice}
                      onChange={(e) =>
                        setPurchasePrice(parseFloat(e.target.value) || 0)
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">
                      Prix de Vente public TTC (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={sellingPrice}
                      onChange={(e) =>
                        setSellingPrice(parseFloat(e.target.value) || 0)
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">
                      Quantité initiale en Stock
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={quantity}
                      disabled={modalMode === "EDIT"}
                      onChange={(e) =>
                        setQuantity(parseInt(e.target.value) || 0)
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {modalMode === "EDIT" && (
                      <span className="text-[9px] text-slate-400 mt-1 block font-light">
                        ⚠️ Pour modifier le stock actuel, veuillez passer par
                        l'onglet de suivi des Stocks.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">
                      Seuil critique d'alerte
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={alertThreshold}
                      onChange={(e) =>
                        setAlertThreshold(parseInt(e.target.value) || 0)
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    Description marketing / technique
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Renseignez les caractéristiques physiques et matérielles de l'élément..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none transition leading-normal"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? "Enregistrement..."
                      : modalMode === "ADD"
                        ? "Certifier le Produit"
                        : "Appliquer les Modifications"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50/80 transition cursor-pointer disabled:opacity-50"
                  >
                    Fermer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
