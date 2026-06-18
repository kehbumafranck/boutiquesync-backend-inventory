/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Mail,
  Send,
  UserPlus,
  Trash2,
  Shield,
  Key
} from 'lucide-react';
import { User, UserRole } from '../types';

// AuditModule et AuditSeverity sont définis dans AppProvider et exportés
// pour éviter de dupliquer l'union littérale dans chaque composant.
import { AuditModule, AuditSeverity } from "./AppProvider";

interface UserManagementProps {
  users: User[];
  onInviteUser: (email: string) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onAddAuditLog: (action: string, module: AuditModule, performedBy: string, details: string, severity: AuditSeverity) => void;
  operatorName: string;
}

export default function UserManagement({
  users,
  onInviteUser,
  onUpdateUser,
  onDeleteUser,
  onAddAuditLog,
  operatorName
}: UserManagementProps) {
  
  const [invitedEmail, setInvitedEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sandbox simulation URL state
  const [generatedLink, setGeneratedLink] = useState('');
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [activationEmail, setActivationEmail] = useState('');

  // Activation form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');

  // Handle invitation trigger
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGeneratedLink('');

    if (!invitedEmail) return;

    if (users.some(u => u.email.toLowerCase() === invitedEmail.toLowerCase())) {
      setError("Cette adresse email est déjà utilisée.");
      return;
    }

    onInviteUser(invitedEmail);

    onAddAuditLog(
      'Invitation utilisateur',
      'ADMIN',
      operatorName,
      `Génération d'une invitation sécurisée pour l'adresse: ${invitedEmail}`,
      'INFO'
    );

    setSuccess(`Invitation d'activation générée avec succès pour ${invitedEmail}.`);
    
    // Simulate link generation
    const mockActivationToken = "tok_" + Math.random().toString(36).substring(2, 10);
    const mockUrl = `https://saas-nexus.pme/activate?token=${mockActivationToken}&email=${encodeURIComponent(invitedEmail)}`;
    setGeneratedLink(mockUrl);
    setActivationEmail(invitedEmail);
    setInvitedEmail('');
  };

  // Simulated activation process
  const handleActivationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !username || !pwd || !pwdConfirm) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    if (pwd !== pwdConfirm) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }

    // Find the pending user and activate them
    const pendingUser = users.find(u => u.email.toLowerCase() === activationEmail.toLowerCase());
    if (pendingUser) {
      onUpdateUser({
        ...pendingUser,
        firstName,
        lastName,
        username,
        status: 'ACTIVE',
        mfaEnabled: false
      });

      onAddAuditLog(
        'Compte activé',
        'AUTH',
        firstName + ' ' + lastName,
        `Création de compte finalisée par l'utilisateur pour l'email: ${activationEmail}`,
        'INFO'
      );

      alert(`Compte activé avec succès ! Bienvenue à bord, ${firstName}. Vous pouvez maintenant utiliser ces identifiants pour vous connecter.`);
      setIsActivationOpen(false);
      setGeneratedLink('');
      setSuccess('');
    }
  };

  // SUSPEND OR REACTIVATE OPERATORS
  const handleToggleStatus = (user: User) => {
    const isSuspending = user.status === 'ACTIVE';
    const nextStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';
    
    if (confirm(`Voulez-vous vraiment ${isSuspending ? 'SUSPENDRE temporairement' : 'RÉACTIVER'} l'utilisateur ${user.firstName} ${user.lastName} ?`)) {
      onUpdateUser({
        ...user,
        status: nextStatus
      });

      onAddAuditLog(
        isSuspending ? 'Opérateur suspendu' : 'Opérateur réactivé',
        'ADMIN',
        operatorName,
        `Modification du statut de ${user.firstName} ${user.lastName} à: ${nextStatus}`,
        isSuspending ? 'WARNING' : 'INFO'
      );
    }
  };

  // REVOKE CREDENTIALS DEFINITIVELY
  const handleDeleteUser = (user: User) => {
    if (user.email === 'alimabodouin@gmail.com') {
      alert("Action refusée : Vous ne pouvez pas supprimer votre propre compte Super-Administrateur.");
      return;
    }

    if (confirm(`ACTION SÉCURITÉ CRITIQUE : Supprimer définitivement l'ensemble des accès pour ${user.firstName} ${user.lastName} ? Cette action révoquera toutes ses sessions immédiatement.`)) {
      onDeleteUser(user.id);
      onAddAuditLog(
        'Accès utilisateur révoqués',
        'ADMIN',
        operatorName,
        `Révocation administrative absolue pour l'id: ${user.id} (${user.email})`,
        'CRITICAL'
      );
    }
  };

  // MODIFY ROLE
  const handleRoleToggle = (user: User) => {
    if (user.email === 'alimabodouin@gmail.com') {
      alert("Impossible de destituer le membre fondateur super-administrateur.");
      return;
    }

    const nextRole: UserRole = user.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
    if (confirm(`Modifier les permissions de ${user.firstName} pour passer au rôle d'affectation : ${nextRole} ?`)) {
      onUpdateUser({
        ...user,
        role: nextRole
      });

      onAddAuditLog(
        'Rôle modifié',
        'ADMIN',
        operatorName,
        `Rôle de de ${user.firstName} ${user.lastName} modifié vers: ${nextRole}`,
        'WARNING'
      );
    }
  };

  return (
    <div id="users-administration-module" className="space-y-6 font-sans antialiased text-slate-800">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Utilisateurs, Équipes & Autorisations</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gérez les autorisations, créez des invitations d'embauche, attribuez des permissions et suspendez les comptes compromis.
          </p>
        </div>
      </div>

      {/* COMPONENT COLUMNS LAYOUT CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Directory of users list (7 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Membres rattachés à votre entreprise</span>
            <span className="text-[10px] text-slate-400 font-mono">Contrôle strict des identités</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/25 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                  <th className="py-2.5 px-4">Utilisateur</th>
                  <th className="py-2.5 px-4 text-center">Rôle permissions</th>
                  <th className="py-2.5 px-4 text-center">Sécurité MFA</th>
                  <th className="py-2.5 px-4 text-center">Statut d'accès</th>
                  <th className="py-2.5 px-4 text-right">Actions administratives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {users.map((u) => {
                  const isSuperAdmin = u.email === 'alimabodouin@gmail.com';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-900 border-2 border-white text-white font-bold text-xs flex items-center justify-center uppercase">
                            {u.firstName ? u.firstName.substring(0,1) : '?'}{u.lastName ? u.lastName.substring(0,1) : u.email.substring(0,1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {u.firstName ? `${u.firstName} ${u.lastName}` : 'En attente de configuration'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRoleToggle(u)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-left transition hover:ring-1 hover:ring-slate-400 cursor-pointer ${
                            u.role === 'ADMIN'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title="Cliquer pour changer de rôle"
                        >
                          {u.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : null}
                          {u.role === 'ADMIN' ? 'Administrateur' : 'Salarie'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          u.mfaEnabled
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {u.mfaEnabled ? 'ACTIF (OTP)' : 'DESACTIVE'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide ${
                          u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' :
                          u.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                          'bg-rose-50 text-rose-800'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          
                          {/* Toggle active / suspend */}
                          {u.status !== 'PENDING' && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1 rounded text-xs px-2 font-bold cursor-pointer transition ${
                                u.status === 'ACTIVE'
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Suspendre l\'accès de l\'opérateur' : 'Rétablir l\'accès'}
                            >
                              {u.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                            </button>
                          )}

                          {/* Delete permanently */}
                          {!isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Révoquer définitivement les accès"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Invite form workspace & simulated sandbox link activation (5 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Invite email box */}
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Inviter un Collaborateur</h3>
              <p className="text-[10px] text-slate-400 mt-1">Le futur employé recevra un email unique d'activation de credentials.</p>
            </div>

            {error && <p className="text-xs text-rose-500 bg-rose-50 p-2 rounded-lg font-medium">{error}</p>}
            {success && <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg font-semibold">{success}</p>}

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="email.employe@entreprise.fr"
                  value={invitedEmail}
                  onChange={(e) => setInvitedEmail(e.target.value)}
                  className="block w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-950 bg-slate-50/50 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Générer l'Invitation</span>
              </button>
            </form>

            {/* Simulated instant activation link */}
            {generatedLink && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-indigo-50/20 p-3 rounded-xl border border-dashed border-indigo-150">
                <span className="text-[9px] font-bold text-indigo-600 block uppercase">🚀 SIMULATEUR CLOUD EMAIL :</span>
                <p className="text-[10px] text-slate-500 mt-1">Pour que l'employé complète son profil (Nom, Prénom, Passe) sans email matériel réel, cliquez ci-dessous pour ouvrir le portail d'enregistrement :</p>
                
                <button
                  onClick={() => setIsActivationOpen(true)}
                  className="mt-2 text-[10px] font-extrabold text-indigo-805 text-indigo-800 underline hover:text-indigo-950 flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" /> Ouvrir le portail d'Activation Simulé
                </button>
              </div>
            )}
          </div>

          {/* Interactive Role Permissions map widget */}
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Permissions par rôle</span>
            <div className="space-y-2 text-xs font-semibold">
              <div className="p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                <p className="text-slate-900 font-bold">Administrateur</p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Accès absolu aux finances, audits de sécurité, modification des permissions des employés et modification globale des produits.</p>
              </div>
              <div className="p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                <p className="text-slate-900 font-bold">Salarie / Employé</p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Autorisé en guichet Caisse tactile, listes de produits, clients de fidélité et enregistrements normaux d'entrées/sorties de stock.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* PORTAL SIMULATION DRAWER ACTIVATION WINDOW */}
      {isActivationOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-105 shadow-2xl relative animate-in zoom-in duration-200">
            
            <div className="text-center pb-4 border-b border-slate-50">
              <span className="h-10 w-10 bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center rounded-2xl mx-auto mb-2">
                <Key className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-black text-slate-900">Portail d'Activation Salarié</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Enregistrement initial consécutif à l'invitation sur {activationEmail}</p>
            </div>

            <form onSubmit={handleActivationSubmit} className="mt-4 space-y-3 text-xs font-medium text-left">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-0.5">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Thomas"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-0.5">Nom d'utilisateur d'accès *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="thomas_dupont"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-905 focus:ring-slate-950 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-750 mb-0.5">Choisir un Mot de passe *</label>
                <input
                  type="password"
                  required
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="Min 6 caractères"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-750 mb-0.5">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  required
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950 font-sans"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-50">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-650 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Activer mon compte
                </button>
                <button
                  type="button"
                  onClick={() => setIsActivationOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
