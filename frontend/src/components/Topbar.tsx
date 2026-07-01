/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Inbox,
  CheckCircle,
  PlusCircle,
  AlertTriangle,
  Calendar,
  X,
  CreditCard
} from 'lucide-react';
import { User as UserType, Notification, Product, Client } from '../types';

interface TopbarProps {
  currentUser: UserType;
  setMobileOpen: (open: boolean) => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
  products: Product[];
  clients: Client[];
  onQuickNavigate: (tab: 'PRODUCTS' | 'POS' | 'CLIENTS' | 'FINANCE') => void;
}

export default function Topbar({
  currentUser,
  setMobileOpen,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  products,
  clients,
  onQuickNavigate
}: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Marquer toutes les notifications comme lues à l'ouverture du panel
  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      // On marque chaque notification non lue dès que l'utilisateur ouvre le panel
      notifications.filter(n => !n.read).forEach(n => onMarkNotificationRead(n.id));
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  const filteredClients = searchQuery
    ? clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  const isSearchEmpty = filteredProducts.length === 0 && filteredClients.length === 0;

  return (
    <header id="main-topbar-cmp" className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <button
          id="mobile-sidebar-toggle-cmp"
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div ref={searchRef} className="relative w-full hidden sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="global-search-input-cmp"
            type="text"
            placeholder="Recherche globale (produits, références, clients...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="block w-full border border-slate-200 bg-slate-50 pl-10 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-slate-950 transition-all rounded-xl"
          />

          {showSearchResults && searchQuery && (
            <div id="smart-search-results-cmp" className="absolute left-0 mt-2 w-[420px] rounded-xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-slate-900/5 z-40 max-h-[380px] overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-50 mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Index de recherche en temps réel</span>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {isSearchEmpty ? (
                <div className="p-4 text-center text-xs text-slate-500 font-medium">
                  Aucun résultat trouvé pour "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-indigo-500 bg-indigo-50/50 rounded-md">Produits ({filteredProducts.length})</div>
                      <div className="mt-1 space-y-1">
                        {filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              onQuickNavigate('PRODUCTS');
                              setSearchQuery('');
                              setShowSearchResults(false);
                            }}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-slate-50 cursor-pointer transition text-left"
                          >
                            <img src={p.imageUrl} alt={p.name} className="h-7 w-7 rounded bg-slate-100 object-cover shrink-0" referrerPolicy="no-referrer" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Ref: {p.reference} • Stock: <span className={p.quantity <= p.alertThreshold ? "text-rose-500 font-bold" : ""}>{p.quantity} pces</span></p>
                            </div>
                            <div className="text-xs font-bold text-slate-900">{p.sellingPrice.toLocaleString()} FCFA</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredClients.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-emerald-500 bg-emerald-50/50 rounded-md">Clients ({filteredClients.length})</div>
                      <div className="mt-1 space-y-1">
                        {filteredClients.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              onQuickNavigate('CLIENTS');
                              setSearchQuery('');
                              setShowSearchResults(false);
                            }}
                            className="flex items-center justify-between rounded-lg px-3 py-1.5 hover:bg-slate-50 cursor-pointer transition text-left"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-mono shrink-0">
                              {c.loyaltyPoints} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-1 px-3 bg-slate-50 text-[9px] text-slate-400 text-center rounded-lg border border-dashed border-slate-100">
                    💡 Cliquez sur un élément pour vous y rendre instantanément.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-[11px] text-slate-600 font-semibold font-mono">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>

        <button
          id="topbar-pos-shortcut-cmp"
          type="button"
          onClick={() => onQuickNavigate('POS')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          title="Terminal de Vente Direct"
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nouvelle Caisse</span>
        </button>

        {currentUser.role === 'ADMIN' && (
          <button
            id="topbar-product-shortcut-cmp"
            type="button"
            onClick={() => onQuickNavigate('PRODUCTS')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-100 cursor-pointer"
            title="Ajouter un produit"
          >
            <PlusCircle className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden md:inline">Nouveau Produit</span>
          </button>
        )}

        <div className="relative" ref={notificationRef}>
          <button
            id="topbar-notifications-bell-cmp"
            type="button"
            onClick={handleToggleNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div id="notifications-panel-cmp" className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-100 bg-white shadow-2xl ring-1 ring-slate-950/5 z-40 max-h-[420px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-800">Notifications alertes</span>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={onClearNotifications}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Effacer tout
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4">
                    <CheckCircle className="h-10 w-10 text-slate-200 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Aucune nouvelle alerte</p>
                    <p className="text-[10px] text-slate-400 mt-1">Vos stocks et votre comptabilité se portent bien.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead(n.id)}
                        className={`flex gap-3 px-4 py-3 hover:bg-slate-50/75 cursor-pointer transition ${
                          !n.read ? 'bg-indigo-50/15' : ''
                        }`}
                      >
                        {n.type === 'CRITICAL' && <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />}
                        {n.type === 'WARNING' && <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />}
                        {n.type === 'SUCCESS' && <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />}
                        {n.type === 'INFO' && <Inbox className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />}

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500 leading-normal mt-0.5">{n.description}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-1">
                            {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {!n.read && (
                          <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full shrink-0 self-center" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <div className="h-8 w-8 rounded-full bg-slate-900 border-2 border-white text-white font-bold flex items-center justify-center text-xs uppercase shadow-xs">
            {currentUser.firstName.substring(0,1)}{currentUser.lastName.substring(0,1)}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-800 truncate leading-none">
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <p className="text-[10px] text-slate-400 font-mono leading-none mt-1">
              {currentUser.role === 'ADMIN' ? 'Admin' : 'Salarié'}
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
