import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Scale,
  FileText,
  GitCompareArrows,
  ShieldCheck,
  UserRound,
  LogOut,
  Loader2,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useOfficer } from "@/lib/auth/officer-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inspect", label: "New Inspection", icon: ScanLine },
  { to: "/history", label: "Inspection History", icon: History },
  { to: "/compare", label: "Product Comparison", icon: GitCompareArrows },
  { to: "/rules", label: "Rules & Requirements", icon: Scale },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { officer, loading, isAuthenticated, signOut } = useOfficer();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({
        to: "/login",
        search: { redirect: pathname },
        replace: true,
      });
    }
  }, [loading, isAuthenticated, navigate, pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", search: { redirect: undefined }, replace: true });
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {loading ? "Verifying officer session…" : "Redirecting to Officer Login…"}
        </p>
      </div>
    );
  }

  const officerMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserRound className="size-4" />
          <span className="max-w-[10rem] truncate">{officer?.full_name ?? "Officer"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold">{officer?.full_name ?? "Officer"}</p>
          <p className="text-xs text-muted-foreground">{officer?.officer_id}</p>
          <p className="mt-1 text-xs text-muted-foreground">{officer?.designation}</p>
          <p className="text-xs text-muted-foreground">
            {[officer?.district, officer?.state].filter(Boolean).join(", ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Role: {officer?.role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound className="size-4" />
            Officer Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="gov-stripe h-1 w-full" />
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Smart Legal Metrology</p>
            <p className="text-xs opacity-70">Inspector Console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "opacity-80 hover:bg-sidebar-accent/60 hover:opacity-100",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4 text-[11px] leading-relaxed">
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">Officer</p>
          <p className="mt-1 text-sm font-medium">{officer?.full_name ?? "—"}</p>
          <p className="opacity-70">{officer?.officer_id}</p>
          <p className="opacity-70">{officer?.designation}</p>
          <p className="opacity-70">{[officer?.district, officer?.state].filter(Boolean).join(", ")}</p>
          <p className="mt-3 border-t border-sidebar-border pt-3 opacity-70">
            SIH 2026 · PS 26034 prototype. AI-assisted tool — not an official legal determination.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="gov-stripe h-1 w-full" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {officerMenu}
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
