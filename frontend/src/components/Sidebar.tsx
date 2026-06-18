/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Box,
  Shuffle,
  ShoppingCart,
  Users,
  Briefcase,
  TrendingUp,
  UserCog,
  ShieldAlert,
  History,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { User as UserType } from '../types';

export type NavigationTab =
  | 'DASHBOARD'
  | 'PRODUCTS'
  | 'STOCK'
  | 'POS'
  | 'CLIENTS'
  | 'SUPPLIERS'
  | 'FINANCE'
  | 'USERS'
  | 'SECURITY'
  | 'AUDIT'
  | 'MY_ACCOUNT';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  currentUser: UserType;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  notificationsCount: number;
  onOpenNotifications: () => void;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  notificationsCount,
  onOpenNotifications
}: SidebarProps) {

  // Navigation Items containing French labels and appropriate icons
  const navItems = [
    { id: 'DASHBOARD' as NavigationTab, label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'PRODUCTS' as NavigationTab, label: 'Gestion Produits', icon: Box, roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'STOCK' as NavigationTab, label: 'Suivi Stocks', icon: Shuffle, roles: ['ADMIN'] },
    { id: 'POS' as NavigationTab, label: 'Caisse / POS', icon: ShoppingCart, roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'CLIENTS' as NavigationTab, label: 'Clients & Fidélité', icon: Users, roles: ['ADMIN'] },
    { id: 'SUPPLIERS' as NavigationTab, label: 'Fournisseurs', icon: Briefcase, roles: ['ADMIN'] },
    { id: 'FINANCE' as NavigationTab, label: 'Compta & Finances', icon: TrendingUp, roles: ['ADMIN'] },
    { id: 'USERS' as NavigationTab, label: 'Utilisateurs & Rôles', icon: UserCog, roles: ['ADMIN'] },
    { id: 'SECURITY' as NavigationTab, label: 'Sécurité globale', icon: ShieldAlert, roles: ['ADMIN'] },
    { id: 'AUDIT' as NavigationTab, label: 'Journal d\'Audit', icon: History, roles: ['ADMIN'] },
    { id: 'MY_ACCOUNT' as NavigationTab, label: 'Mon Compte', icon: User, roles: ['ADMIN', 'EMPLOYEE'] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  const handleTabClick = (tabId: NavigationTab) => {
    onSelectTab(tabId);
    setMobileOpen(false); // Close drawer on mobile selection
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          id="mobile-sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/45 md:hidden backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Sidebar Root */}
      <aside
        id="main-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white shadow-xs transition-all duration-300
          ${collapsed ? 'w-20' : 'w-64'} 
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header Block with Brand */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-black text-white shadow-md shadow-slate-950/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-white tracking-tight truncate">
                SaaS Enterprise
              </span>
            )}
          </div>

          {/* Collapse toggle (Desktop only) */}
          <button
            id="sidebar-collapse-toggle"
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Current Active Indicator */}
        {!collapsed && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">RÔLE ACTIF :</div>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                currentUser.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
                {currentUser.role === 'ADMIN' ? 'ADMINISTRATEUR' : 'EMPLOYÉ'}
              </span>
            </div>
            <div className="mt-1 text-xs font-bold text-slate-700 truncate">{currentUser.firstName} {currentUser.lastName}</div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto hierarchy-scroll">
          {visibleNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-md shadow-slate-900/10 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <IconComponent className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 duration-150 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'
                }`} />

                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Micro notification tag on Point of Sale or general logs */}
                {item.id === 'DASHBOARD' && notificationsCount > 0 && !collapsed && (
                  <span className="absolute right-3 inline-flex items-center justify-center h-4 py-0.5 px-1.5 rounded-full text-[9px] font-bold bg-rose-500 text-white leading-none">
                    {notificationsCount}
                  </span>
                )}
                {item.id === 'DASHBOARD' && notificationsCount > 0 && collapsed && (
                  <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-2 bg-slate-50/50">
          {!collapsed && (
            <div className="flex items-center gap-2 px-1">
              <div className="h-8 w-8 rounded-full bg-slate-300 font-bold border-2 border-white text-slate-700 flex items-center justify-center uppercase shadow-xs">
                {currentUser.firstName.substring(0, 1)}{currentUser.lastName.substring(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {currentUser.firstName}
                </p>
                <p className="text-[10px] text-slate-400 truncate font-mono">
                  {currentUser.email}
                </p>
              </div>
            </div>
          )}

          <button
            id="sidebar-logout-button"
            onClick={onLogout}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100 cursor-pointer ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Se déconnecter de la session"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="font-bold">Déconnexion</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
