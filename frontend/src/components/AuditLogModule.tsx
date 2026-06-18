/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { History, Search, Terminal, AlertCircle, RefreshCw, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogModuleProps {
  auditLogs: AuditLog[];
}

export default function AuditLogModule({ auditLogs }: AuditLogModuleProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [rowLimit, setRowLimit] = useState<string>('20');

  // Extract unique authors dynamically from audit logs
  const uniqueAuthors = useMemo(() => {
    const authorsSet = new Set(auditLogs.map((log) => log.performedBy || 'Inconnu'));
    return Array.from(authorsSet).filter(Boolean).sort();
  }, [auditLogs]);

  // Extract unique modules dynamically
  const uniqueModules = useMemo(() => {
    const modulesSet = new Set(auditLogs.map((log) => log.module));
    return Array.from(modulesSet).filter(Boolean).sort();
  }, [auditLogs]);

  // Filter logs list
  const filteredLogs = auditLogs.filter((log) => {
    // 1. Severity filter
    const matchSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
    
    // 2. Text keyword filter
    const matchText = 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase());
                      
    // 3. Date filter matching YYYY-MM-DD
    let matchDate = true;
    if (dateFilter && log.timestamp) {
      const logDateStr = new Date(log.timestamp).toISOString().substring(0, 10);
      matchDate = logDateStr === dateFilter;
    }
    
    // 4. PerformedBy author filter
    const matchAuthor = authorFilter === 'ALL' || (log.performedBy || 'Inconnu') === authorFilter;

    // 5. Module filter
    const matchModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    
    return matchSeverity && matchText && matchDate && matchAuthor && matchModule;
  });

  // Sort chronological descending (latest logs first) and slice by rowLimit
  const displayedLogs = useMemo(() => {
    const sorted = [...filteredLogs].reverse();
    if (rowLimit === 'ALL') {
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
      const clean = val ? String(val).replace(/"/g, '""') : '';
      if (clean.includes(';') || clean.includes('\n') || clean.includes('"') || clean.includes(',')) {
        return `"${clean}"`;
      }
      return clean;
    };

    // French Excel uses semicolons for CSV
    const headers = ["ID", "Horodatage", "Gravite", "Action", "Module", "Auteur", "Details"];
    const csvContent = [
      headers.join(';'),
      ...filteredLogs.map(log => [
        escapeCSV(log.id),
        escapeCSV(new Date(log.timestamp).toLocaleString('fr-FR')),
        escapeCSV(log.severity),
        escapeCSV(log.action),
        escapeCSV(log.module),
        escapeCSV(log.performedBy || 'Inconnu'),
        escapeCSV(log.details)
      ].join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestampStr = new Date().toISOString().substring(0, 10);
    link.href = url;
    link.setAttribute('download', `journal_audit_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export as functional .log file (syslog standard style format)
  const handleExportLOG = () => {
    if (filteredLogs.length === 0) {
      alert("Aucun log à exporter avec les filtres actuels.");
      return;
    }

    const logContent = filteredLogs.map(log => {
      const stamp = new Date(log.timestamp).toISOString();
      const severity = log.severity.padEnd(8);
      const mod = log.module.padEnd(10);
      const author = log.performedBy || 'Inconnu';
      return `[${stamp}] [${severity}] [${mod}] - ${author} - ${log.action} | Details: ${log.details}`;
    }).join('\n');

    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestampStr = new Date().toISOString().substring(0, 10);
    link.href = url;
    link.setAttribute('download', `journal_audit_${timestampStr}.log`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="audit-log-module" className="space-y-6 font-sans antialiased text-slate-800">
      
      {/* Upper overview stats header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Événements</span>
          <span className="text-xl font-black text-slate-900 mt-1">{auditLogs.length} logs</span>
        </div>
        <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Correspondants</span>
          <span className="text-xl font-black text-indigo-950 mt-1">{filteredLogs.length} trouvés</span>
        </div>
        <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Erreurs / Alertes</span>
          <span className="text-xl font-black text-rose-950 mt-1">
            {auditLogs.filter(l => l.severity === 'CRITICAL' || l.severity === 'WARNING').length} critiques
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        
        {/* Title row with export buttons */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="max-w-xl">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" /> Registre d'Audit des Actions Tracées (Réglementation)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Conforme aux exigences de traçabilité, de conformité légale et aux contrôles fiscaux de caisse.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Exporter toutes les entrées filtrées au format Excel/CSV"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exporter Excel (.csv)</span>
            </button>

            {/* Export Log Button */}
            <button
              type="button"
              onClick={handleExportLOG}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-850 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Télécharger un fichier de logs système .log fonctionnel"
            >
              <FileText className="h-3.5 w-3.5 text-slate-600" />
              <span>Exporter Logs (.log)</span>
            </button>

            {((search || severityFilter !== 'ALL' || authorFilter !== 'ALL' || moduleFilter !== 'ALL' || dateFilter)) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSeverityFilter('ALL');
                  setAuthorFilter('ALL');
                  setModuleFilter('ALL');
                  setDateFilter('');
                }}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="h-3 w-3 shrink-0" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters bar */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* 1. Mots-clés */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Recherche</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Mots-clés..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full border border-slate-200 bg-white rounded-xl pl-8 pr-2 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:border-indigo-500 transition font-medium"
              />
            </div>
          </div>

          {/* 2. Gravité */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Gravité</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">Tous les niveaux</option>
              <option value="INFO">🟢 INFO</option>
              <option value="WARNING">🟡 WARNING</option>
              <option value="CRITICAL">🔴 CRITICAL</option>
            </select>
          </div>

          {/* 3. Auteur */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Auteur / Opérateur</label>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">Tous les auteurs</option>
              {uniqueAuthors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* 4. Date de l'action */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Date de l'action</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-medium focus:outline-none focus:border-indigo-500 text-slate-700"
            />
          </div>

          {/* 5. Lignes attendues */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Lignes attendues</label>
            <select
              value={rowLimit}
              onChange={(e) => setRowLimit(e.target.value)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="10">10 premières</option>
              <option value="20">20 premières</option>
              <option value="50">50 premières</option>
              <option value="100">100 premières</option>
              <option value="ALL">Tout afficher (Sans limites)</option>
            </select>
          </div>

        </div>

        {/* Dynamic Table list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4 text-center">Gravité</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Auteur</th>
                <th className="py-3 px-4">Détails Exhaustifs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Aucun enregistrement d'audit ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => {
                  const isCritical = log.severity === 'CRITICAL';
                  const isWarning = log.severity === 'WARNING';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono text-[10.5px] text-slate-450 text-slate-400">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-bold leading-none ${
                          isCritical ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                          isWarning ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                          'bg-emerald-50 text-emerald-850 border border-emerald-100 text-emerald-800'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-805 text-slate-800">{log.action}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[9.5px] font-extrabold text-slate-500 border border-slate-200">
                          {log.module}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-650 text-slate-700">{log.performedBy || 'Inconnu'}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-medium leading-relaxed max-w-sm truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info showing filtered/total entries count */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center text-[10.5px] text-slate-400 font-semibold font-mono">
          © Registre d'audit immuable de l'application • {filteredLogs.length} entrées visibles sur un total de {auditLogs.length}
        </div>

      </div>

    </div>
  );
}
