/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard.tsx — Tableau de bord temps réel.
 *
 * Source des données :
 *  - KPIs (jour/semaine/mois, marge, graphe 30j) → DashboardSummaryDto
 *    calculé côté backend sur TOUTE la base de données MongoDB.
 *  - Alertes stock + dernières ventes → products[] et sales[] du state global.
 *  - Vue employé → sales[] filtrés localement (ses propres ventes).
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Archive,
  ShoppingBag,
  CircleDollarSign,
  UserCheck2,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Clock,
  Sparkles,
  ShoppingBagIcon,
  FileText,
  Award,
  Flame,
  Target,
  CalendarDays,
  BarChart3,
  Percent,
} from 'lucide-react';
import { Product, User, Sale, SecurityEvent, AuditLog, DashboardSummaryDto, RecentSale, DashboardSecurityEvent, WeeklyRevenue } from '../types';
import { CATEGORIES } from '../mockData';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardProps {
  products: Product[];
  // clients: Client[];    // TODO : à connecter dans la prochaine MàJ
  // suppliers: Supplier[]; // TODO : à connecter dans la prochaine MàJ
  clients: any[];
  suppliers: any[];
  users: User[];
  sales: Sale[];
  securityEvents: SecurityEvent[];
  auditLogs?: AuditLog[];
  /** KPIs calculés côté backend — null pendant le chargement initial */
  dashboardSummary: DashboardSummaryDto | null;
  onNavigate: (tab: any) => void;
  onSelectSaleForInvoice: (sale: Sale) => void;
  currentUser?: User;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de dates — tout est calculé dynamiquement
// ─────────────────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10); // "YYYY-MM-DD"
}

function getDateRange() {
  const now = new Date();
  const todayStr = toDateStr(now);

  // Début de semaine (lundi)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStartStr = toDateStr(weekStart);

  // Début de mois
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = toDateStr(monthStart);

  return { todayStr, weekStartStr, monthStartStr, now };
}

/** Calcule les 30 derniers jours glissants */
function getLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
}

function formatFcfa(n: number): string {
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard({
  products,
  // clients,    // TODO
  // suppliers,  // TODO
  users,
  sales,
  securityEvents,
  auditLogs = [],
  dashboardSummary,
  onNavigate,
  onSelectSaleForInvoice,
  currentUser,
}: DashboardProps) {
  const [objectivesEnabled, setObjectivesEnabled] = useState(true);

  const userFullName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : '';
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  // ── Calculs de dates ──────────────────────────────────────────────────────
  const { todayStr, weekStartStr: _w, monthStartStr: _m } = useMemo(
    () => getDateRange(),
    [],
  );

  const last30Days = useMemo(() => getLast30Days(), []);

  // ── Ventes de l'employé (calculées localement sur les 50 dernières ventes) ─
  const completedSales = useMemo(
    () => sales.filter((s) => s.status === 'COMPLETED'),
    [sales],
  );

  const personalSales = completedSales.filter(
    (s) => s.createdBy.toLowerCase() === userFullName.toLowerCase(),
  );
  const personalTodaySales = personalSales.filter((s) =>
    s.createdAt.startsWith(todayStr),
  );
  const personalInvoicesCount = personalSales.length;

  const personalLogs = auditLogs.filter(
    (log) => log.performedBy.toLowerCase() === userFullName.toLowerCase(),
  );
  const personalActivities =
    personalLogs.length > 0
      ? personalLogs
      : personalSales.map((sale) => ({
          id: sale.id,
          timestamp: sale.createdAt,
          action: 'Enregistrement de vente',
          details: `Vente pour ${sale.clientName} — ${formatFcfa(sale.total)}`,
          severity: 'INFO' as const,
        }));

  const dailyTarget = 5;
  const monthlyTarget = 20;

  // ── Métriques admin — lues depuis le DashboardSummary calculé côté backend ─
  // Toutes ces valeurs portent sur l'intégralité de la base MongoDB,
  // pas seulement les 50 ventes chargées en mémoire.
  const s = dashboardSummary; // alias court

  const dailySalesCount        = s?.todaySalesCount   ?? 0;
  const dailyRevenue           = s?.todayRevenue       ?? 0;
  const weeklySalesCount       = s?.weekSalesCount     ?? 0;
  const weeklyRevenue          = s?.weekRevenue        ?? 0;
  const monthlySalesCount      = s?.monthSalesCount    ?? 0;
  const monthlyRevenue         = s?.monthRevenue       ?? 0;
  const trendPct               = s?.trendPercent       ?? null;
  const operationalMarginPct   = s?.operationalMarginPct ?? null;
  const grossMargin            = s?.grossMargin        ?? 0;
  const totalStockAlerts       = s?.stockAlertsCount   ?? (
    products.filter((p) => p.quantity <= p.alertThreshold).length
  );

  // Stock — calculé localement (produits chargés sont exhaustifs)
  const totalProducts      = products.length;
  const totalStockQuantity = products.reduce((sum, p) => sum + p.quantity, 0);

  // Utilisateurs — calculé localement
  const activeUsersCount = users.filter((u) => u.status === 'ACTIVE').length;

  // ── Graphe 7 jours (Lun → Aujourd'hui) depuis le backend ─────────────────
  const graphPoints = useMemo((): WeeklyRevenue[] => {
    if (s?.weeklyGraph && s.weeklyGraph.length > 0) {
      return s.weeklyGraph;
    }
    // Fallback local si le summary n'est pas encore chargé
    const { weekStartStr: ws } = getDateRange();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().substring(0, 10);
      const dayRev = completedSales
        .filter((v) => v.createdAt.startsWith(dateStr))
        .reduce((sum, v) => sum + v.total, 0);
      return {
        date: dateStr,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        revenue: dayRev,
      } as WeeklyRevenue;
    }).filter((d) => d.date <= todayStr);
  }, [s?.weeklyGraph, completedSales, todayStr]);

  const graphWidth  = 500;
  const graphHeight = 120;
  const maxVal      = Math.max(...graphPoints.map((d) => Number(d.revenue)), 1000);

  const points = graphPoints.map((d, index) => {
    const x = graphPoints.length > 1
      ? (index / (graphPoints.length - 1)) * graphWidth
      : graphWidth / 2;
    const y = graphHeight - (Number(d.revenue) / maxVal) * (graphHeight - 20) - 10;
    return { x, y, ...d, value: Number(d.revenue) };
  });

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaString   = `0,${graphHeight} ${pointsString} ${graphWidth},${graphHeight}`;

  // ── Données enrichies du backend ──────────────────────────────────────────
  const recentWeekSales: RecentSale[]           = s?.recentWeekSales    ?? [];
  const backendSecurityEvents: DashboardSecurityEvent[] = s?.securityEvents ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  // VUE EMPLOYÉ
  // ─────────────────────────────────────────────────────────────────────────

  if (isEmployee) {
    const dailyProgressPercent = Math.min(
      100,
      Math.round((personalTodaySales.length / dailyTarget) * 100),
    );
    const monthlyProgressPercent = Math.min(
      100,
      Math.round((personalSales.length / monthlyTarget) * 100),
    );

    return (
      <div id="employee-dashboard-root" className="space-y-6 font-sans antialiased text-slate-800">
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-full opacity-10 pointer-events-none">
            <Sparkles className="text-slate-900 w-full h-full" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Espace Collaborateur{' '}
              <span className="text-xs font-bold font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
                Vente & POS
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Bonjour,{' '}
              <span className="font-bold text-slate-900">
                {currentUser?.firstName}
              </span>
              . Suivez vos objectifs et gérez vos ventes.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={() => onNavigate('POS')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
            >
              Lancer une Vente (Caisse)
            </button>
            <button
              onClick={() => onNavigate('PRODUCTS')}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            >
              Consulter les Tarifs
            </button>
          </div>
        </div>

        {/* Métriques employé */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mes Ventes Totales</span>
              <div className="text-3xl font-black text-slate-900 mt-1.5">
                {personalSales.length}{' '}
                <span className="text-xs font-normal text-slate-400">transactions</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Accumulées depuis votre arrivée</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ventes Aujourd'hui</span>
              <div className="text-3xl font-black text-slate-900 mt-1.5">
                {personalTodaySales.length}{' '}
                <span className="text-xs font-normal text-slate-400">ventes</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">
                {formatFcfa(personalTodaySales.reduce((s, v) => s + v.total, 0))}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
              <Flame className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Factures Émises</span>
              <div className="text-3xl font-black text-slate-900 mt-1.5">
                {personalInvoicesCount}{' '}
                <span className="text-xs font-normal text-slate-400">fichiers</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Imprimables depuis la caisse</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Objectifs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-slate-950 text-sm">Mes Objectifs Personnels</h3>
                <p className="text-[10px] text-slate-400">Suivi opérationnel de la période en cours</p>
              </div>
            </div>
            <button
              onClick={() => setObjectivesEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                objectivesEnabled ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ${
                  objectivesEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {objectivesEnabled ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ObjectiveCard
                label="Objectif Journalier"
                title="Quotas de transactions"
                current={personalTodaySales.length}
                target={dailyTarget}
                percent={dailyProgressPercent}
                color="indigo"
                icon={<Flame className="h-3.5 w-3.5" />}
              />
              <ObjectiveCard
                label="Objectif Mensuel"
                title="Volume global de transactions"
                current={personalSales.length}
                target={monthlyTarget}
                percent={monthlyProgressPercent}
                color="emerald"
                icon={<Award className="h-3.5 w-3.5" />}
              />
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50/20 border border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center">
              <Award className="h-8 w-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">Suivi des objectifs désactivé</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Activez le toggle ci-dessus pour afficher vos progrès.</p>
            </div>
          )}
        </div>

        {/* Ventes récentes + Activité */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShoppingBagIcon className="h-4 w-4 text-emerald-600" /> Mes ventes récentes
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 font-bold rounded">POS actif</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
              {personalSales.length === 0 ? (
                <p className="py-14 text-center text-xs text-slate-400">Aucune vente enregistrée sous votre session.</p>
              ) : (
                [...personalSales].reverse().slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => onSelectSaleForInvoice(sale)}
                    className="flex items-center justify-between py-3 hover:bg-slate-50/70 cursor-pointer transition rounded px-1.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate">{sale.clientName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {sale.id} • {new Date(sale.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black font-mono text-slate-950">{formatFcfa(sale.total)}</p>
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 border border-indigo-100 rounded text-indigo-700 uppercase">
                        IMPRIMER
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" /> Mon journal d'activité
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 font-bold rounded">30 derniers jours</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
              {personalActivities.length === 0 ? (
                <p className="py-14 text-center text-xs text-slate-400">Aucune activité journalisée.</p>
              ) : (
                [...personalActivities].reverse().slice(0, 5).map((a, idx) => (
                  <div key={a.id ?? idx} className="py-3">
                    <div className="flex justify-between items-start text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        {a.action}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(a.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">{a.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VUE ADMIN
  // ─────────────────────────────────────────────────────────────────────────

  const currentMonthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div id="dashboard-root" className="space-y-6 font-sans antialiased text-slate-800">

      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full opacity-10 pointer-events-none">
          <Sparkles className="text-slate-900 w-full h-full" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Tableau de bord de visualisation  des produits{' '}
            <span className="text-xs font-bold font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
              V3.4
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Situation financière, stocks et activité de vente de votre PME.
          </p>
        </div>
        {/* <div className="mt-4 md:mt-0 flex gap-2">
          <button
            onClick={() => onNavigate('POS')}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            Lancer la Caisse tactile
          </button>
          <button
            onClick={() => onNavigate('SECURITY')}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            Audit Sécurité
          </button>
        </div> */}
      </div>

      {/* ── MÉTRIQUES PRINCIPALES ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Produits */}
        <MetricCard
          label="Produits enregistrés"
          value={String(totalProducts)}
          sub={`${CATEGORIES.length} catégories de catalogue`}
          icon={<Package className="h-5 w-5" />}
          onClick={() => onNavigate('PRODUCTS')}
        />

        {/* Stock global */}
        <MetricCard
          label="Volume Stock Global"
          value={`${totalStockQuantity.toLocaleString('fr-FR')} piece`}
          sub={
            totalStockAlerts > 0
              ? `⚠ ${totalStockAlerts} alertes de stock`
              : '✓ Aucune alerte de stock'
          }
          subColor={totalStockAlerts > 0 ? 'text-rose-600' : 'text-emerald-600'}
          icon={<Archive className="h-5 w-5" />}
          alert={totalStockAlerts > 0}
          onClick={() => onNavigate('STOCK')}
        />

        {/* Opérateurs */}
        <MetricCard
          label="compte actif"
          value={`${activeUsersCount} actifs`}
          sub={`${users.length} comptes total`}
          icon={<UserCheck2 className="h-5 w-5" />}
          onClick={() => onNavigate('USERS')}
        />

        {/* Marge opérationnelle */}
        {/* <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-400 transition-all shadow-xs flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Marge Opérationnelle</span>
            <div className={`text-2xl font-black mt-1.5 ${
              operationalMarginPct == null ? 'text-slate-400'
              : operationalMarginPct > 20 ? 'text-emerald-700'
              : operationalMarginPct > 0 ? 'text-amber-600'
              : 'text-slate-400'
            }`}>
              {operationalMarginPct != null && monthlyRevenue > 0
                ? `${operationalMarginPct.toFixed(1)} %`
                : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              {operationalMarginPct != null && monthlyRevenue > 0
                ? `Marge brute : ${formatFcfa(grossMargin)}`
                : 'Aucune vente ce mois'}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-all">
            <Percent className="h-5 w-5" />
          </div>
        </div> */}

      </div>

      {/* ── MÉTRIQUES VENTES JOUR / SEMAINE / MOIS ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Jour */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 transition-all group cursor-pointer" onClick={() => onNavigate('POS')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Aujourd'hui</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-slate-400 font-mono">Ventes</p>
                <p className="text-2xl font-black text-slate-900">{dailySalesCount}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-mono">Revenu</p>
                <p className="text-sm font-black text-indigo-700">{formatFcfa(dailyRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Semaine */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 transition-all group cursor-pointer" onClick={() => onNavigate('POS')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Cette semaine</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              Lun → {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-400 font-mono">Ventes</p>
              <p className="text-2xl font-black text-slate-900">{weeklySalesCount}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-mono">Revenu</p>
              <p className="text-sm font-black text-emerald-700">{formatFcfa(weeklyRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Mois */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 transition-all group cursor-pointer" onClick={() => onNavigate('POS')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <CircleDollarSign className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ce mois</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 capitalize">
              {currentMonthLabel}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-400 font-mono">Ventes</p>
              <p className="text-2xl font-black text-slate-900">{monthlySalesCount}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-mono">CA</p>
              <p className="text-sm font-black text-amber-700">{formatFcfa(monthlyRevenue)}</p>
              {trendPct !== null && (
                <p className={`text-[9px] font-bold mt-0.5 ${trendPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {trendPct >= 0 ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}% vs mois préc.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── GRAPHE SEMAINE ──────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-start pb-2 mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Activité de Vente — Cette semaine</h3>
            <p className="text-[10px] text-slate-400">
              CA par jour · Lundi → {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' })}
            </p>
          </div>
          {trendPct !== null ? (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border font-mono ${
              trendPct >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'
            }`}>
              {trendPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}% vs mois préc.
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {formatFcfa(weeklyRevenue)} cette semaine
            </span>
          )}
        </div>
        <div className="mt-2 relative">
          <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-40 overflow-visible">
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {[10, 45, 80, 110].map((y) => (
              <line key={y} x1="0" y1={y} x2={graphWidth} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
            ))}
            <polygon points={areaString} fill="url(#chart-area-grad)" />
            <polyline fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pointsString} />
            {points.map((p, idx) => (
              <g key={idx} className="cursor-pointer">
                <circle cx={p.x} cy={p.y} r={p.value > 0 ? 5 : 3} fill={p.value > 0 ? '#4f46e5' : '#e2e8f0'} stroke="#fff" strokeWidth="2" />
                <title>{p.label} — {formatFcfa(p.value)}</title>
              </g>
            ))}
          </svg>
          <div className="grid pt-2 border-t border-slate-50" style={{ gridTemplateColumns: `repeat(${graphPoints.length}, 1fr)` }}>
            {graphPoints.map((d, i) => (
              <span key={i} className="text-[9px] text-slate-400 font-mono text-center truncate">{d.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── ALERTES + DERNIÈRES VENTES + SÉCURITÉ ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Stocks critiques */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4 text-rose-500" /> Stocks critiques ({totalStockAlerts})
            </h3>
            <button onClick={() => onNavigate('STOCK')} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 whitespace-nowrap">
              Gérer <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
            {totalStockAlerts === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">Aucun produit sous le seuil critique.</p>
            ) : (
              products.filter((p) => p.quantity <= p.alertThreshold).sort((a, b) => a.quantity - b.quantity).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Seuil : {p.alertThreshold}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold font-mono shrink-0 ${p.quantity === 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {p.quantity === 0 ? 'RUPTURE' : `${p.quantity} restants`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dernières ventes de la semaine */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBagIcon className="h-4 w-4 text-emerald-600" /> Ventes de la semaine
            </h3>
            <button onClick={() => onNavigate('POS')} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 whitespace-nowrap">
              Caisse <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
            {recentWeekSales.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">Aucune vente cette semaine.</p>
            ) : (
              recentWeekSales.map((sale) => (
                <div key={sale.id} className="py-2.5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{sale.employeeName}</p>
                      <p className="text-[10px] text-indigo-600 font-medium truncate">{sale.firstProductName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black font-mono text-slate-950">{formatFcfa(Number(sale.totalAmount))}</p>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1 rounded">{sale.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-slate-400 font-mono">{sale.date}</span>
                    <span className="text-[9px] text-slate-300">·</span>
                    <span className="text-[9px] text-slate-400 font-mono">{sale.time}</span>
                    <span className="text-[9px] text-slate-300">·</span>
                    <span className="text-[9px] text-slate-400 font-mono truncate">{sale.saleNumber}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Télémétrie sécurité */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-indigo-600" /> Télémétrie Sécurité
            </h3>
            <button onClick={() => onNavigate('SECURITY')} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 whitespace-nowrap">
              Administration <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
            {backendSecurityEvents.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">Aucun événement de sécurité cette semaine.</p>
            ) : (
              backendSecurityEvents.map((event) => {
                const isFail = event.status === 'FAILURE';
                const actionLabels: Record<string, string> = {
                  LOGIN: 'Connexion', LOGOUT: 'Déconnexion', PASSWORD_CHANGE: 'Mot de passe modifié',
                  ADMIN_CREATED: 'Admin créé', SALE_CANCEL: 'Vente annulée', USER_CREATE: 'Utilisateur créé',
                  EMPLOYEE_INVITED: 'Employé invité', PRODUCT_DELETE: 'Produit supprimé',
                  STOCK_ADJUSTMENT: 'Ajustement stock', '2FA_VERIFY': 'Vérification 2FA',
                  LOGIN_FAILED: 'Échec connexion',
                };
                return (
                  <div key={event.id} className="py-2.5">
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${isFail ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {actionLabels[event.action] ?? event.action}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isFail ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {isFail ? 'ÉCHEC' : 'OK'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">{event.userEmail}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-mono">{event.date}</span>
                      <span className="text-[9px] text-slate-300">·</span>
                      <span className="text-[9px] text-slate-400 font-mono">{event.time}</span>
                      <span className="text-[9px] text-slate-300">·</span>
                      <span className="text-[9px] text-slate-400 font-mono truncate">IP: {event.ipAddress}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants réutilisables
// ─────────────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  icon: React.ReactNode;
  alert?: boolean;
  onClick?: () => void;
}

function MetricCard({ label, value, sub, subColor = 'text-slate-500', icon, alert = false, onClick }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between group transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-400' : ''
      } ${alert ? 'border-rose-200' : 'border-slate-200'}`}
    >
      <div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        <div className="text-2xl font-black text-slate-900 mt-1.5">{value}</div>
        <div className={`text-[10px] mt-1 font-mono font-bold ${subColor}`}>{sub}</div>
      </div>
      <div className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all ${
        alert
          ? 'bg-rose-50 border-rose-100 text-rose-600'
          : 'bg-slate-50 border-slate-100 text-slate-600 group-hover:bg-slate-950 group-hover:text-white'
      }`}>
        {icon}
      </div>
    </div>
  );
}

interface ObjectiveCardProps {
  label: string;
  title: string;
  current: number;
  target: number;
  percent: number;
  color: 'indigo' | 'emerald';
  icon: React.ReactNode;
}

function ObjectiveCard({ label, title, current, target, percent, color, icon }: ObjectiveCardProps) {
  const bar = color === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-500';
  const text = color === 'indigo' ? 'text-indigo-700 bg-indigo-50 border-indigo-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100';
  const msg = color === 'indigo'
    ? percent >= 100
      ? 'Félicitations ! Objectif quotidien atteint !'
      : `Encore ${target - current} vente${target - current > 1 ? 's' : ''} pour la prime du jour.`
    : percent >= 100
      ? 'Bonus mensuel à 100% garanti !'
      : `${target - current} vente${target - current > 1 ? 's' : ''} restantes pour finir le mois en beauté.`;

  return (
    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{label}</span>
          <span className="text-sm font-bold text-slate-800">{title}</span>
        </div>
        <span className={`text-xs font-mono font-extrabold border px-2 py-0.5 rounded ${text}`}>
          {current} / {target} Ventes
        </span>
      </div>
      <div className="mt-4">
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div className={`${bar} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-slate-500 font-mono">Réalisation : {percent}%</span>
          <span className="text-[10px] text-slate-400">Goal : {target} ventes</span>
        </div>
      </div>
      <p className={`text-[11px] mt-3 flex items-center gap-1 font-medium p-2 rounded-lg border ${
        color === 'indigo' ? 'text-indigo-600 bg-indigo-50/30 border-indigo-100/30' : 'text-emerald-700 bg-emerald-50/30 border-emerald-100/30'
      }`}>
        {icon}
        {msg}
      </p>
    </div>
  );
}
