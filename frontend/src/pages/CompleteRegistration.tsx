/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CompleteRegistration — Page d'activation d'un compte employé via invitation.
 *
 * Flux :
 *  1. Lecture du token depuis les query params (?token=...).
 *  2. Vérification du token via GET /invite/verify?token=...
 *     → succès : affiche le formulaire de finalisation.
 *     → échec   : affiche un écran d'erreur explicite.
 *  3. Soumission du formulaire via POST /invite/complete.
 *     → succès : redirige vers "/" (connexion à la console).
 *
 * Style : cohérent avec LoginScreen (slate-950, rounded-2xl, Tailwind).
 */

import { useState, useEffect, useCallback } from "react";
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
import { axiosInstance } from "../components/useApiRequest";
import { getApiConfig } from "../services/apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PageState =
  | "VERIFYING" // vérification du token en cours
  | "TOKEN_VALID" // token ok, formulaire visible
  | "TOKEN_INVALID" // token expiré / invalide
  | "SUBMITTING" // envoi du formulaire en cours
  | "SUCCESS"; // compte activé, redirection imminente

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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Règle Spring Boot : 8 car., 1 maj., 1 min., 1 chiffre, 1 spécial */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function buildUrl(path: string): string {
  const { baseUrl } = getApiConfig();
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function getTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export default function CompleteRegistration() {
  const token = getTokenFromUrl();

  const [pageState, setPageState] = useState<PageState>("VERIFYING");
  const [verifyError, setVerifyError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const [form, setForm] = useState<FormValues>({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });

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
      await axiosInstance.get(
        buildUrl(`/invite/verify?token=${encodeURIComponent(token)}`),
      );
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

  // ── 2. Compte à rebours avant redirection post-succès ─────────────────────
  useEffect(() => {
    if (pageState !== "SUCCESS") return;
    if (countdown <= 0) {
      window.location.href = "/";
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [pageState, countdown]);

  // ── 3. Mise à jour du formulaire ──────────────────────────────────────────
  const handleChange = (field: keyof FormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Efface l'erreur dès que l'utilisateur retape
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ── 4. Validation locale ──────────────────────────────────────────────────
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

    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── 5. Soumission ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setPageState("SUBMITTING");

    try {
      await axiosInstance.post(buildUrl("/invite/complete"), {
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
      setPageState("TOKEN_VALID"); // retour au formulaire
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased relative overflow-hidden">
      {/* Fond décoratif ambiant — identique à LoginScreen */}
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
            SaaS Nexus ERP
          </span>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {pageState === "VERIFYING" && "Vérification en cours…"}
          {pageState === "TOKEN_VALID" && "Finalisez votre compte"}
          {pageState === "TOKEN_INVALID" && "Lien invalide"}
          {pageState === "SUBMITTING" && "Activation en cours…"}
          {pageState === "SUCCESS" && "Compte activé !"}
        </h2>

        <p className="mt-2 text-center text-sm text-slate-500">
          {pageState === "VERIFYING" && "Validation de votre invitation…"}
          {pageState === "TOKEN_VALID" &&
            "Renseignez vos informations pour accéder à la console"}
          {pageState === "TOKEN_INVALID" &&
            "Ce lien d'invitation est expiré ou déjà utilisé"}
          {pageState === "SUBMITTING" && "Création de votre profil opérateur…"}
          {pageState === "SUCCESS" &&
            `Redirection vers la console dans ${countdown}s…`}
        </p>
      </div>

      {/* Carte principale */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-2xl sm:px-10">
          {/* ── VÉRIFICATION ── */}
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
                  <li>
                    Vérifiez que vous avez copié le lien complet depuis l'email.
                  </li>
                  <li>Les liens d'invitation expirent après 48 heures.</li>
                  <li>
                    Contactez votre administrateur pour recevoir un nouvel email
                    d'invitation.
                  </li>
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
                    <p className="font-bold">
                      Votre compte est maintenant actif.
                    </p>
                    <p className="mt-1 text-xs font-normal">
                      Bienvenue sur SaaS Nexus ERP. Vous allez être redirigé
                      vers la console de connexion dans{" "}
                      <strong>{countdown}</strong> seconde
                      {countdown > 1 ? "s" : ""}.
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="/"
                className="w-full flex justify-center items-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition"
              >
                Accéder à la console maintenant
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* ── FORMULAIRE ── */}
          {(pageState === "TOKEN_VALID" || pageState === "SUBMITTING") && (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  <p className="text-sm text-rose-800 font-medium">
                    {submitError}
                  </p>
                </div>
              )}

              {/* Prénom + Nom sur la même ligne */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prénom <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) =>
                        handleChange("firstName", e.target.value)
                      }
                      placeholder="Jean"
                      disabled={pageState === "SUBMITTING"}
                      className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition disabled:opacity-50 ${
                        fieldErrors.firstName
                          ? "border-rose-400"
                          : "border-slate-200"
                      }`}
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      placeholder="Dupont"
                      disabled={pageState === "SUBMITTING"}
                      className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition disabled:opacity-50 ${
                        fieldErrors.lastName
                          ? "border-rose-400"
                          : "border-slate-200"
                      }`}
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Téléphone (optionnel) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Téléphone
                  <span className="ml-1 text-slate-400 font-normal">
                    (optionnel)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      handleChange("phoneNumber", e.target.value)
                    }
                    placeholder="+237 6 99 00 00 00"
                    disabled={pageState === "SUBMITTING"}
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mot de passe <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Min. 8 car., majuscule, chiffre, spécial"
                    disabled={pageState === "SUBMITTING"}
                    className={`block w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition disabled:opacity-50 ${
                      fieldErrors.password
                        ? "border-rose-400"
                        : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {fieldErrors.password}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">
                    8 caractères min. · 1 majuscule · 1 chiffre · 1 caractère
                    spécial
                  </p>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirmer le mot de passe{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    placeholder="••••••••"
                    disabled={pageState === "SUBMITTING"}
                    className={`block w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition disabled:opacity-50 ${
                      fieldErrors.confirmPassword
                        ? "border-rose-400"
                        : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Indicateur de force du mot de passe */}
              <PasswordStrengthBar password={form.password} />

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={pageState === "SUBMITTING"}
                className="w-full flex justify-center items-center gap-2 py-3 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pageState === "SUBMITTING" ? (
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
                <a
                  href="/"
                  className="font-semibold text-slate-700 hover:underline"
                >
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
// Sous-composant : indicateur de force du mot de passe
// ─────────────────────────────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;

  // Calcul d'un score 0→4
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  const labels = ["Très faible", "Faible", "Correct", "Fort", "Très fort"];
  const colors = [
    "bg-rose-400",
    "bg-orange-400",
    "bg-amber-400",
    "bg-emerald-400",
    "bg-emerald-500",
  ];
  const textColors = [
    "text-rose-600",
    "text-orange-600",
    "text-amber-600",
    "text-emerald-600",
    "text-emerald-700",
  ];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score] : "bg-slate-200"
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
