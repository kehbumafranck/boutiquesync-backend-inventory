/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AppRouter - Routage professionnel basé sur React Router DOM
 */

import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAppContext } from "./AppProvider";
import { NavigationTab } from "../components/Sidebar";
import { ShieldAlert } from "lucide-react";

// Importing Views
import LoginScreen from "../pages/LoginScreen";
import CompleteRegistration from "../pages/CompleteRegistration";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Dashboard from "../pages/Dashboard";
import ProductManagement from "../pages/ProductManagement";
import StockManagement from "../pages/StockManagement";
import PosTerminal from "../components/PosTerminal";
import ContactManagement from "../pages/ContactManagement";
import AccountingModule from "../components/AccountingModule";
import UserManagement from "../components/UserManagement";
import SecurityAuditModule from "../pages/SecurityAuditModule";
import MyAccount from "../pages/MyAccount";
import AuditLogModule from "../components/AuditLogModule";

export default function AppRouter() {
  const {
    appState,
    currentUser,
    apiConfig,
    handleLoginSuccess,
    handleLogout,
    handleUpdateApiConfig,
    handleAddAuditLog,
    handleAddSecurityEvent,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddStockMovement,
    handleAddSale,
    handleCancelSale,
    handleUpdateProductQuantities,
    handleAddClient,
    handleUpdateClient,
    handleDeleteClient,
    handleAddSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,
    handleAddNewExpense,
    handleInviteUser,
    handleUpdateUser,
    handleDeleteUser,
    handleTerminateSession,
    handleMarkNotifRead,
    handleClearNotifications,
    handleUpdateCurrentUser,
    currentUserFullName,
  } = useAppContext();

  const navigate = useNavigate();
  const location = useLocation();

  // Layout presentation toggles
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Déterminer l'onglet actif dans la Sidebar en fonction du chemin d'URL courant
  const getCurrentTabFromPath = (): NavigationTab => {
    const path = location.pathname;
    if (path.startsWith("/products")) return "PRODUCTS";
    if (path.startsWith("/stock")) return "STOCK";
    if (path.startsWith("/pos")) return "POS";
    if (path.startsWith("/clients")) return "CLIENTS";
    if (path.startsWith("/suppliers")) return "SUPPLIERS";
    if (path.startsWith("/finance")) return "FINANCE";
    if (path.startsWith("/users")) return "USERS";
    if (path.startsWith("/security")) return "SECURITY";
    if (path.startsWith("/audit")) return "AUDIT";
    if (path.startsWith("/my-account")) return "MY_ACCOUNT";
    return "DASHBOARD";
  };

  const currentTab = getCurrentTabFromPath();

  // Helper pour restreindre l'accès au rôle EMPLOYEE sur certains composants
  const ProtectedComponent = ({
    children,
    allowedRoles,
  }: {
    children: React.ReactNode;
    allowedRoles: string[];
  }) => {
    if (!currentUser) return <Navigate to="/" replace />;

    if (!allowedRoles.includes(currentUser.role)) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xs flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto my-12 animate-fade-in">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
          <h3 className="text-base font-extrabold text-slate-950">
            Accès Refusé • Rôle Restreint
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            La gestion de cette section est réservée aux administrateurs de la
            console.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Retourner au Tableau de Bord
          </button>
        </div>
      );
    }
    return children;
  };

  // Redirection automatique si un utilisateur connecté tente d'accéder au login "/"
  useEffect(() => {
    if (currentUser && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  return (
    <Routes>
      {/* ── 1. ROUTE PUBLIQUE D'INVITATION (Accessible n'importe quand) ── */}
      <Route path="/invite/verify" element={<CompleteRegistration />} />

      {/* ── 2. ROUTES D'AUTHENTIFICATION ── */}
      <Route
        path="/"
        element={
          !currentUser ? (
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
              onAddAuditLog={handleAddAuditLog}
              onAddSecurityEvent={handleAddSecurityEvent}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* ── 3. ROUTES CONSOLE SÉCURISÉES (Nécessitent une session) ── */}
      <Route
        path="/*"
        element={
          currentUser ? (
            <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 antialiased">
              {/* Sidebar intégrée au Shell */}
              <Sidebar
                currentTab={currentTab}
                onSelectTab={(tab) => {
                  // Correspondance Tab -> Path pour la navigation
                  const paths: Record<NavigationTab, string> = {
                    DASHBOARD: "/dashboard",
                    PRODUCTS: "/products",
                    STOCK: "/stock",
                    POS: "/pos",
                    CLIENTS: "/clients",
                    SUPPLIERS: "/suppliers",
                    FINANCE: "/finance",
                    USERS: "/users",
                    SECURITY: "/security",
                    AUDIT: "/audit",
                    MY_ACCOUNT: "/my-account",
                  };
                  navigate(paths[tab]);
                  setMobileSidebarOpen(false);
                }}
                currentUser={currentUser}
                onLogout={handleLogout}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                mobileOpen={mobileSidebarOpen}
                setMobileOpen={setMobileSidebarOpen}
                notificationsCount={
                  appState.notifications.filter((n) => !n.read).length
                }
                onOpenNotifications={() => navigate("/dashboard")}
              />

              {/* Master Content wrapper */}
              <div
                className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? "md:pl-20" : "md:pl-64"}`}
              >
                <Topbar
                  currentUser={currentUser}
                  setMobileOpen={setMobileSidebarOpen}
                  notifications={appState.notifications}
                  onMarkNotificationRead={handleMarkNotifRead}
                  onClearNotifications={handleClearNotifications}
                  products={appState.products}
                  clients={appState.clients}
                  onQuickNavigate={(tab) => {
                    const paths: Record<string, string> = {
                      DASHBOARD: "/dashboard",
                      PRODUCTS: "/products",
                      POS: "/pos",
                    };
                    if (paths[tab]) navigate(paths[tab]);
                  }}
                />

                {/* Switcher interne des pages via le sous-routage de React Router */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
                  <Routes>
                    <Route
                      path="dashboard"
                      element={
                        <Dashboard
                          products={appState.products}
                          clients={appState.clients}
                          suppliers={appState.suppliers}
                          users={appState.users}
                          sales={appState.sales}
                          securityEvents={appState.securityEvents}
                          auditLogs={appState.auditLogs}
                          onNavigate={(tab) =>
                            navigate(`/${tab.toLowerCase()}`)
                          }
                          onSelectSaleForInvoice={() => navigate("/pos")}
                          currentUser={currentUser}
                        />
                      }
                    />
                    <Route
                      path="products"
                      element={
                        <ProductManagement
                          products={appState.products}
                          onAddProduct={handleAddProduct}
                          onUpdateProduct={handleUpdateProduct}
                          onDeleteProduct={handleDeleteProduct}
                          onAddAuditLog={handleAddAuditLog}
                          operatorName={currentUserFullName}
                          currentUser={currentUser}
                        />
                      }
                    />
                    <Route
                      path="stock"
                      element={
                        <ProtectedComponent allowedRoles={["ADMIN", "MANAGER"]}>
                          <StockManagement
                            products={appState.products}
                            stockMovements={appState.stockMovements}
                            onAddStockMovement={handleAddStockMovement}
                            onAddAuditLog={handleAddAuditLog}
                            operatorName={currentUserFullName}
                          />
                        </ProtectedComponent>
                      }
                    />
                    <Route
                      path="pos"
                      element={
                        <PosTerminal
                          products={appState.products}
                          clients={appState.clients}
                          sales={appState.sales}
                          onAddSale={handleAddSale}
                          onCancelSale={handleCancelSale}
                          onUpdateProductQuantities={
                            handleUpdateProductQuantities
                          }
                          onAddAuditLog={handleAddAuditLog}
                          operatorName={currentUserFullName}
                        />
                      }
                    />
                    <Route
                      path="clients"
                      element={
                        <ProtectedComponent allowedRoles={["ADMIN", "MANAGER"]}>
                          <ContactManagement
                            clients={appState.clients}
                            suppliers={appState.suppliers}
                            sales={appState.sales}
                            products={appState.products}
                            onAddClient={handleAddClient}
                            onUpdateClient={handleUpdateClient}
                            onDeleteClient={handleDeleteClient}
                            onAddSupplier={handleAddSupplier}
                            onUpdateSupplier={handleUpdateSupplier}
                            onDeleteSupplier={handleDeleteSupplier}
                            onAddAuditLog={handleAddAuditLog}
                            operatorName={currentUserFullName}
                          />
                        </ProtectedComponent>
                      }
                    />
                    <Route
                      path="suppliers"
                      element={
                        <ProtectedComponent allowedRoles={["ADMIN", "MANAGER"]}>
                          <ContactManagement
                            clients={appState.clients}
                            suppliers={appState.suppliers}
                            sales={appState.sales}
                            products={appState.products}
                            onAddClient={handleAddClient}
                            onUpdateClient={handleUpdateClient}
                            onDeleteClient={handleDeleteClient}
                            onAddSupplier={handleAddSupplier}
                            onUpdateSupplier={handleUpdateSupplier}
                            onDeleteSupplier={handleDeleteSupplier}
                            onAddAuditLog={handleAddAuditLog}
                            operatorName={currentUserFullName}
                          />
                        </ProtectedComponent>
                      }
                    />
                    <Route
                      path="finance"
                      element={
                        <ProtectedComponent allowedRoles={["ADMIN", "MANAGER"]}>
                          <AccountingModule
                            financialEntries={appState.financialEntries}
                            sales={appState.sales}
                            onAddFinancialEntry={handleAddNewExpense}
                            onAddAuditLog={handleAddAuditLog}
                            operatorName={currentUserFullName}
                          />
                        </ProtectedComponent>
                      }
                    />
                    <Route
                      path="users"
                      element={
                        <ProtectedComponent allowedRoles={["ADMIN"]}>
                          <UserManagement
                            users={appState.users}
                            onInviteUser={handleInviteUser}
                            onUpdateUser={handleUpdateUser}
                            onDeleteUser={handleDeleteUser}
                            onAddAuditLog={handleAddAuditLog}
                            operatorName={currentUserFullName}
                          />
                        </ProtectedComponent>
                      }
                    />
                    <Route
                      path="security"
                      element={
                        <ProtectedComponent allowedRoles={["ADMIN"]}>
                          <SecurityAuditModule
                            auditLogs={appState.auditLogs}
                            connectedDevices={appState.devices}
                            onTerminateSession={handleTerminateSession}
                            onAddAuditLog={handleAddAuditLog}
                            operatorName={currentUserFullName}
                          />
                        </ProtectedComponent>
                      }
                    />
                    <Route
                      path="audit"
                      element={
                        <ProtectedComponent allowedRoles={["ADMIN"]}>
                          <AuditLogModule auditLogs={appState.auditLogs} />
                        </ProtectedComponent>
                      }
                    />
                    <Route
                      path="my-account"
                      element={
                        <MyAccount
                          currentUser={currentUser}
                          onUpdateCurrentUser={handleUpdateCurrentUser}
                          onAddAuditLog={handleAddAuditLog}
                          onLogout={handleLogout}
                          apiConfig={apiConfig}
                          onUpdateApiConfig={handleUpdateApiConfig}
                        />
                      }
                    />
                    {/* Fallback interne vers Dashboard */}
                    <Route
                      path="*"
                      element={<Navigate to="/dashboard" replace />}
                    />
                  </Routes>
                </main>
              </div>
            </div>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}
