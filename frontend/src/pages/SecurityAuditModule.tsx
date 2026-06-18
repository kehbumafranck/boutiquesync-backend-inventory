/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ShieldAlert,
  Terminal,
  Cpu,
  Tv,
  Globe,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  Smartphone,
  Server,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";
import { AuditLog, ConnectedDevice } from "../types";
// AuditModule et AuditSeverity sont définis dans AppProvider et exportés
// pour éviter de dupliquer l'union littérale dans chaque composant.
import { AuditModule, AuditSeverity } from "../components/AppProvider";

interface SecurityAuditModuleProps {
  auditLogs: AuditLog[];
  connectedDevices: ConnectedDevice[];
  onTerminateSession: (id: string) => void;
  onAddAuditLog: (
    action: string,
    module: AuditModule,
    performedBy: string,
    details: string,
    severity: AuditSeverity,
  ) => void;
  operatorName: string;
}

export default function SecurityAuditModule({
  auditLogs,
  connectedDevices,
  onTerminateSession,
  onAddAuditLog,
  operatorName,
}: SecurityAuditModuleProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<
    "ALL" | "INFO" | "WARNING" | "CRITICAL"
  >("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("ALL");
  const [rowLimit, setRowLimit] = useState<string>("20");

  const handleTerminate = (id: string, name: string) => {
    if (
      confirm(
        `Alerte de sécurité : Êtes-vous sûr de vouloir révoquer et forcer la fermeture immédiate de la session active sur le terminal : ${name} ?`,
      )
    ) {
      onTerminateSession(id);

      onAddAuditLog(
        "Révocation de session",
        "SECURITY",
        operatorName,
        `Fermeture forcée de la session active pour l'hôte: ${name} (ID: ${id})`,
        "WARNING",
      );

      alert(
        `La session sur '${name}' a été révoquée. L'opérateur correspondant devra se réauthentifier.`,
      );
    }
  };

  const handleMfaPolicyToggle = () => {
    alert(
      "Simulation de déploiement de politique d'authentification forte : Le MFA OTP par email/appareil est maintenant forcé par défaut pour tous les nouveaux collaborateurs d'un niveau d'autorisation ADMINISTRATEUR.",
    );

    onAddAuditLog(
      "MFA Politique durcie",
      "SECURITY",
      operatorName,
      `Changement global des contraintes de sécurité d'accès MFA`,
      "CRITICAL",
    );
  };

  // Extract unique authors dynamically from all logs
  const uniqueAuthors = React.useMemo(() => {
    const authorsSet = new Set(
      auditLogs.map((log) => log.performedBy || "Inconnu"),
    );
    return Array.from(authorsSet).filter(Boolean).sort();
  }, [auditLogs]);

  // Filter logs list
  const filteredLogs = auditLogs.filter((log) => {
    // 1. Severity level filter
    const matchSeverity =
      severityFilter === "ALL" || log.severity === severityFilter;

    // 2. Text keyword filter
    const matchText =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase());

    // 3. Date filter matching YYYY-MM-DD in the user's local timezone
    let matchDate = true;
    if (dateFilter && log.timestamp) {
      try {
        const d = new Date(log.timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const logLocalDateStr = `${year}-${month}-${day}`;
        matchDate = logLocalDateStr === dateFilter;
      } catch (e) {
        matchDate = false;
      }
    }

    // 4. PerformedBy author filter
    const matchAuthor =
      authorFilter === "ALL" || (log.performedBy || "Inconnu") === authorFilter;

    return matchSeverity && matchText && matchDate && matchAuthor;
  });

  // Sort chronological descending and slice by rows limit
  const paginatedLogs = React.useMemo(() => {
    const sorted = [...filteredLogs].reverse();
    if (rowLimit === "ALL") {
      return sorted;
    }
    return sorted.slice(0, Number(rowLimit));
  }, [filteredLogs, rowLimit]);

  // Export as Excel-compatible CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("Aucun log à exporter avec les filtres actuels.");
      return;
    }

    const escapeCSV = (val: string) => {
      const clean = val ? String(val).replace(/"/g, '""') : "";
      if (
        clean.includes(";") ||
        clean.includes("\n") ||
        clean.includes('"') ||
        clean.includes(",")
      ) {
        return `"${clean}"`;
      }
      return clean;
    };

    const headers = [
      "ID",
      "Horodatage",
      "Gravite",
      "Action",
      "Module",
      "Auteur",
      "Details",
    ];
    const csvContent = [
      headers.join(";"),
      ...filteredLogs.map((log) =>
        [
          escapeCSV(log.id),
          escapeCSV(new Date(log.timestamp).toLocaleString("fr-FR")),
          escapeCSV(log.severity),
          escapeCSV(log.action),
          escapeCSV(log.module),
          escapeCSV(log.performedBy || "Inconnu"),
          escapeCSV(log.details),
        ].join(";"),
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const timestampStr = new Date().toISOString().substring(0, 10);
    link.href = url;
    link.setAttribute("download", `journal_securite_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export as functional .log file (syslog format)
  const handleExportLOG = () => {
    if (filteredLogs.length === 0) {
      alert("Aucun log à exporter avec les filtres actuels.");
      return;
    }

    const logContent = filteredLogs
      .map((log) => {
        const stamp = new Date(log.timestamp).toISOString();
        const severity = log.severity.padEnd(8);
        const mod = log.module.padEnd(10);
        const author = log.performedBy || "Inconnu";
        return `[${stamp}] [${severity}] [${mod}] - ${author} - ${log.action} | Details: ${log.details}`;
      })
      .join("\n");

    const blob = new Blob([logContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const timestampStr = new Date().toISOString().substring(0, 10);
    link.href = url;
    link.setAttribute("download", `journal_securite_${timestampStr}.log`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="security-audit-module"
      className="space-y-6 font-sans antialiased text-slate-800"
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Sécurité, Accréditations & Audits
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervisez les journaux de traçabilité cryptographique de
            l'entreprise et fermez à distance les sessions suspectes.
          </p>
        </div>

        <div>
          <button
            onClick={handleMfaPolicyToggle}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            <span>Forcer MFA Administrateurs</span>
          </button>
        </div>
      </div>

      {/* LOWER SPLIT GRID DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Connected sessions / terminals (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 border border-slate-200 rounded-3xl shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-slate-400" /> Terminaux
              connectés actifs ({connectedDevices.length})
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Sessions actives détenant actuellement un jeton d'authentification
              valide.
            </p>
          </div>

          <div className="space-y-3">
            {connectedDevices.map((dev) => {
              const isDesktop =
                dev.device.toLowerCase().includes("mac") ||
                dev.device.toLowerCase().includes("windows") ||
                dev.device.toLowerCase().includes("chrome") ||
                dev.device.toLowerCase().includes("pc");
              return (
                <div
                  key={dev.id}
                  className="p-3 border border-slate-100 rounded-2xl bg-slate-50/50 flex items-start gap-3 relative hover:border-slate-300 transition"
                >
                  <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {isDesktop ? (
                      <Tv className="h-4 w-4 text-slate-600" />
                    ) : (
                      <Smartphone className="h-4 w-4 text-slate-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-slate-900 truncate">
                      {dev.device}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      IP: {dev.ip} • Loc: {dev.location}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-slate-500 bg-slate-200/50 rounded p-0.5 px-1 mt-1 font-bold">
                      Activité : {dev.lastActive}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTerminate(dev.id, dev.device)}
                    className="p-1 hover:text-rose-650 hover:bg-rose-50 text-rose-500 rounded cursor-pointer self-start"
                    title="Forcer la déconnexion immédiate du terminal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Audit log ledger timeline (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between self-stretch">
          {/* Timeline tools header with title & count details */}
          <div className="p-4 border-b border-slate-100/80 bg-slate-50/55 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-indigo-500" /> Registre
                d'Audit & Historique de Sécurité
              </span>
              <p className="text-[10px] text-slate-500 font-medium">
                Affichage de {paginatedLogs.length} sur {filteredLogs.length}{" "}
                entrées correspondantes ({auditLogs.length} au total)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              {/* Export Excel Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-850 text-[10px] font-bold rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Exporter toutes les entrées filtrées au format Excel/CSV"
              >
                <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
                <span>Format Excel (.csv)</span>
              </button>

              {/* Export Log Button */}
              <button
                type="button"
                onClick={handleExportLOG}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-800 text-[10px] font-bold rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Télécharger les logs au format syslog"
              >
                <FileText className="h-3 w-3 text-slate-600" />
                <span>Fichier Logs (.log)</span>
              </button>

              {(search ||
                severityFilter !== "ALL" ||
                authorFilter !== "ALL" ||
                dateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSeverityFilter("ALL");
                    setAuthorFilter("ALL");
                    setDateFilter("");
                  }}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <RefreshCw className="h-3 w-3 shrink-0" />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>
          </div>

          {/* Sieve Filters layout container - Responsive grid */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {/* 1. Text Search Input */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Recherche
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Search className="h-3 w-3 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Mots-clés..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full border border-slate-200 bg-white rounded-xl pl-6 pr-2 py-1.5 text-[11px] text-slate-900 focus:outline-none transition font-medium"
                />
              </div>
            </div>

            {/* 2. Severity Level Dropdown */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Gravité
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none text-slate-700"
              >
                <option value="ALL">Tous les niveaux</option>
                <option value="INFO">🟢 INFO</option>
                <option value="WARNING">🟡 WARNING</option>
                <option value="CRITICAL">🔴 CRITICAL</option>
              </select>
            </div>

            {/* 3. Author / PerformedBy Dropdown */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Auteur / Opérateur
              </label>
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none text-slate-700"
              >
                <option value="ALL">Tous les auteurs</option>
                {uniqueAuthors.map((author) => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Date Picker Input */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-medium focus:outline-none text-slate-705 text-slate-700"
              />
            </div>

            {/* 5. Row limit selection */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Lignes attendues
              </label>
              <select
                value={rowLimit}
                onChange={(e) => setRowLimit(e.target.value)}
                className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none text-slate-700"
              >
                <option value="10">10 premières</option>
                <option value="20">20 premières</option>
                <option value="50">50 premières</option>
                <option value="100">100 premières</option>
                <option value="ALL">Tout afficher</option>
              </select>
            </div>
          </div>

          {/* Ledger records container */}
          <div className="overflow-x-auto max-h-[360px] hierarchy-scroll">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/15 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                  <th className="py-2.5 px-4">Date & Heure</th>
                  <th className="py-2.5 px-4 text-center">Niveau</th>
                  <th className="py-2.5 px-4">Action traçable</th>
                  <th className="py-2.5 px-4">Auteur</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">
                    Paramètres / Détails exhaustifs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                {paginatedLogs.map((log) => {
                  const isCrit = log.severity === "CRITICAL";
                  const isWarn = log.severity === "WARNING";

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/45 transition"
                    >
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex px-1.5 py-0.2 rounded-full text-[8px] font-black font-mono ${
                            isCrit
                              ? "bg-rose-50 text-rose-800 border border-rose-100"
                              : isWarn
                                ? "bg-amber-50 text-amber-850 text-amber-805 text-amber-800"
                                : "bg-emerald-55 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-slate-805 text-slate-800">
                        {log.action}
                      </td>

                      <td className="py-2.5 px-4 font-bold text-slate-705 text-slate-700 whitespace-nowrap">
                        {log.performedBy}
                      </td>

                      <td
                        className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-sm hidden sm:table-cell"
                        title={log.details}
                      >
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
