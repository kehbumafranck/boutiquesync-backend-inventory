/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  DollarSign,
  Briefcase,
  FileSpreadsheet,
  FileText,
  Search,
  ChevronRight,
  Sparkles,
  Inbox
} from 'lucide-react';
import { FinancialEntry, Sale } from '../types';

interface AccountingModuleProps {
  financialEntries: FinancialEntry[];
  sales: Sale[];
  onAddFinancialEntry: (entry: Omit<FinancialEntry, 'id'>) => void;
  onAddAuditLog: (action: string, module: 'FINANCE' | 'AUTH', performedBy: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  operatorName: string;
}

export default function AccountingModule({
  financialEntries,
  sales,
  onAddFinancialEntry,
  onAddAuditLog,
  operatorName
}: AccountingModuleProps) {
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'REVENUE' | 'EXPENSE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Form input states
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Marketing');
  const [amount, setAmount] = useState(0);
  const [entryType, setEntryType] = useState<'REVENUE' | 'EXPENSE'>('EXPENSE');

  // Compute live sums from the entries
  const currentMonthEntries = financialEntries;
  
  const totalRevenue = currentMonthEntries
    .filter(e => e.type === 'REVENUE')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpense = currentMonthEntries
    .filter(e => e.type === 'EXPENSE')
    .reduce((sum, e) => sum + e.amount, 0);

  const netProfit = totalRevenue - totalExpense;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Handle manual entry logging
  const handleAddNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || amount <= 0) {
      alert("Veuillez remplir les informations obligatoires et saisir un montant positif.");
      return;
    }

    onAddFinancialEntry({
      date: new Date().toISOString().substring(0, 10),
      type: entryType,
      category: cat,
      description: desc,
      amount,
      createdBy: operatorName
    });

    onAddAuditLog(
      'Écriture comptable',
      'FINANCE',
      operatorName,
      `Saisie manuelle: ${entryType === 'REVENUE' ? 'Recette' : 'Dépense'} - ${desc} (${amount} EUR) dans '${cat}'`,
      'INFO'
    );

    alert("L'écriture comptable a été enregistrée avec succès dans le journal officiel de l'entreprise.");
    
    // reset states
    setDesc('');
    setAmount(0);
  };

  const handleExportData = (targetCabinet: string) => {
    alert(`Simulation d'export comptable complet initiée pour le cabinet : ${targetCabinet}.\x0AUn classeur formaté FEC (Fichier des Écritures Comptables) conforme à l'administration fiscale a été compressé.`);
  };

  // Distinct category tags represented in records
  const uniqueCategories = Array.from(new Set(financialEntries.map(e => e.category)));

  // Query filters applied
  const filteredEntries = financialEntries
    .filter((e) => {
      const matchType = typeFilter === 'ALL' || e.type === typeFilter;
      const matchCategory = selectedCategory === '' || e.category === selectedCategory;
      const matchText = e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
      return matchType && matchCategory && matchText;
    });

  return (
    <div id="accounting-finance-module" className="space-y-6 font-sans antialiased text-slate-800">
      
      {/* Title banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Comptabilité, Budgets & Trésorerie</h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervisez le bilan opérationnel, gérez les dépenses d'acquisition, saisissez les écritures et exportez les FEC fiscaux.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleExportData('Cabinet KPMG')}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Transmettre au Cabinet</span>
          </button>
        </div>
      </div>

      {/* CORE FINANCIAL INDICATOR TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* Metric Revenue */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Recettes de Ventes</span>
            <span className="text-xl font-black text-slate-900 block mt-1">+{totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} €</span>
            <span className="text-[9px] text-emerald-600 font-bold font-mono block mt-1">Journal de caisse synchronisé</span>
          </div>
          <div className="h-9 w-9 bg-emerald-50 rounded-lg text-emerald-700 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Metric Expenses */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Dépenses & Achats</span>
            <span className="text-xl font-black text-slate-900 block mt-1">-{totalExpense.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} €</span>
            <span className="text-[9px] text-rose-500 font-mono block mt-1">Factures acquittées</span>
          </div>
          <div className="h-9 w-9 bg-rose-50 rounded-lg text-rose-700 flex items-center justify-center">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        {/* Metric Profit */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Bénéfice opérationnel</span>
            <span className={`text-xl font-black block mt-1 ${netProfit >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}>
              {netProfit.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} €
            </span>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">Excédent Brut d'Exploitation</span>
          </div>
          <div className="h-9 w-9 bg-indigo-50 rounded-lg text-indigo-700 flex items-center justify-center animate-pulse">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Metric Margins */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Taux de rentabilité</span>
            <span className="text-xl font-black text-slate-905 block mt-1">{netMarginPercent.toFixed(1)} %</span>
            <span className="text-[9px] text-emerald-650 font-bold text-emerald-600 block mt-1">Ratio de performance stable</span>
          </div>
          <div className="h-9 w-9 bg-amber-50 rounded-lg text-amber-700 flex items-center justify-center">
            <Scale className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* COMPTA GRAPH LAYOUT ROW WITH ENTRY FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Interactive Financial form to add cost log (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-50">
              <PlusTextIcon className="h-4 w-4 text-slate-400" /> Saisie manuelle d'une écriture
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Intégrez une facture d'achat, de marketing, ou un règlement externe de prestation.</p>
          </div>

          <form onSubmit={handleAddNewEntry} className="space-y-3 font-medium text-xs">
            
            {/* Description */}
            <div>
              <label className="block text-slate-700 mb-1">Désignation / Libellé d'écriture *</label>
              <input
                type="text"
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="ex: Hébergement serveurs Web - AWS"
                className="w-full border border-slate-205 rounded-xl px-3 py-2 bg-slate-55 bg-slate-50/50 focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Type & budget column */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1">Sens comptable</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as any)}
                  className="w-full border border-slate-205 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none transition leading-tight"
                >
                  <option value="EXPENSE">🔴 DEBIT (Dépense / Charges)</option>
                  <option value="REVENUE">🟢 CREDIT (Recette / Profit)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Rubrique analytique</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full border border-slate-205 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none transition"
                >
                  <option value="Approvisionnements">Approvisionnements</option>
                  <option value="Loyer & Charges">Loyer & Charges</option>
                  <option value="Marketing">Marketing / Pub</option>
                  <option value="Impôts & Taxes">Impôts & Taxes</option>
                  <option value="Prestations">Services externes</option>
                </select>
              </div>
            </div>

            {/* Amount HT */}
            <div>
              <label className="block text-slate-700 mb-1">Montant Hors-Taxe saisi (€) *</label>
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-205 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-800 font-mono font-bold focus:bg-white"
              />
            </div>

            <button
              id="accounting-add-entry-btn"
              type="submit"
              className="w-full py-2.5 rounded-xl font-extrabold text-xs text-white bg-slate-900 hover:bg-slate-850 shadow-md transition cursor-pointer"
            >
              Enregistrer l'écriture au Grand Livre
            </button>
          </form>
        </div>

        {/* Right: Master Journal Ledger audit table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between self-stretch">
          
          <div className="p-4 border-b border-slate-55 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Journal général des opérations comptables</span>
            
            {/* Filters selectors */}
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="border border-slate-200 rounded-lg p-1 px-2 text-[10px] font-bold bg-white focus:outline-none text-slate-600"
              >
                <option value="ALL">Tous les sens</option>
                <option value="REVENUE">🟢 CREDIT (Recettes)</option>
                <option value="EXPENSE">🔴 DEBIT (Dépenses)</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-slate-200 rounded-lg p-1 px-2 text-[10px] font-bold bg-white focus:outline-none text-slate-600 max-w-[130px]"
              >
                <option value="">Rubriques</option>
                {uniqueCategories.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] hierarchy-scroll">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Rubrique</th>
                  <th className="py-2.5 px-4">Libellé opération</th>
                  <th className="py-2.5 px-4 text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredEntries.map((e) => {
                  const isRevenue = e.type === 'REVENUE';
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/45 transition">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{e.date}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 truncate max-w-[100px] inline-block">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 max-w-[200px] truncate font-medium text-slate-800" title={e.description}>
                        {e.description}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                        isRevenue ? 'text-emerald-700' : 'text-slate-800'
                      }`}>
                        {isRevenue ? `+${e.amount.toFixed(2)}` : `-${e.amount.toFixed(2)}`} €
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

// Icon wrapper
function PlusTextIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
