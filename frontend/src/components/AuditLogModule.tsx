/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AuditLogModule — Journal d'audit temps réel.
 * - Chargement depuis MongoDB via GET /api/audit-logs
 * - Polling automatique toutes les 30 secondes
 * - Bouton de rafraîchissement manuel
 * - Suppression d'un log ou purge complète
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { History, Search, RefreshCw, FileSpreadsheet, FileText, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { AuditLog } from '../types';
import { boutiqueApi } from '../services/apiClient';

interface AuditLogModuleProps {
  /** Logs initiaux passés par AppProvider (chargés au login) */
  auditLogs: AuditLog[];
}

export default function AuditLogModule({ auditLogs: initialLogs }: AuditLogModuleProps) {
  // Logs locaux — mis à jour par polling ou rafraîchissement manuel
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Filtres
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('ALL');
  const [rowLimit, setRowLimit] = useState<string>('20');

  // ── Chargement depuis le backend ─────────────────────────────────────────
  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const fresh = await boutiqueApi.auditLogs.list(0, 200);
      setLogs(fresh as AuditLog[]);
      setLastRefresh(new Date());
    } catch (err) {
      console.warn('[AuditLogModule] Impossible de charger les logs.', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Charge dès le montage
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Polling automatique toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => fetchLogs(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // ── Suppression ──────────────────────────────────────────────────────────
  const handleDeleteOne = async (id: string) => {
    if (!confirm('Supprimer définitivement ce log d\'audit ?')) return;
    try {
      await boutiqueApi.auditLogs.deleteOne(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert('Échec de la suppression.');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('⚠️ Purger TOUT le journal d\'audit ? Cette action est irréversible.')) return;
    try {
      await boutiqueApi.auditLogs.deleteAll();
      setLogs([]);
    } catch {
      alert('Échec de la purge.');
    }
  };

  // ── Auteurs uniques pour le filtre ────────────────────────────────────────
  const uniqueAuthors = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.performedBy || 'système'))).sort();
  }, [logs]);

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
      const matchText =
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.details?.toLowerCase().includes(search.toLowerCase()) ||
        log.performedBy?.toLowerCase().includes(search.toLowerCase());
      let matchDate = true;
      if (dateFilter && log.timestamp) {
        matchDate = new Date(log.timestamp).toISOString().substring(0, 10) === dateFilter;
      }
      const matchAuthor = authorFilter === 'ALL' || (log.performedBy || 'système') === authorFilter;
      return matchSeverity && matchText && matchDate && matchAuthor;
    });
  }, [logs, search, severityFilter, dateFilter, authorFilter]);

  const displayedLogs = useMemo(() => {
    const sorted = [...filteredLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return rowLimit === 'ALL' ? sorted : sorted.slice(0, Number(rowLimit));
  }, [filteredLogs, rowLimit]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) { alert('Aucun log à exporter.'); return; }
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((l) => [
      esc(l.id), esc(new Date(l.timestamp).toLocaleString('fr-FR')),
      esc(l.severity), esc(l.action), esc(l.module),
      esc(l.performedBy), esc(l.details),
    ].join(';'));
    const csv = ['ID;Horodatage;Gravite;Action;Module;Auteur;Details', ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const handleExportLOG = () => {
    if (filteredLogs.length === 0) { alert('Aucun log à exporter.'); return; }
    const content = filteredLogs.map((l) =>
      `[${new Date(l.timestamp).toISOString()}] [${l.severity.padEnd(8)}] [${l.module.padEnd(10)}] ${l.performedBy} - ${l.action} | ${l.details}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_${new Date().toISOString().substring(0, 10)}.log`;
    a.click();
  };

  return (
    <div id="audit-log-module" className="space-y-6 font-sans antialiased text-slate-800">

      {/* Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Événements</span>
          <span className="text-xl font-black text-slate-900 mt-1">{logs.length} logs</span>
        </div>
        <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Correspondants</span>
          <span className="text-xl font-black text-indigo-950 mt-1">{filteredLogs.length} trouvés</span>
        </div>
        <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Erreurs / Alertes</span>
          <span className="text-xl font-black text-rose-950 mt-1">
            {logs.filter((l) => l.severity === 'CRITICAL' || l.severity === 'WARNING').length} critiques
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" /> Registre d'Audit (Réglementation — 5 ans)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              Dernière mise à jour : {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">
                Auto-refresh 30s
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Rafraîchir */}
            <button
              onClick={() => fetchLogs()}
              disabled={isLoading}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Rafraîchir</span>
            </button>

            {/* Export CSV */}
            <button onClick={handleExportCSV} className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export (.csv)
            </button>

            {/* Export LOG */}
            <button onClick={handleExportLOG} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-600" /> Export (.log)
            </button>

            {/* Purge */}
            <button
              onClick={handleDeleteAll}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Purger tout
            </button>

            {/* Reset filtres */}
            {(search || severityFilter !== 'ALL' || authorFilter !== 'ALL' || dateFilter) && (
              <button
                onClick={() => { setSearch(''); setSeverityFilter('ALL'); setAuthorFilter('ALL'); setDateFilter(''); }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-xl transition cursor-pointer"
              >
                Réinitialiser filtres
              </button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Recherche</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Mots-clés..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="block w-full border border-slate-200 bg-white rounded-xl pl-8 pr-2 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:border-indigo-500 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Gravité</label>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none text-slate-700">
              <option value="ALL">Tous les niveaux</option>
              <option value="INFO">🟢 INFO</option>
              <option value="WARNING">🟡 WARNING</option>
              <option value="CRITICAL">🔴 CRITICAL</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Auteur</label>
            <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none text-slate-700">
              <option value="ALL">Tous les auteurs</option>
              {uniqueAuthors.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] focus:outline-none text-slate-700" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Lignes</label>
            <select value={rowLimit} onChange={(e) => setRowLimit(e.target.value)}
              className="block w-full border border-slate-200 bg-white rounded-xl p-1.5 text-[11px] font-bold focus:outline-none text-slate-700">
              <option value="20">20 premières</option>
              <option value="50">50 premières</option>
              <option value="100">100 premières</option>
              <option value="ALL">Tout afficher</option>
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4 text-center">Gravité</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Auteur</th>
                <th className="py-3 px-4">Détails</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    {isLoading ? 'Chargement des logs…' : 'Aucun enregistrement ne correspond aux filtres appliqués.'}
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition group">
                    <td className="py-3 px-4 font-mono text-[10.5px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-bold ${
                        log.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                        log.severity === 'WARNING'  ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                        'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-800">{log.action}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[9.5px] font-extrabold text-slate-500 border border-slate-200">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{log.performedBy || 'système'}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteOne(log.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Supprimer ce log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center text-[10.5px] text-slate-400 font-semibold font-mono">
          Registre d'audit immuable · {filteredLogs.length} entrées visibles sur {logs.length} total
        </div>
      </div>
    </div>
  );
}
