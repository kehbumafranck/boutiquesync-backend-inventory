/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Mail,
  Lock,
  Camera,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  UploadCloud,
  FileCheck2,
  Trash2,
  Globe,
  Database
} from 'lucide-react';
import { User } from '../types';
import { ApiConfig } from '../services/apiClient';

interface MyAccountProps {
  currentUser: User;
  onUpdateCurrentUser: (updatedUser: Partial<User>) => void;
  onAddAuditLog: (action: string, module: any, performedBy: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  onLogout: () => void;
  apiConfig: ApiConfig;
  onUpdateApiConfig: (config: Partial<ApiConfig>) => void;
}

export default function MyAccount({
  currentUser,
  onUpdateCurrentUser,
  onAddAuditLog,
  onLogout,
  apiConfig,
  onUpdateApiConfig
}: MyAccountProps) {
  // State for personal info
  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.imageUrl || '');
  
  // Employee profile editing restriction (locks identity fields for employees)
  const isEmployee = currentUser.role === 'EMPLOYEE';
  const isFirstNameLocked = isEmployee && !!currentUser.firstName;
  const isLastNameLocked = isEmployee && !!currentUser.lastName;
  const isEmailLocked = isEmployee && !!currentUser.email;
  const isProfilePhotoLocked = isEmployee;

  // Local state for API parameters
  const [apiUrlInput, setApiUrlInput] = useState(apiConfig.baseUrl);
  const [testingConn, setTestingConn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'PENDING' | 'CONNECTED' | 'FAILED'>('PENDING');

  const handleToggleApiMode = () => {
    const nextMode = !apiConfig.apiMode;
    onUpdateApiConfig({ apiMode: nextMode });
    
    onAddAuditLog(
      "Commutation mode API",
      "SECURITY",
      userFullName,
      `Passage vers le mode ${nextMode ? 'Connected (Spring Boot LIVE)' : 'Offline (Mock DB Local)'}`,
      "INFO"
    );
  };

  const handleSaveApiUrl = () => {
    if (!apiUrlInput.trim()) return;
    onUpdateApiConfig({ baseUrl: apiUrlInput.trim() });
    alert(`URL du serveur enregistrée : ${apiUrlInput.trim()}`);
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnectionStatus('PENDING');
    try {
      const response = await fetch(`${apiUrlInput.trim()}/api/products?page=0&size=1`, {
        method: 'GET',
        referrerPolicy: 'no-referrer'
      });
      if (response.status === 200 || response.ok) {
        setConnectionStatus('CONNECTED');
      } else {
        setConnectionStatus('FAILED');
      }
    } catch (err) {
      console.error(err);
      setConnectionStatus('FAILED');
    } finally {
      setTestingConn(false);
    }
  };
  
  // File Upload states (drag and drop)
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR' | null, text: string }>({ type: null, text: '' });

  // Theme states
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('user-theme') as 'light' | 'dark' | 'system') || 'dark';
  });

  const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

  // Apply Theme Injection dynamically to support instant toggle
  useEffect(() => {
    const applyTheme = (themeMode: 'light' | 'dark' | 'system') => {
      let resolvedTheme: 'light' | 'dark' = 'dark';
      if (themeMode === 'system') {
        const matchesDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedTheme = matchesDark ? 'dark' : 'light';
      } else {
        resolvedTheme = themeMode;
      }

      // Check if light-override exists
      let styleEl = document.getElementById('light-theme-override');
      if (resolvedTheme === 'light') {
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'light-theme-override';
          styleEl.innerHTML = `
            html, body {
              background-color: #f8fafc !important;
              color: #0f172a !important;
            }
            .bg-white, div.bg-white, section.bg-white, main.bg-white, header.bg-white {
              background-color: #ffffff !important;
              color: #0f172a !important;
              border-color: #e2e8f0 !important;
            }
            input, select, textarea {
              background-color: #ffffff !important;
              color: #0f172a !important;
              border-color: #cbd5e1 !important;
            }
            input::placeholder, select::placeholder, textarea::placeholder {
              color: #94a3b8 !important;
            }
            table th {
              background-color: #f1f5f9 !important;
              color: #475569 !important;
              border-color: #e2e8f0 !important;
            }
            table td {
              background-color: #ffffff !important;
              color: #334155 !important;
              border-color: #f1f5f9 !important;
            }
            tr:hover td {
              background-color: #f8fafc !important;
            }
            .text-slate-950, .text-slate-900, .text-slate-800, .text-slate-700, .text-slate-850 {
              color: #0f172a !important;
            }
            .text-slate-600, .text-slate-500, .text-slate-650 {
              color: #475569 !important;
            }
            .text-slate-400 {
              color: #64748b !important;
            }
            .active-nav, .nav-item-active {
              background-color: #e2e8f0 !important;
              color: #0f172a !important;
            }
            .border-slate-100, .border-slate-150, .border-slate-200 {
              border-color: #e2e8f0 !important;
            }
            .bg-slate-50, .bg-slate-50/50, .bg-slate-50/20 {
              background-color: #f8fafc !important;
            }
          `;
          document.head.appendChild(styleEl);
        }
      } else {
        if (styleEl) {
          styleEl.remove();
        }
      }
    };

    applyTheme(activeTheme);
    localStorage.setItem('user-theme', activeTheme);
  }, [activeTheme]);

  // Real-time password validation calculations
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

  const matchedRulesCount = [
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar
  ].filter(Boolean).length;

  // Visual Strength estimation
  let passwordStrength: 'LOW' | 'MEDIUM' | 'STRONG' = 'LOW';
  let strengthColor = 'bg-rose-500';
  let strengthWidth = 'w-1/3';
  let strengthLabel = 'Faible';

  if (matchedRulesCount >= 5) {
    passwordStrength = 'STRONG';
    strengthColor = 'bg-emerald-500';
    strengthWidth = 'w-full';
    strengthLabel = 'Excellent & Sécurisé';
  } else if (matchedRulesCount >= 3) {
    passwordStrength = 'MEDIUM';
    strengthColor = 'bg-amber-500';
    strengthWidth = 'w-2/3';
    strengthLabel = 'Intermédiaire';
  }

  // --- Profile drag & drop actions ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Veuillez déposer ou sélectionner uniquement des fichiers images.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Submit personal details
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      alert("Tous les champs d'informations personnelles sont requis.");
      return;
    }

    if (isEmployee) {
      alert("Action non autorisée : Les informations personnelles des employés sont verrouillées. Seul le mot de passe peut être modifié.");
      return;
    }

    onUpdateCurrentUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      imageUrl: avatarUrl
    });

    onAddAuditLog(
      "Mise à jour du profil",
      "SECURITY",
      userFullName,
      `Changements validés sur coordonnées : Nom=${lastName.trim()}, Prénom=${firstName.trim()}, Email=${email.trim()}`,
      "INFO"
    );

    alert("Vos modifications de profil ont été enregistrées avec succès.");
  };

  // Submit password modifications
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatusMsg({ type: 'ERROR', text: 'Le mot de passe actuel est requis.' });
      return;
    }

    if (matchedRulesCount < 4) {
      setPasswordStatusMsg({ type: 'ERROR', text: 'Le nouveau mot de passe ne respecte pas les critères de complexité exigés.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatusMsg({ type: 'ERROR', text: 'La confirmation ne correspond pas au nouveau mot de passe.' });
      return;
    }

    // Call update callback
    onUpdateCurrentUser({
      password: newPassword
    });

    onAddAuditLog(
      "Changement de mot de passe",
      "SECURITY",
      userFullName,
      "Mot de passe renouvelé avec succès avec validation de complexité RBAC",
      "INFO"
    );

    setPasswordStatusMsg({ type: 'SUCCESS', text: 'Mot de passe mis à jour avec succès.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setPasswordStatusMsg({ type: null, text: '' });
    }, 4000);
  };

  return (
    <div id="my-account-page" className="max-w-4xl mx-auto space-y-6 font-sans antialiased text-slate-850">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Gestion de mon Profil Personnel <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-full">{currentUser.role}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal">
            Gérez vos coordonnées d'authentification, mettez à jour votre image de profil, changez de mot de passe de sécurité et sélectionnez votre direction artistique préférée.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="mt-4 md:mt-0 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          Fermer la session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PERSONAL DETAILS & PICTURE */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            <UserIcon className="h-4 w-4 text-indigo-500" /> Informations Personnelles
          </h3>

          {isEmployee && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-[11px] font-semibold text-amber-700 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-900">Modifications restreintes</p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                  En tant que salarié, votre nom, prénom et e-mail ne sont plus modifiables une fois enregistrés. Seul le renouvellement de votre mot de passe de connexion est autorisé.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            {/* Real Drag & Drop File Upload uploader */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Photo de profil / Avatar</label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-900 text-white font-black text-xl flex items-center justify-center uppercase border border-slate-200">
                      {firstName.substring(0, 1)}{lastName.substring(0, 1)}
                    </div>
                  )}
                  {avatarUrl && !isProfilePhotoLocked && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full border border-white shadow-sm cursor-pointer"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Drag and drop target wrapper */}
                <div
                  onDragEnter={!isProfilePhotoLocked ? handleDrag : undefined}
                  onDragOver={!isProfilePhotoLocked ? handleDrag : undefined}
                  onDragLeave={!isProfilePhotoLocked ? handleDrag : undefined}
                  onDrop={!isProfilePhotoLocked ? handleDrop : undefined}
                  onClick={!isProfilePhotoLocked ? () => fileInputRef.current?.click() : undefined}
                  className={`flex-1 w-full border-2 border-dashed rounded-xl p-3.5 text-center transition flex flex-col items-center justify-center ${
                    isProfilePhotoLocked 
                      ? 'border-slate-200 bg-slate-50/50 cursor-not-allowed text-slate-450 text-slate-400'
                      : isDragActive 
                        ? 'border-indigo-500 bg-indigo-50/10 cursor-pointer' 
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <UploadCloud className={`h-5 w-5 mb-1 ${isProfilePhotoLocked ? 'text-slate-350' : 'text-indigo-500'}`} />
                  <p className="text-[10px] font-bold text-slate-700">
                    {isProfilePhotoLocked ? 'Changement de photo verrouillé' : 'Déposez votre image ici ou cliquez pour parcourir'}
                  </p>
                  <p className="text-[9px] text-slate-450 text-slate-400 mt-0.5">
                    {isProfilePhotoLocked ? 'Modification réservée aux administrateurs' : 'Formats acceptés : PNG, JPG, GIF (Base64)'}
                  </p>
                  
                  {!isProfilePhotoLocked && (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Prénom</label>
                  {isFirstNameLocked && (
                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5 text-indigo-500" /> Verrouillé
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isFirstNameLocked}
                  className={`block w-full text-xs p-2.5 rounded-xl border focus:outline-none transition ${
                    isFirstNameLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium' : ''
                  }`}
                  placeholder="Prénom"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nom</label>
                  {isLastNameLocked && (
                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5 text-indigo-500" /> Verrouillé
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLastNameLocked}
                  className={`block w-full text-xs p-2.5 rounded-xl border focus:outline-none transition ${
                    isLastNameLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium' : ''
                  }`}
                  placeholder="Nom de famille"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Adresse e-mail</label>
                {isEmailLocked && (
                  <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                    <Lock className="h-2.5 w-2.5 text-indigo-500" /> Verrouillé
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEmailLocked}
                  className={`block w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border focus:outline-none transition ${
                    isEmailLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium' : ''
                  }`}
                  placeholder="nom@entreprise.fr"
                  required
                />
              </div>
            </div>

            {!isEmployee ? (
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Enregistrer mes coordonnées
              </button>
            ) : (
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 p-2 bg-emerald-50 rounded-xl max-w-max border border-emerald-100 font-mono">
                <Check className="h-4 w-4" /> Informations vérifiées et protégées
              </div>
            )}

          </form>

          {/* DIRECTION ARTISTIQUE / THEME SELECTOR */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" /> Direction Artistique & Thème
            </h3>

            <div className="grid grid-cols-3 gap-3">
              
              {/* Theme option 1: Light Mode */}
              <button
                onClick={() => setActiveTheme('light')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition text-center ${
                  activeTheme === 'light' 
                    ? 'border-indigo-600 bg-indigo-50/10 text-indigo-700' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Sun className="h-5 w-5" />
                <span className="text-[9px] font-bold block">Thème Clair</span>
              </button>

              {/* Theme option 2: Dark Mode */}
              <button
                onClick={() => setActiveTheme('dark')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition text-center ${
                  activeTheme === 'dark' 
                    ? 'border-indigo-600 bg-indigo-50/10 text-indigo-700' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Moon className="h-5 w-5" />
                <span className="text-[9px] font-bold block">Thème Sombre</span>
              </button>

              {/* Theme option 3: System Mode */}
              <button
                onClick={() => setActiveTheme('system')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition text-center ${
                  activeTheme === 'system' 
                    ? 'border-indigo-600 bg-indigo-50/10 text-indigo-700' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-[9px] font-bold block">Auto Système</span>
              </button>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SECURITY & PASSWORD CHANGE */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-emerald-600" /> Sécurité & Mot de Passe
          </h3>

          <form onSubmit={handleSavePassword} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mot de passe actuel</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full text-xs p-2.5 rounded-xl border focus:outline-none transition font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nouveau mot de passe</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[9px] text-indigo-600 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPassword ? 'Masquer' : 'Révéler'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full text-xs p-2.5 rounded-xl border focus:outline-none transition font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Confirmer le nouveau mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full text-xs p-2.5 rounded-xl border focus:outline-none transition font-mono"
                required
              />
            </div>

            {/* REAL-TIME COMPLEXITY CHECKLIST */}
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Critères de sécurité requis</span>
              
              <div className="grid grid-cols-1 gap-1.5 text-[10px] font-medium">
                <div className="flex items-center gap-1.5">
                  <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    hasMinLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {hasMinLength ? <Check className="h-2.5 w-2.5 font-bold" /> : <X className="h-2.5 w-2.5" />}
                  </span>
                  <span className={hasMinLength ? 'text-slate-800' : 'text-slate-400'}>Minimum 8 caractères</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    hasUppercase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {hasUppercase ? <Check className="h-2.5 w-2.5 font-bold" /> : <X className="h-2.5 w-2.5" />}
                  </span>
                  <span className={hasUppercase ? 'text-slate-800' : 'text-slate-400'}>Une lettre majuscule (A-Z)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    hasLowercase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {hasLowercase ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  </span>
                  <span className={hasLowercase ? 'text-slate-800' : 'text-slate-400'}>Une lettre minuscule (a-z)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {hasNumber ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  </span>
                  <span className={hasNumber ? 'text-slate-800' : 'text-slate-400'}>Un chiffre (0-9)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    hasSpecialChar ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {hasSpecialChar ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  </span>
                  <span className={hasSpecialChar ? 'text-slate-800' : 'text-slate-400'}>Un caractère spécial (@, $, %, !, *)</span>
                </div>
              </div>

              {/* Password visual strength meter */}
              {newPassword && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100/50">
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-slate-400">Force estimée :</span>
                    <span className={matchedRulesCount >= 5 ? 'text-emerald-600' : matchedRulesCount >= 3 ? 'text-amber-600' : 'text-rose-600'}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${strengthColor} ${strengthWidth} transition-all duration-300`} />
                  </div>
                </div>
              )}

              {/* Password match feedback */}
              {confirmPassword && (
                <div className="pt-1.5 text-[9px] font-bold">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Mots de passe identiques
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1">
                      <X className="h-3 w-3" /> Les mots de passe diffèrent
                    </span>
                  )}
                </div>
              )}
            </div>

            {passwordStatusMsg.text && (
              <div className={`p-3 rounded-xl border text-[10px] font-bold ${
                passwordStatusMsg.type === 'SUCCESS' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {passwordStatusMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex justify-center items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              Changer mon mot de passe
            </button>

          </form>
        </div>

      </div>

      {/* BOUTIQUESYNC SPRING BOOT API CONNECTION MODULE */}
      {!isEmployee && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" /> Services d'Intégration d'API Spring Boot (BoutiqueSync)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block text-slate-950">État de la synchronisation</span>
              <p className="text-[11px] text-slate-400 leading-normal">
                BoutiqueSync intègre un serveur Spring Boot de production et une base de données MongoDB pour synchroniser vos ventes, factures PDF, mouvements de stock et gestion d'utilisateurs. Vous pouvez commuter dynamiquement entre la base de démonstration hors-ligne locale et le serveur API connecté de votre choix.
              </p>
              
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-bold text-slate-800">Mode actif :</span>
                <button
                  onClick={handleToggleApiMode}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 ${
                    apiConfig.apiMode
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {apiConfig.apiMode ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      LIVE API CONNECTÉ (Spring Boot)
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      HORS-LIGNE MOCK DB (Démo Locale)
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">URL du Serveur API</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiUrlInput}
                    onChange={(e) => setApiUrlInput(e.target.value)}
                    className="block flex-1 text-xs p-2 rounded-xl border focus:outline-none transition font-mono bg-white text-slate-900 border-slate-200"
                    placeholder="http://localhost:8085"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiUrl}
                    className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Appliquer
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConn}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-xl transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  {testingConn ? 'Interrogation...' : 'Tester la connexion'}
                </button>
                <span className={`text-[11px] font-bold ${
                  connectionStatus === 'CONNECTED' ? 'text-emerald-600' : connectionStatus === 'FAILED' ? 'text-rose-600' : 'text-slate-400'
                }`}>
                  {connectionStatus === 'CONNECTED' && '✓ Serveur disponible (200 OK)'}
                  {connectionStatus === 'FAILED' && '✗ Connexion impossible'}
                  {connectionStatus === 'PENDING' && 'Inactif'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
