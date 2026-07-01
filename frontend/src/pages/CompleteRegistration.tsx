/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CompleteRegistration — Page d'activation d'un compte employé via invitation.
 *
 * Flux :
 *  1. Lecture du token depuis les query params (?token=...) via React Router.
 *  2. Vérification du token via boutiqueApi.invitations.verifyToken()
 *     → succès : affiche le formulaire de finalisation.
 *     → échec   : affiche un écran d'erreur explicite.
 *  3. Soumission via boutiqueApi.invitations.completeRegistration()
 *     → succès : compte à rebours puis redirection vers "/" (login).
 *
 * Toutes les communications réseau sont déléguées à apiClient.ts.
 * Style cohérent avec LoginScreen.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Loader2,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { boutiqueApi } from "../services/apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// Types locaux
// ─────────────────────────────────────────────────────────────────────────────

type PageState =
  | "VERIFYING"   // vérification du token en cours
  | "TOKEN_VALID" // token ok, formulaire visible
  | "TOKEN_INVALID" // token expiré / invalide / absent
  | "SUBMITTING"  // envoi du formulaire en cours
  | "SUCCESS";    // compte activé, redirection imminente

interface FormValues {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  password?: string;
  confirmPassword?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Règle Spring Boot : 8 car. min., 1 maj., 1 min., 1 chiffre, 1 spécial */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const REDIRECT_DELAY = 5; // secondes avant redirection automatique

const INITIAL_FORM: FormValues = {
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
  phoneNumber: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function CompleteRegistration() {
  // React Router — lecture propre des query params
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("VERIFYING");
  const [verifyError, setVerifyError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);
  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ── 1. Vérification du token au montage ───────────────────────────────────
  const verifyToken = useCallback(async () => {
    if (!token) {
      setVerifyError(
        "Aucun token d'invitation trouvé dans l'URL. Vérifiez le lien reçu par email.",
      );
      setPageState("TOKEN_INVALID");
      return;
    }

    try {
      await boutiqueApi.invitations.verifyToken(token);
      setPageState("TOKEN_VALID");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Lien d'invitation invalide ou expiré. Contactez votre administrateur.";
      setVerifyError(msg);
      setPageState("TOKEN_INVALID");
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  // ── 2. Compte à rebours + redirection post-succès ─────────────────────────
  useEffect(() => {
    if (pageState !== "SUCCESS") return;

    if (countdown <= 0) {
      navigate("/", { replace: true });
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [pageState, countdown, navigate]);

  // ── 3. Mise à jour du formulaire avec effacement d'erreur à la saisie ─────
  const handleChange = useCallback(
    (field: keyof FormValues, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  // ── 4. Validation locale côté client ──────────────────────────────────────
  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!form.firstName.trim()) errors.firstName = "Le prénom est obligatoire.";
    if (!form.lastName.trim()) errors.lastName = "Le nom est obligatoire.";

    if (!form.password) {
      errors.password = "Le mot de passe est obligatoire.";
    } else if (!PASSWORD_REGEX.test(form.password)) {
      errors.password =
        "8 caractères min., avec majuscule, minuscule, chiffre et caractère spécial (@$!%*?&).";
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "La confirmation est obligatoire.";
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── 5. Soumission du formulaire ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate() || !token) return;

    setPageState("SUBMITTING");

    try {
      await boutiqueApi.invitations.completeRegistration({
        token,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
        phoneNumber: form.phoneNumber.trim() || null,
      });

      setPageState("SUCCESS");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Une erreur est survenue lors de l'activation. Réessayez ou contactez votre administrateur.";
      setSubmitError(msg);
      setPageState("TOKEN_VALID"); // retour au formulaire pour correction
    }
  };

  const isSubmitting = pageState === "SUBMITTING";

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased relative overflow-hidden">
      {/* Fond décoratif ambiant */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute -top-[30%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-200 blur-3xl" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-100 blur-3xl" />
      </div>

      {/* En-tête marque */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            BoutiqueSync ERP
          </span>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {pageState === "VERIFYING" && "Vérification en cours…"}
          {(pageState === "TOKEN_VALID" || isSubmitting) && "Finalisez votre compte"}
          {pageState === "TOKEN_INVALID" && "Lien invalide"}
          {pageState === "SUCCESS" && "Compte activé !"}
        </h2>

        <p className="mt-2 text-center text-sm text-slate-500">
          {pageState === "VERIFYING" && "Validation de votre invitation…"}
          {pageState === "TOKEN_VALID" && "Renseignez vos informations pour accéder à la console"}
          {isSubmitting && "Création de votre profil opérateur…"}
          {pageState === "TOKEN_INVALID" && "Ce lien d'invitation est expiré ou déjà utilisé"}
          {pageState === "SUCCESS" && `Redirection vers la console dans ${countdown}s…`}
        </p>
      </div>

      {/* Carte principale */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-2xl sm:px-10">

          {/* ── VÉRIFICATION EN COURS ── */}
          {pageState === "VERIFYING" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500">
                Validation du lien d'invitation…
              </p>
            </div>
          )}

          {/* ── TOKEN INVALIDE ── */}
          {pageState === "TOKEN_INVALID" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <XCircle className="h-9 w-9 text-rose-500" />
                </div>
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl w-full">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-800 font-medium">
                      {verifyError}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Que faire ?</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Vérifiez que vous avez copié le lien complet depuis l'email.</li>
                  <li>Les liens d'invitation expirent après 24 heures.</li>
                  <li>Contactez votre administrateur pour recevoir un nouvel email d'invitation.</li>
                </ul>
              </div>

              <a
                href="/"
                className="w-full flex justify-center py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Retour à la page de connexion
              </a>
            </div>
          )}

          {/* ── SUCCÈS ── */}
          {pageState === "SUCCESS" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="h-20 w-20 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>

              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl w-full">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-800 font-medium">
                    <p className="font-bold">Votre compte est maintenant actif.</p>
                    <p className="mt-1 text-xs font-normal">
                      Bienvenue sur BoutiqueSync ERP. Redirection vers la console
                      dans <strong>{countdown}</strong> seconde{countdown > 1 ? "s" : ""}.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate("/", { replace: true })}
                className="w-full flex justify-center items-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition"
              >
                Accéder à la console maintenant
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── FORMULAIRE (TOKEN_VALID + SUBMITTING) ── */}
          {(pageState === "TOKEN_VALID" || isSubmitting) && (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Badge token vérifié */}
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">
                  Invitation vérifiée — complétez votre profil ci-dessous
                </p>
              </div>

              {/* Erreur globale soumission */}
              {submitError && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-800 font-medium">{submitError}</p>
                </div>
              )}

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-3">
                <TextInputField
                  label="Prénom"
                  required
                  icon={<User className="h-4 w-4 text-slate-400" />}
                  value={form.firstName}
                  onChange={(v) => handleChange("firstName", v)}
                  placeholder="Jean"
                  disabled={isSubmitting}
                  error={fieldErrors.firstName}
                />
                <TextInputField
                  label="Nom"
                  required
                  icon={<User className="h-4 w-4 text-slate-400" />}
                  value={form.lastName}
                  onChange={(v) => handleChange("lastName", v)}
                  placeholder="Dupont"
                  disabled={isSubmitting}
                  error={fieldErrors.lastName}
                />
              </div>

              {/* Téléphone (optionnel) */}
              <TextInputField
                label="Téléphone"
                type="tel"
                icon={<Phone className="h-4 w-4 text-slate-400" />}
                value={form.phoneNumber}
                onChange={(v) => handleChange("phoneNumber", v)}
                placeholder="+237 6 99 00 00 00"
                disabled={isSubmitting}
                hint="(optionnel)"
              />

              {/* Mot de passe */}
              <PasswordField
                label="Mot de passe"
                required
                value={form.password}
                onChange={(v) => handleChange("password", v)}
                show={showPassword}
                onToggleShow={() => setShowPassword((s) => !s)}
                placeholder="Min. 8 car., majuscule, chiffre, spécial"
                disabled={isSubmitting}
                error={fieldErrors.password}
                hint="8 caractères min. · 1 majuscule · 1 chiffre · 1 caractère spécial"
              />

              {/* Confirmation mot de passe */}
              <PasswordField
                label="Confirmer le mot de passe"
                required
                value={form.confirmPassword}
                onChange={(v) => handleChange("confirmPassword", v)}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((s) => !s)}
                placeholder="••••••••"
                disabled={isSubmitting}
                error={fieldErrors.confirmPassword}
              />

              {/* Indicateur de force */}
              <PasswordStrengthBar password={form.password} />

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activation du compte…
                  </>
                ) : (
                  <>
                    Activer mon compte
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-400">
                Vous avez déjà un compte ?{" "}
                <a href="/" className="font-semibold text-slate-700 hover:underline">
                  Se connecter
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants réutilisables (locaux à ce fichier)
// ─────────────────────────────────────────────────────────────────────────────

interface TextInputFieldProps {
  label: string;
  required?: boolean;
  type?: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

function TextInputField({
  label, required, type = "text", icon,
  value, onChange, placeholder, disabled, error, hint,
}: TextInputFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
        {hint && <span className="ml-1 text-slate-400 font-normal">{hint}</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full ${icon ? "pl-9" : "pl-3"} pr-3 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition disabled:opacity-50 ${
            error ? "border-rose-400" : "border-slate-200"
          }`}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

function PasswordField({
  label, required, value, onChange, show, onToggleShow,
  placeholder, disabled, error, hint,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition disabled:opacity-50 ${
            error ? "border-rose-400" : "border-slate-200"
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleShow}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-[11px] text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Indicateur de force du mot de passe
// ─────────────────────────────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  const labels = ["Très faible", "Faible", "Correct", "Fort", "Très fort"];
  const barColors = ["bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];
  const textColors = ["text-rose-600", "text-orange-600", "text-amber-600", "text-emerald-600", "text-emerald-700"];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? barColors[score] : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${textColors[score]}`}>
        {labels[score]}
      </p>
    </div>
  );
}
