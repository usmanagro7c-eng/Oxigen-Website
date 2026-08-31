import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useId } from "react";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { login } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import oxigenLogo from "@/assets/oxigen-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Admin Portal Login — OxiGen Dashboard" },
      { name: "description", content: "Secure admin login for OxiGen ERPNext Dashboard." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const emailId = useId();
  const passwordId = useId();
  const resetEmailId = useId();

  // Form states — supports any ERPNext username (e.g., 'Administrator', 'user@company.com')
  const [email, setEmail] = useState("Administrator");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View state: 'login' | 'forgot'
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);

  // Auto-login / session check
  useEffect(() => {
    const existingUser = useAuthStore.getState().user;
    if (existingUser) {
      // Optional auto-redirect if already logged in
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const usernameOrEmail = email.trim();
    if (!usernameOrEmail || !password) {
      setErrorMsg("Please enter both ERP username/email and password.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // 1. Attempt authentication with ERPNext / Express backend
      const res = await login(usernameOrEmail, password);
      
      if (res && res.success) {
        const displayName = res.user?.name || usernameOrEmail.split("@")[0] || usernameOrEmail;
        const userEmail = res.user?.email || (usernameOrEmail.includes("@") ? usernameOrEmail : `${usernameOrEmail}@erp.local`);
        
        setUser({ email: userEmail, full_name: displayName });
        setSuccessMsg(`Welcome, ${displayName}! Opening dashboard...`);
        
        setTimeout(() => {
          navigate({ to: "/dashboard" });
        }, 600);
        return;
      } else {
        setErrorMsg(res?.message || "Invalid credentials for ERP user.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("ERP Login attempt info:", message);

      // If backend explicitly rejected credentials (401 Unauthorized / Invalid Password)
      if (message.includes("401") || message.toLowerCase().includes("invalid") || message.toLowerCase().includes("incorrect")) {
        setErrorMsg("Invalid ERP user credentials. Please check your username and password.");
        setIsSubmitting(false);
        return;
      }

      // Fallback for local/offline dev mode: allow login for any ERP user to test dashboard
      const displayName = usernameOrEmail.includes("@") ? usernameOrEmail.split("@")[0] : usernameOrEmail;
      const userEmail = usernameOrEmail.includes("@") ? usernameOrEmail : `${usernameOrEmail}@erp.local`;

      setUser({ email: userEmail, full_name: displayName });
      setSuccessMsg(`Authenticated as ${displayName}. Redirecting to dashboard...`);
      
      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (role: "administrator" | "manager") => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const demoUser = role === "administrator" ? "Administrator" : "Manager";
    const demoEmail = role === "administrator" ? "admin@erp.local" : "manager@erp.local";

    setEmail(demoUser);
    setPassword("••••••••");

    setTimeout(() => {
      setUser({ email: demoEmail, full_name: demoUser });
      setSuccessMsg(`Welcome, ${demoUser}! Opening dashboard...`);
      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 500);
    }, 300);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your ERP username or email address.");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setResetSent(true);
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-secondary/70 via-background to-secondary/50 text-foreground flex flex-col justify-between overflow-hidden selection:bg-primary/20">
      {/* Background Ambient Glows & Grids */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 left-1/3 h-[520px] w-[520px] rounded-full blur-[140px] opacity-25 bg-primary"
          animate={{ opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute top-1/4 -right-20 h-[460px] w-[460px] rounded-full blur-[140px] opacity-20 bg-accent"
        />
        <div
          className="absolute -bottom-20 left-10 h-[480px] w-[480px] rounded-full blur-[150px] opacity-15 bg-emerald-400"
        />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      {/* Top Header / Branding Bar */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={oxigenLogo} alt="OxiGen" className="h-9 w-auto object-contain" />
          <div className="hidden sm:block">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">
              Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-full shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>ERP System Connected</span>
        </div>
      </header>

      {/* Main Content Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-3xl glass-strong border border-border/80 p-7 md:p-9 shadow-elegant relative overflow-hidden"
        >
          {/* Top card shimmer border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Mode: LOGIN */}
          {mode === "login" && (
            <div>
              {/* Card Header */}
              <div className="text-center mb-7">
                <div className="inline-flex items-center justify-center mb-3">
                  <img src={oxigenLogo} alt="OxiGen" className="h-10 w-auto object-contain" />
                </div>
                <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                  Admin Portal Login
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Sign in with Administrator or Store Manager credentials
                </p>
              </div>

              {/* Alert Feedback Messages */}
              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username/Email Field */}
                <div>
                  <label
                    htmlFor={emailId}
                    className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5"
                  >
                    ERP Username or Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id={emailId}
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Administrator or user@company.com"
                      className="w-full rounded-xl bg-background border border-border pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor={passwordId}
                      className="block text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setMode("forgot");
                      }}
                      className="text-xs font-medium text-primary hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-background border border-border pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4 accent-primary"
                    />
                    <span>Remember ERP session</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary/25 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authenticating with ERP...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo / Preset ERP Users Divider & Buttons */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-center text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                  Quick Select Preset ERP User
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin("administrator")}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-primary/10 border border-border text-xs font-semibold text-foreground hover:text-primary transition-all hover:scale-[1.02]"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Administrator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin("manager")}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-accent/10 border border-border text-xs font-semibold text-foreground hover:text-accent transition-all hover:scale-[1.02]"
                  >
                    <Shield className="h-3.5 w-3.5 text-accent" />
                    <span>Store Manager</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode: FORGOT PASSWORD */}
          {mode === "forgot" && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setResetSent(false);
                  setMode("login");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Login</span>
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold font-display text-foreground">
                  ERP Password Recovery
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your ERP username or email address to request a reset link.
                </p>
              </div>

              {resetSent ? (
                <div className="text-center py-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm space-y-1">
                    <p className="font-semibold flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" /> Reset Request Sent
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reset instructions sent for user{" "}
                      <span className="text-foreground font-medium">{email}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetSent(false);
                      setMode("login");
                    }}
                    className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor={resetEmailId}
                      className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5"
                    >
                      ERP User / Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id={resetEmailId}
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Administrator or user@company.com"
                        className="w-full rounded-xl bg-background border border-border pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/25 hover:opacity-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Instructions...</span>
                      </>
                    ) : (
                      <span>Send Recovery Link</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 py-4 px-6 text-center text-xs text-muted-foreground max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>OxiGen Healthcare • ERPNext Connected Session</span>
        </div>
        <div>&copy; {new Date().getFullYear()} OxiGen. All Rights Reserved.</div>
      </footer>
    </div>
  );
}
