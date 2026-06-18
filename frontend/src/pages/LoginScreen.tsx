import { useState, useEffect } from "react";
import type { SubmitEvent } from "react";
import {
  ShieldCheck,
  Mail,
  Lock,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Send,
  CheckCircle2,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { User } from "../types";
import { boutiqueApi, mapAuthUserToFrontend } from "../services/apiClient";
import { AddAuditLogFn, AddSecurityEventFn } from "../components/AppProvider";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onAddAuditLog: AddAuditLogFn;
  onAddSecurityEvent: AddSecurityEventFn;
}

type AuthMode = "LOGIN" | "MFA" | "FORGOT_PASSWORD" | "RESET_CONFIRM";

export default function LoginScreen({
  onLoginSuccess,
  onAddAuditLog,
  onAddSecurityEvent,
}: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFaMethod, setTwoFaMethod] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [otpCodes, setOtpCodes] = useState<string[]>(Array(6).fill(""));
  const [otpTimeLeft, setOtpTimeLeft] = useState(60);
  const [otpAttempts, setOtpAttempts] = useState(5);
  const [otpSentCount, setOtpSentCount] = useState(1);

  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    if (mode === "MFA" && otpTimeLeft > 0) {
      const timer = setTimeout(() => {
        setOtpTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mode, otpTimeLeft]);

  // Vérification OTP - appel au backend /auth/2fa/verify
  useEffect(() => {
    const isCompleted = otpCodes.every((c) => c !== "");
    if (!isCompleted || !tempToken) return;

    const fullCode = otpCodes.join("");

    const verify = async () => {
      try {
        const res = await boutiqueApi.auth.verify2FA(tempToken, fullCode);
        // ✅ Correction : res.user est toujours présent pour Verify2FAResponseDto
        // mais on ajoute une vérification de sécurité pour rassurer TypeScript
        if (!res.user) {
          throw new Error("Aucun utilisateur retourné après vérification 2FA");
        }
        const user = mapAuthUserToFrontend(res.user);

        onLoginSuccess(user);
        onAddAuditLog(
          "MFA réussi",
          "AUTH",
          `${user.firstName} ${user.lastName}`,
          `Connexion validée par OTP`,
          "INFO",
        );
        onAddSecurityEvent(
          "MFA_SUCCESS",
          user.email,
          "Validation OTP réussie",
          "SUCCESS",
        );
        onAddSecurityEvent(
          "LOGIN_SUCCESS",
          user.email,
          "Session ouverte avec MFA",
          "SUCCESS",
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Le code de sécurité saisi est expiré ou invalide.",
        );
        setOtpAttempts((prev) => prev - 1);
        setOtpCodes(Array(6).fill(""));
        onAddSecurityEvent(
          "MFA_FAILED",
          pendingEmail,
          "Code OTP incorrect",
          "FAILURE",
        );
      }
    };

    verify();
  }, [otpCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email?.trim() || !password) {
      setError("Veuillez remplir tous les champs requis.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await boutiqueApi.auth.login({ email, password });

      if (res.twoFactorRequired) {
        setTempToken(res.tempToken);
        setTwoFaMethod(res.method);
        setPendingEmail(email);
        setMode("MFA");
        setOtpTimeLeft(60);
        setOtpAttempts(5);
        setOtpCodes(Array(6).fill(""));
        onAddSecurityEvent(
          "MFA_TRIGGERED",
          email,
          "Multi-Facteurs requis (MFA)",
          "SUCCESS",
        );
      } else if (res.user) {
        const user = mapAuthUserToFrontend(res.user);
        onLoginSuccess(user);
        onAddAuditLog(
          "Connexion réussie",
          "AUTH",
          `${user.firstName} ${user.lastName}`,
          "Session démarrée (sans MFA)",
          "INFO",
        );
        onAddSecurityEvent(
          "LOGIN_SUCCESS",
          user.email,
          "Connexion approuvée",
          "SUCCESS",
        );
      } else {
        // Cas anormal : ni MFA requis ni user fourni → contrat backend incohérent
        console.error("Réponse login incohérente :", res);
        setError("Réponse inattendue du serveur.");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      setError(msg || "Identifiants ou mot de passe incorrect.");
      onAddSecurityEvent(
        "LOGIN_FAILED",
        email,
        msg || "Échec de connexion",
        status === 423 ? "ALERT" : "FAILURE",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newCodes = [...otpCodes];
    newCodes[index] = value.substring(value.length - 1);
    setOtpCodes(newCodes);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpCodes[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // TODO: brancher sur l'endpoint resend une fois disponible côté backend
  const handleResendOtp = () => {
    if (otpTimeLeft > 0) return;
    setOtpCodes(Array(6).fill(""));
    setOtpTimeLeft(60);
    setOtpSentCount((prev) => prev + 1);
    setError("");
    setSuccessMsg(
      "Un nouveau code OTP a été renvoyé sur votre application de sécurité.",
    );
    if (pendingEmail) {
      onAddSecurityEvent(
        "MFA_TRIGGERED",
        pendingEmail,
        `Renvoi de l'OTP (${otpSentCount + 1}ème envoi)`,
        "SUCCESS",
      );
    }
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!forgotEmail) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    // TODO: remplacer par appel API /auth/forgot-password
    setSuccessMsg(
      "Un lien de réinitialisation sécurisé et un code de confirmation ont été envoyés.",
    );
    setMode("RESET_CONFIRM");
    setResetCode("SECURE-" + Math.floor(1000 + Math.random() * 9000));
  };

  const handleResetConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!resetCode || !newPassword || !confirmNewPassword) {
      setError("Tous les champs sont requis.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit faire au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSuccessMsg(
      "Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.",
    );
    setMode("LOGIN");
    setEmail(forgotEmail);
    setPassword(newPassword);

    onAddAuditLog(
      "Réinitialisation mot de passe",
      "AUTH",
      forgotEmail,
      "Changement de mot de passe via mot de passe oublié",
      "WARNING",
    );
    onAddSecurityEvent(
      "SESSION_REVOKED",
      forgotEmail,
      "Mot de passe modifié, anciennes sessions purgées",
      "ALERT",
    );
  };

  return (
    <div
      id="login-screen-root"
      className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute -top-[30%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-200 blur-3xl"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-100 blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            SaaS Nexus ERP
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {mode === "LOGIN" && "Accéder à votre console"}
          {mode === "MFA" && "Vérification en deux étapes"}
          {mode === "FORGOT_PASSWORD" && "Mot de passe oublié"}
          {mode === "RESET_CONFIRM" && "Nouveau mot de passe"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {mode === "LOGIN" &&
            "Gestion de stock, point de vente et comptabilité pour PME"}
          {mode === "MFA" &&
            "Saisissez le code OTP envoyé sur votre appareil de sécurité"}
          {mode === "FORGOT_PASSWORD" &&
            "Récupérez l'accès à votre compte professionnel"}
          {mode === "RESET_CONFIRM" &&
            `Saisissez le code temporaire envoyé à ${forgotEmail}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-2xl sm:px-10">
          {error && (
            <div
              id="login-error"
              className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800 font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div
              id="login-success"
              className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800 font-medium">
                {successMsg}
              </div>
            </div>
          )}

          {mode === "LOGIN" && (
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email ou Nom d'utilisateur
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 sm:text-sm bg-slate-50/50"
                    placeholder="ex: gabriel@entreprise.fr ou gabriel_admin"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode("FORGOT_PASSWORD")}
                    className="text-xs font-semibold text-slate-900 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 sm:text-sm bg-slate-50/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-slate-700 select-none"
                  >
                    Se souvenir de moi
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Connexion en cours..."
                    : "Se connecter à la console"}
                </button>
              </div>
            </form>
          )}

          {mode === "MFA" && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <div className="inline-flex h-10 w-10 text-indigo-600 bg-indigo-50 items-center justify-center rounded-lg mb-2">
                  <KeyRound className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500">
                  Un code de sécurité à usage unique (OTP) a été transmis au
                  compte de :
                </p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {pendingEmail}
                </p>
                {twoFaMethod && (
                  <p className="text-xs text-slate-400 mt-1">
                    Méthode :{" "}
                    {twoFaMethod === "TOTP" ? "Application TOTP" : "Email OTP"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-center text-sm font-semibold text-slate-700 mb-4">
                  Saisissez votre code à 6 chiffres
                </label>
                <div
                  className="flex justify-between gap-2 max-w-[280px] mx-auto"
                  dir="ltr"
                >
                  {otpCodes.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className="w-10 h-12 text-center text-xl font-bold border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white focus:border-slate-900"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    disabled={otpTimeLeft > 0}
                    onClick={handleResendOtp}
                    className={`inline-flex items-center gap-1 font-semibold ${
                      otpTimeLeft > 0
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-900 hover:underline"
                    }`}
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${otpTimeLeft === 0 && "animate-spin"}`}
                    />
                    Renvoyer le code
                  </button>
                  <span>
                    {otpTimeLeft > 0 ? (
                      `Nouveau code dans ${otpTimeLeft}s`
                    ) : (
                      <span className="text-emerald-600 font-bold">
                        Prêt à renvoyer
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-center">
                  <p className="text-[11px] text-slate-400">
                    Tentatives de sécurité restantes :{" "}
                    <span className="font-bold text-slate-700">
                      {otpAttempts}/5
                    </span>
                  </p>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div
                    className="bg-indigo-600 h-1 rounded-full transition-all duration-1000"
                    style={{ width: `${(otpTimeLeft / 60) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setTempToken(null);
                    setTwoFaMethod(null);
                    setPendingEmail("");
                    setError("");
                    setOtpCodes(Array(6).fill(""));
                  }}
                  className="w-full flex justify-center py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Retour
                </button>
              </div>
            </div>
          )}

          {mode === "FORGOT_PASSWORD" && (
            <form className="space-y-6" onSubmit={handleForgotSubmit}>
              <div>
                <label
                  htmlFor="forgotEmail"
                  className="block text-sm font-medium text-slate-700"
                >
                  Adresse email professionnelle
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="forgotEmail"
                    name="forgotEmail"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 sm:text-sm bg-slate-50/50"
                    placeholder="votre.email@entreprise.fr"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Nous vous transmettrons un code secret de sécurité pour
                  valider la réinitialisation de votre mot de passe.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError("");
                  }}
                  className="w-1/3 flex justify-center items-center py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-2/3 flex justify-center items-center py-2.5 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Envoyer l'instruction
                </button>
              </div>
            </form>
          )}

          {mode === "RESET_CONFIRM" && (
            <form className="space-y-5" onSubmit={handleResetConfirmSubmit}>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-amber-800 text-xs mb-2">
                <p className="font-semibold mb-1">
                  🔑 Code de secours généré pour démonstration :
                </p>
                <p className="font-mono text-center font-bold text-sm bg-white border border-amber-200 rounded py-1 max-w-[150px] mx-auto tracking-widest text-slate-900 select-all">
                  {resetCode}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Saisir le Code temporaire
                </label>
                <input
                  id="inputCode"
                  type="text"
                  required
                  placeholder="SECURE-XXXX"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:text-xs text-center font-mono font-bold tracking-widest text-slate-800 bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-medium text-slate-700"
                >
                  Nouveau mot de passe
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 sm:text-xs bg-slate-50/50"
                  placeholder="Min 6 caractères"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmNewPassword"
                  className="block text-xs font-medium text-slate-700"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 sm:text-xs bg-slate-50/50"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="w-1/3 flex justify-center py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="w-2/3 flex justify-center py-2.5 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  Changer le mot de passe
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
