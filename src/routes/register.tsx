import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registerOfficer } from "@/lib/register.functions";
import { useOfficer } from "@/lib/auth/officer-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Officer Account | Smart Legal Metrology Inspector Console" },
      {
        name: "description",
        content:
          "Register an authorized Legal Metrology officer account for the packaged commodity compliance inspection console.",
      },
      { property: "og:title", content: "Create Officer Account | Smart Legal Metrology" },
      {
        property: "og:description",
        content: "Officer account registration for the Legal Metrology Inspector Console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

type Fields = {
  full_name: string;
  officer_id: string;
  email: string;
  password: string;
  confirm: string;
  designation: string;
  department: string;
  district: string;
  state: string;
};

const initial: Fields = {
  full_name: "",
  officer_id: "",
  email: "",
  password: "",
  confirm: "",
  designation: "Legal Metrology Inspector",
  department: "Department of Consumer Affairs",
  district: "",
  state: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useOfficer();
  const submitRegistration = useServerFn(registerOfficer);

  const [f, setF] = useState<Fields>(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | "confirmed", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && !busy) navigate({ to: "/", replace: true });
  }, [loading, isAuthenticated, busy, navigate]);

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    const next: Partial<Record<keyof Fields | "confirmed", string>> = {};
    if (f.full_name.trim().length < 3) next.full_name = "Enter the officer's full name.";
    if (f.officer_id.trim().length < 3) next.officer_id = "Officer ID is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      next.email = "Enter a valid official email address.";
    if (f.password.length < 8) next.password = "Use at least 8 characters.";
    else if (!/[A-Z]/.test(f.password) || !/[a-z]/.test(f.password) || !/[0-9]/.test(f.password))
      next.password = "Include upper case, lower case and a number.";
    if (f.confirm !== f.password) next.confirm = "Passwords do not match.";
    if (!f.designation.trim()) next.designation = "Designation is required.";
    if (!f.department.trim()) next.department = "Department is required.";
    if (!f.district.trim()) next.district = "District is required.";
    if (!f.state.trim()) next.state = "State is required.";
    if (!confirmed) next.confirmed = "Please confirm that you are an authorized officer.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setBusy(true);
    try {
      const result = await submitRegistration({
        data: {
          full_name: f.full_name.trim(),
          officer_id: f.officer_id.trim(),
          email: f.email.trim(),
          password: f.password,
          designation: f.designation.trim(),
          department: f.department.trim(),
          district: f.district.trim(),
          state: f.state.trim(),
        },
      });

      if (!result.ok) {
        setBusy(false);
        if (result.field) setErrors({ [result.field]: result.message });
        setFormError(result.message);
        return;
      }

      const signIn = await supabase.auth.signInWithPassword({
        email: f.email.trim().toLowerCase(),
        password: f.password,
      });
      if (signIn.error) {
        setBusy(false);
        setFormError("Account created, but automatic sign-in failed. Please log in manually.");
        return;
      }
      toast.success(`Officer account created — welcome, ${f.full_name.trim()}`);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setBusy(false);
      setFormError(
        err instanceof Error ? err.message : "Registration failed. Please review the details.",
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="gov-stripe h-1 w-full" />

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-card p-7 shadow-sm sm:p-9">
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

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Officer enrolment
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create Officer Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Register an authorized officer for the Legal Metrology inspection console. Credentials
            are handled by the secure authentication service.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="full_name"
                label="Full Name"
                value={f.full_name}
                onChange={set("full_name")}
                error={errors.full_name}
                placeholder="Rajesh Sharma"
              />
              <Field
                id="officer_id"
                label="Officer ID"
                value={f.officer_id}
                onChange={set("officer_id")}
                error={errors.officer_id}
                placeholder="LM-OFFICER-001"
              />
              <div className="sm:col-span-2">
                <Field
                  id="email"
                  label="Official Email"
                  type="email"
                  value={f.email}
                  onChange={set("email")}
                  error={errors.email}
                  placeholder="officer001@veripack.demo"
                />
              </div>
              <Field
                id="password"
                label="Password"
                type="password"
                value={f.password}
                onChange={set("password")}
                error={errors.password}
                placeholder="••••••••"
              />
              <Field
                id="confirm"
                label="Confirm Password"
                type="password"
                value={f.confirm}
                onChange={set("confirm")}
                error={errors.confirm}
                placeholder="••••••••"
              />
              <Field
                id="designation"
                label="Designation"
                value={f.designation}
                onChange={set("designation")}
                error={errors.designation}
              />
              <Field
                id="department"
                label="Department"
                value={f.department}
                onChange={set("department")}
                error={errors.department}
              />
              <Field
                id="district"
                label="District"
                value={f.district}
                onChange={set("district")}
                error={errors.district}
                placeholder="Bhopal"
              />
              <Field
                id="state"
                label="State"
                value={f.state}
                onChange={set("state")}
                error={errors.state}
                placeholder="Madhya Pradesh"
              />
            </div>

            <div className="rounded-md border bg-muted/40 p-3">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                  aria-label="I confirm that I am an authorized officer."
                />
                <span>I confirm that I am an authorized officer.</span>
              </label>
              {errors.confirmed ? (
                <p className="mt-2 text-xs text-destructive">{errors.confirmed}</p>
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
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Create Officer Account
            </Button>
          </form>

          <div className="mt-6 border-t pt-4 text-center text-sm">
            <Link
              to="/login"
              search={{ redirect: undefined }}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to Officer Login
            </Link>
          </div>

          <p className="mt-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Authorized Officer Access Only
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string | undefined;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        {...(placeholder ? { placeholder } : {})}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
