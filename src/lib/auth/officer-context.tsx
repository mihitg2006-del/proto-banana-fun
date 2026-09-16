import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type OfficerRole = "Inspector" | "Senior Inspector" | "Admin";

export type OfficerProfile = {
  id: string;
  officer_id: string;
  full_name: string;
  designation: string;
  department: string;
  district: string | null;
  state: string | null;
  email: string;
  role: OfficerRole;
  is_active: boolean;
};

type OfficerContextValue = {
  session: Session | null;
  officer: OfficerProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: OfficerRole) => boolean;
  hasAnyRole: (roles: OfficerRole[]) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const OfficerContext = createContext<OfficerContextValue | null>(null);

async function fetchProfile(userId: string): Promise<OfficerProfile | null> {
  const { data } = await supabase
    .from("officer_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data as OfficerProfile | null) ?? null;
}

export function OfficerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next?.user) {
        setOfficer(null);
        setLoading(false);
        return;
      }
      const profile = await fetchProfile(next.user.id);
      if (!active) return;
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        setOfficer(null);
        setSession(null);
        setLoading(false);
        return;
      }
      setOfficer(profile);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => load(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load(next ?? null);
      } else {
        setSession(next ?? null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: OfficerContextValue = {
    session,
    officer,
    loading,
    isAuthenticated: Boolean(session?.user),
    hasRole: (role) => officer?.role === role,
    hasAnyRole: (roles) => Boolean(officer && roles.includes(officer.role)),
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setOfficer(null);
    },
    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      setSession(data.session ?? null);
      setOfficer(uid ? await fetchProfile(uid) : null);
    },
  };

  return <OfficerContext.Provider value={value}>{children}</OfficerContext.Provider>;
}

export function useOfficer(): OfficerContextValue {
  const ctx = useContext(OfficerContext);
  if (!ctx) throw new Error("useOfficer must be used inside OfficerProvider");
  return ctx;
}
