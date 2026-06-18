/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Users2,
  Building,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Award,
  ShoppingBag,
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { Client, Supplier, Sale, Product } from "../types";
// AuditModule et AuditSeverity sont définis dans AppProvider et exportés
// pour éviter de dupliquer l'union littérale dans chaque composant.
import { AuditModule, AuditSeverity } from "../components/AppProvider";

interface ContactManagementProps {
  clients: Client[];
  suppliers: Supplier[];
  sales: Sale[];
  products: Product[];
  onAddClient: (client: Omit<Client, "id" | "createdAt">) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onAddSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  /**
   * Handler d'audit commun à toute l'application.
   * Le paramètre `module` accepte toute valeur de l'union `AuditModule`,
   * dont "CLIENTS" et "SUPPLIERS" utilisés dans ce composant.
   */
  onAddAuditLog: (
    action: string,
    module: AuditModule,
    performedBy: string,
    details: string,
    severity: AuditSeverity,
  ) => void;
  operatorName: string;
}

export default function ContactManagement({
  clients,
  suppliers,
  sales,
  products,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddAuditLog,
  operatorName,
}: ContactManagementProps) {
  // Tab switcher: 'CLIENTS' or 'SUPPLIERS'
  const [activeTab, setActiveTab] = useState<"CLIENTS" | "SUPPLIERS">(
    "CLIENTS",
  );
  const [search, setSearch] = useState("");

  // Modals controllers
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<
    | "ADD_CLIENT"
    | "EDIT_CLIENT"
    | "ADD_SUPPLIER"
    | "EDIT_SUPPLIER"
    | "VIEW_CLIENT_SALES"
  >("ADD_CLIENT");

  // Selection states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  // Client form state
  const [cliName, setCliName] = useState("");
  const [cliEmail, setCliEmail] = useState("");
  const [cliPhone, setCliPhone] = useState("");
  const [cliAddress, setCliAddress] = useState("");
  const [cliPoints, setCliPoints] = useState(0);

  // Supplier form state
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supCategories, setSupCategories] = useState<string[]>([
    "Électronique",
  ]);

  // ── Handlers formulaire Client ────────────────────────────────────────────

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliName || !cliEmail) {
      alert("Le nom et l'email sont obligatoires !");
      return;
    }

    if (mode === "ADD_CLIENT") {
      onAddClient({
        name: cliName,
        email: cliEmail,
        phone: cliPhone,
        address: cliAddress,
        loyaltyPoints: cliPoints,
        totalSpent: 0,
      });
      onAddAuditLog(
        "Client créé",
        "CLIENTS",
        operatorName,
        `Enregistrement du client fidélité '${cliName}' (${cliEmail})`,
        "INFO",
      );
    } else if (mode === "EDIT_CLIENT" && selectedClient) {
      onUpdateClient({
        ...selectedClient,
        name: cliName,
        email: cliEmail,
        phone: cliPhone,
        address: cliAddress,
        loyaltyPoints: cliPoints,
      });
      onAddAuditLog(
        "Client modifié",
        "CLIENTS",
        operatorName,
        `Modif client '${cliName}' (${selectedClient.id})`,
        "INFO",
      );
    }
    setIsOpen(false);
  };

  // ── Handlers formulaire Fournisseur ──────────────────────────────────────

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supEmail) {
      alert("Le nom d'entreprise et l'email sont obligatoires !");
      return;
    }

    if (mode === "ADD_SUPPLIER") {
      onAddSupplier({
        name: supName,
        contactName: supContact,
        email: supEmail,
        phone: supPhone,
        address: supAddress,
        categories: supCategories,
      });
      onAddAuditLog(
        "Fournisseur créé",
        "SUPPLIERS",
        operatorName,
        `Nouveau fournisseur partenaire '${supName}' enregistré`,
        "INFO",
      );
    } else if (mode === "EDIT_SUPPLIER" && selectedSupplier) {
      onUpdateSupplier({
        ...selectedSupplier,
        name: supName,
        contactName: supContact,
        email: supEmail,
        phone: supPhone,
        address: supAddress,
        categories: supCategories,
      });
      onAddAuditLog(
        "Fournisseur modifié",
        "SUPPLIERS",
        operatorName,
        `Modif informations partenaire '${supName}' (${selectedSupplier.id})`,
        "INFO",
      );
    }
    setIsOpen(false);
  };

  // ── Ouverture des modales ─────────────────────────────────────────────────

  const handleOpenAddClient = () => {
    setMode("ADD_CLIENT");
    setCliName("");
    setCliEmail("");
    setCliPhone("");
    setCliAddress("");
    setCliPoints(0);
    setIsOpen(true);
  };

  const handleOpenEditClient = (c: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setMode("EDIT_CLIENT");
    setSelectedClient(c);
    setCliName(c.name);
    setCliEmail(c.email);
    setCliPhone(c.phone);
    setCliAddress(c.address);
    setCliPoints(c.loyaltyPoints);
    setIsOpen(true);
  };

  const handleOpenAddSupplier = () => {
    setMode("ADD_SUPPLIER");
    setSupName("");
    setSupContact("");
    setSupEmail("");
    setSupPhone("");
    setSupAddress("");
    setSupCategories(["Électronique"]);
    setIsOpen(true);
  };

  const handleOpenEditSupplier = (s: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setMode("EDIT_SUPPLIER");
    setSelectedSupplier(s);
    setSupName(s.name);
    setSupContact(s.contactName);
    setSupEmail(s.email);
    setSupPhone(s.phone);
    setSupAddress(s.address);
    setSupCategories(s.categories);
    setIsOpen(true);
  };

  const handleOpenViewHistory = (c: Client) => {
    setMode("VIEW_CLIENT_SALES");
    setSelectedClient(c);
    setIsOpen(true);
  };

  // ── Suppressions ──────────────────────────────────────────────────────────

  const handleDeleteCli = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer le compte client de '${name}' ? Ses données d'historique de fidélisation seront révoquées.`,
      )
    ) {
      onDeleteClient(id);
      onAddAuditLog(
        "Client supprimé",
        "CLIENTS",
        operatorName,
        `Désinscription client '${name}' (ID: ${id})`,
        "WARNING",
      );
    }
  };

  const handleDeleteSup = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Alerte de sécurité : Supprimer définitivement le partenaire '${name}' ? Cette action n'impactera pas vos produits existants mais éliminera le lien de réapprovisionnement.`,
      )
    ) {
      onDeleteSupplier(id);
      onAddAuditLog(
        "Fournisseur supprimé",
        "SUPPLIERS",
        operatorName,
        `Destruction fiche fournisseur '${name}' (ID: ${id})`,
        "CRITICAL",
      );
    }
  };

  // ── Filtres de recherche ──────────────────────────────────────────────────

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.contactName.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div
      id="contacts-directories-module"
      className="space-y-6 font-sans antialiased text-slate-800"
    >
      {/* Titre & navigation par onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Tiers & Annuaire professionnel
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gérez vos clients fidélisés, pilotez les coordonnées des
            fournisseurs logistiques et inspectez les transactions.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-205">
          <button
            onClick={() => {
              setActiveTab("CLIENTS");
              setSearch("");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "CLIENTS"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users2 className="h-4 w-4" />
            Portefeuille Clients ({clients.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("SUPPLIERS");
              setSearch("");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "SUPPLIERS"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building className="h-4 w-4" />
            Fiches Fournisseurs ({suppliers.length})
          </button>
        </div>
      </div>

      {/* Barre de recherche & bouton d'ajout */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder={
              activeTab === "CLIENTS"
                ? "Filtrer client par nom, email..."
                : "Filtrer fournisseur par enseigne..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full border border-slate-200 rounded-xl bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 transition"
          />
        </div>

        <div>
          {activeTab === "CLIENTS" ? (
            <button
              id="clients-add-btn"
              onClick={handleOpenAddClient}
              className="inline-flex items-center gap-1 px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nouveau Client
            </button>
          ) : (
            <button
              id="suppliers-add-btn"
              onClick={handleOpenAddSupplier}
              className="inline-flex items-center gap-1 px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nouveau Partenaire
            </button>
          )}
        </div>
      </div>

      {/* Tables de données */}
      {activeTab === "CLIENTS" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Adresse Géographique</th>
                  <th className="py-3 px-4 text-center">Fidélité cumulée</th>
                  <th className="py-3 px-4 text-right">CA Total Hors-Taxe</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredClients.map((c) => {
                  const mySales = sales.filter(
                    (s) => s.clientId === c.id && s.status === "COMPLETED",
                  );
                  const actualSpent = mySales.reduce(
                    (sum, s) => sum + s.subTotal,
                    0,
                  );

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenViewHistory(c)}
                      className="hover:bg-slate-50/50 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {c.email}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />{" "}
                          {c.phone || "Non renseigné"}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-4 text-slate-500 max-w-[220px] truncate"
                        title={c.address}
                      >
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />{" "}
                          {c.address || "Adresse non fournie"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 rounded-full text-[10px] font-bold text-amber-800 border border-amber-200">
                          <Award className="h-3.5 w-3.5 text-amber-600" />{" "}
                          {c.loyaltyPoints} points
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {actualSpent > 0
                          ? actualSpent.toLocaleString()
                          : (c.totalSpent || 0).toLocaleString()}{" "}
                        €
                      </td>

                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleOpenViewHistory(c)}
                            className="p-1 text-slate-450 hover:text-indigo-600 rounded hover:bg-slate-55 cursor-pointer"
                            title="Historique des factures"
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEditClient(c, e)}
                            className="p-1 text-slate-450 hover:text-slate-905 rounded hover:bg-slate-55 cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteCli(c.id, c.name, e)}
                            className="p-1 text-slate-450 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-3 px-4">Entreprise & Contact principal</th>
                  <th className="py-3 px-4">Coordonnées logistiques</th>
                  <th className="py-3 px-4">Adresse Dépôt</th>
                  <th className="py-3 px-4">Catégories livrées</th>
                  <th className="py-3 px-4 text-center">Catalogue géré</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredSuppliers.map((s) => {
                  const myProds = products.filter((p) => p.supplierId === s.id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/45 transition">
                      <td className="py-3.5 px-4 font-medium">
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Resp:{" "}
                          <span className="font-bold font-sans text-slate-500">
                            {s.contactName}
                          </span>
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] space-y-0.5">
                        <p className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" /> {s.email}
                        </p>
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {s.phone}
                        </p>
                      </td>

                      <td
                        className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate"
                        title={s.address}
                      >
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />{" "}
                          {s.address}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {s.categories.map((cat, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-650 uppercase"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 text-[10px]">
                          {myProds.length} articles
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={(e) => handleOpenEditSupplier(s, e)}
                            className="p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                            title="Modifier la fiche"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSup(s.id, s.name, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 flex flex-col justify-between max-h-[85vh] overflow-y-auto animate-in zoom-in duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900">
                {mode === "ADD_CLIENT" &&
                  "Enregistrer un nouveau client de fidélité"}
                {mode === "EDIT_CLIENT" && "Éditer les données client"}
                {mode === "ADD_SUPPLIER" &&
                  "Référencer un nouveau partenaire fournisseur"}
                {mode === "EDIT_SUPPLIER" &&
                  "Éditer la fiche logistique fournisseur"}
                {mode === "VIEW_CLIENT_SALES" &&
                  "Registre des Achats du client"}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Historique achats client */}
            {mode === "VIEW_CLIENT_SALES" && selectedClient ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 items-center">
                  <div className="h-10 w-10 rounded-full bg-slate-350 flex items-center justify-center text-slate-700 font-bold uppercase shrink-0">
                    {selectedClient.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {selectedClient.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {selectedClient.email}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-1 inline-block">
                      ⭐ Statut fidélité : {selectedClient.loyaltyPoints} points
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Historique transactions facturées :
                  </span>
                  <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
                    {sales.filter((s) => s.clientId === selectedClient.id)
                      .length === 0 ? (
                      <p className="text-xs text-center text-slate-400 py-6">
                        Aucune vente POS enregistrée pour ce client.
                      </p>
                    ) : (
                      sales
                        .filter((s) => s.clientId === selectedClient.id)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="py-2.5 flex justify-between items-center text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-800">{s.id}</p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(s.createdAt).toLocaleDateString(
                                  "fr-FR",
                                )}{" "}
                                • {s.paymentMethod}
                              </span>
                            </div>
                            <span
                              className={`font-mono font-bold ${s.status === "CANCELLED" ? "line-through text-slate-400" : "text-slate-900"}`}
                            >
                              {s.total.toFixed(2)} €
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fermer l'historique
                </button>
              </div>
            ) : mode === "ADD_CLIENT" || mode === "EDIT_CLIENT" ? (
              /* Formulaire Client */
              <form
                onSubmit={handleClientSubmit}
                className="space-y-4 text-xs font-medium"
              >
                <div>
                  <label className="block text-slate-700 mb-1">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={cliName}
                    onChange={(e) => setCliName(e.target.value)}
                    placeholder="ex: Jean de la fontaine"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    Email principal *
                  </label>
                  <input
                    type="email"
                    required
                    value={cliEmail}
                    onChange={(e) => setCliEmail(e.target.value)}
                    placeholder="ex: client@gmail.com"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={cliPhone}
                    onChange={(e) => setCliPhone(e.target.value)}
                    placeholder="ex: +237 6 99 00 00 00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    Adresse postale
                  </label>
                  <input
                    type="text"
                    value={cliAddress}
                    onChange={(e) => setCliAddress(e.target.value)}
                    placeholder="ex: Bastos, Yaoundé, CM"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    Points fidélité d'entrée
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cliPoints}
                    onChange={(e) =>
                      setCliPoints(parseInt(e.target.value) || 0)
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition"
                  >
                    Enregistrer la fiche Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50 cursor-pointer transition"
                  >
                    Fermer
                  </button>
                </div>
              </form>
            ) : (
              /* Formulaire Fournisseur */
              <form
                onSubmit={handleSupplierSubmit}
                className="space-y-4 text-xs font-medium"
              >
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Nom Enseigne *
                  </label>
                  <input
                    type="text"
                    required
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="ex: Global Distribution SAS"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    Contact Représentant *
                  </label>
                  <input
                    type="text"
                    required
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="ex: Marc Fontaine"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    Email de commande *
                  </label>
                  <input
                    type="email"
                    required
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="ex: commandes@globaldist.com"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    Téléphone logistique
                  </label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="ex: +237 2 22 00 00 00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    Adresse Dépôt / Siège
                  </label>
                  <input
                    type="text"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    placeholder="ex: Zone Industrielle, Douala, CM"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/55 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition"
                  >
                    Enregistrer la fiche Fournisseur
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50 cursor-pointer transition"
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
