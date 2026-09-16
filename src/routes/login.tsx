import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOfficer } from "@/lib/auth/officer-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Officer Login | Smart Legal Metrology Inspector Console" },
      {
        name: "description",
        content:
          "Authorized officer access to the Smart Legal Metrology Inspector Console for packaged commodity compliance inspections.",
      },
      { property: "og:title", content: "Officer Login | Smart Legal Metrology" },
      {
        property: "og:description",
        content: "Authorized officer access only — Legal Metrology Inspector Console sign-in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useOfficer();
  const search = Route.useSearch();
  const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate({ to: target === "/login" ? "/" : target, replace: true });
    }
  }, [loading, isAuthenticated, navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Officer ID / email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter the official email address issued to the officer.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      setBusy(false);
      setFormError(
        error?.message?.toLowerCase().includes("invalid")
          ? "Invalid officer credentials. Check the Officer ID / email and password."
          : (error?.message ?? "Sign-in failed. Please try again."),
      );
      return;
    }

    const { data: profile } = await supabase
      .from("officer_profiles")
      .select("full_name, officer_id, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      setBusy(false);
      setFormError("No officer profile is linked to this account. Contact the system administrator.");
      return;
    }
    if (!profile.is_active) {
      await supabase.auth.signOut();
      setBusy(false);
      setFormError("This officer account is deactivated. Contact the system administrator.");
      return;
    }

    toast.success(`Signed in as ${profile.full_name} (${profile.officer_id})`);
    navigate({ to: target === "/login" ? "/" : target, replace: true });
  };

  const forgot = async () => {
    if (!email.trim()) {
      setErrors({ email: "Enter the officer email first to request a reset link." });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) toast.error(error.message);
    else
      toast.success(
        "If this officer account exists, a password reset link has been sent to the registered email.",
      );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="gov-stripe h-1 w-full" />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl overflow-hidden rounded-xl border bg-card shadow-sm md:grid md:grid-cols-[1.1fr_1fr]">
          <section className="hidden flex-col justify-between bg-sidebar p-8 text-sidebar-foreground md:flex">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheck className="size-6" />
              </div>
              <div className="leading-tight">
                <p className="text-base font-semibold">Smart Legal Metrology</p>
                <p className="text-xs opacity-70">Inspector Console</p>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <h2 className="text-xl font-semibold leading-snug">
                Packaged commodity label compliance inspection
              </h2>
              <p className="text-sm leading-relaxed opacity-80">
                Prototype console for assessing declarations under the Legal Metrology (Packaged
                Commodities) Rules, 2011, using a local requirement dataset — no live dependency on
                the government portal.
              </p>
              <dl className="space-y-2 border-t border-sidebar-border pt-4 text-xs opacity-80">
                <div className="flex justify-between gap-4">
                  <dt>Dataset</dt>
                  <dd className="text-right">Legal Metrology (PC) Rules, 2011</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Source</dt>
                  <dd className="text-right">Department of Consumer Affairs</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Runtime</dt>
                  <dd className="text-right">Local</dd>
                </div>
              </dl>
            </div>

            <p className="mt-10 text-[11px] leading-relaxed opacity-70">
              SIH 2026 · PS 26034 prototype. AI-assisted tool — not an official legal determination.
            </p>
          </section>

          <section className="p-7 sm:p-9">
            <div className="md:hidden">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Smart Legal Metrology</p>
                  <p className="text-xs text-muted-foreground">Inspector Console</p>
                </div>
              </div>
              <hr className="my-6" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Secure access
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Officer Login</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with the credentials issued by the department. Officer accounts are created by
              the system administrator.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="officer-email">Officer ID / Email</Label>
                <Input
                  id="officer-email"
                  type="email"
                  autoComplete="username"
                  placeholder="officer001@veripack.demo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="officer-password">Password</Label>
                  <button
                    type="button"
                    onClick={forgot}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Input
                  id="officer-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password}</p>
                ) : null}
              </div>

              {formError ? (
                <div
                  role="alert"
                  className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Login
              </Button>
            </form>

            <div className="mt-6 rounded-md border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Demo officer accounts (SIH prototype)</p>
              <p className="mt-1">officer001@veripack.demo · LM-OFFICER-001 · Bhopal</p>
              <p>officer002@veripack.demo · LM-OFFICER-002 · Indore</p>
              <p className="mt-1">Password is shared separately with the evaluation panel.</p>
            </div>

            <p className="mt-6 border-t pt-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Authorized Officer Access Only
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
