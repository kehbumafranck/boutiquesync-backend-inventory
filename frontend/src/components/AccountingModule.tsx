/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AccountingModule — Comptabilité & Trésorerie temps réel.
 * Toutes les valeurs viennent du backend GET /api/accounting/summary.
 * La saisie manuelle a été supprimée (non branchée au backend).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Scale, DollarSign, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react';
import { boutiqueApi } from '../services/apiClient';

interface AccountingEntry {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: 'REVENUE' | 'EXPENSE';
}

interface AccountingSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  marginPercent: number;
  entries: AccountingEntry[];
}

export default function AccountingModule() {
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'REVENUE' | 'EXPENSE'>('ALL');
  const [search, setSearch] = useState('');

  // ── Chargement depuis le backend ─────────────────────────────────────────
  const fetchSummary = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await boutiqueApi.accounting.getSummary();
      setSummary(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.warn('[AccountingModule] Impossible de charger le bilan.', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Polling toutes les 60 secondes (les données changent quand une vente est faite)
  useEffect(() => {
    const interval = setInterval(() => fetchSummary(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const totalRevenue  = summary?.totalRevenue  ?? 0;
  const totalExpense  = summary?.totalExpense  ?? 0;
  const netProfit     = summary?.netProfit     ?? 0;
  const marginPercent = summary?.marginPercent ?? 0;

  const entries = (summary?.entries ?? []).filter((e) => {
    const matchType = typeFilter === 'ALL' || e.type === typeFilter;
    const matchText = search === '' ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    return matchType && matchText;
  });

  const fmt = (n: number) =>
    Math.round(n).toLocaleString('fr-FR') + ' FCFA';

  return (
    <div id="accounting-finance-module" className="space-y-6 font-sans antialiased text-slate-800">

      {/* Titre */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Comptabilité, Budgets & Trésorerie</h2>
          <p className="text-xs text-slate-400 mt-1">
            Bilan financier réel du mois courant — calculé depuis les ventes enregistrées en base.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono">
            Màj : {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={() => fetchSummary()}
            disabled={isLoading}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-indigo-500" />}
            Rafraîchir
          </button>
          <button
            onClick={() => alert('Export FEC — fonctionnalité prévue dans la prochaine version.')}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Transmettre au Cabinet
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Recettes de Ventes</span>
            <span className="text-xl font-black text-slate-900 block mt-1">+{fmt(totalRevenue)}</span>
            <span className="text-[9px] text-emerald-600 font-bold font-mono block mt-1">Journal de caisse synchronisé</span>
          </div>
          <div className="h-9 w-9 bg-emerald-50 rounded-lg text-emerald-700 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Dépenses & Achats</span>
            <span className="text-xl font-black text-slate-900 block mt-1">
              {totalExpense > 0 ? `-${fmt(totalExpense)}` : 'Non disponible'}
            </span>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">
              {totalExpense > 0 ? 'Factures acquittées' : 'Module en développement'}
            </span>
          </div>
          <div className="h-9 w-9 bg-rose-50 rounded-lg text-rose-700 flex items-center justify-center">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Bénéfice opérationnel</span>
            <span className={`text-xl font-black block mt-1 ${netProfit >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}>
              {fmt(netProfit)}
            </span>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">CA brut ce mois</span>
          </div>
          <div className="h-9 w-9 bg-indigo-50 rounded-lg text-indigo-700 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Taux de rentabilité</span>
            <span className="text-xl font-black text-slate-900 block mt-1">
              {totalRevenue > 0 ? `${marginPercent.toFixed(1)} %` : 'N/A'}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold block mt-1">Ratio de performance</span>
          </div>
          <div className="h-9 w-9 bg-amber-50 rounded-lg text-amber-700 flex items-center justify-center">
            <Scale className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Journal des ventes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Journal des ventes du mois courant
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Recherche…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-200 rounded-lg p-1 px-2 text-[10px] bg-white focus:outline-none text-slate-600 w-40"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="border border-slate-200 rounded-lg p-1 px-2 text-[10px] font-bold bg-white focus:outline-none text-slate-600"
            >
              <option value="ALL">Tous les sens</option>
              <option value="REVENUE">🟢 CREDIT (Recettes)</option>
              <option value="EXPENSE">🔴 DEBIT (Dépenses)</option>
            </select>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Rubrique</th>
                <th className="py-2.5 px-4">Libellé opération</th>
                <th className="py-2.5 px-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                    Chargement du bilan…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Aucune écriture ce mois ou aucun résultat pour ces filtres.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/45 transition">
                    <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{e.date}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 max-w-[300px] truncate font-medium text-slate-800" title={e.description}>
                      {e.description}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${e.type === 'REVENUE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {e.type === 'REVENUE' ? `+${fmt(e.amount)}` : `-${fmt(e.amount)}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
