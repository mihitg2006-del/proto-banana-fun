import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Users,
  Globe,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — Built for What's Next" },
      {
        name: "description",
        content:
          "A fast, modern platform prototype for teams who want clarity, speed, and control.",
      },
      { property: "og:title", content: "Nova — Built for What's Next" },
      {
        property: "og:description",
        content:
          "A fast, modern platform prototype for teams who want clarity, speed, and control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <Stats />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Nova</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#stats" className="transition-colors hover:text-foreground">
            Impact
          </a>
          <a href="#cta" className="transition-colors hover:text-foreground">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline">
            Log in
          </button>
          <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[600px] translate-x-1/3 translate-y-1/3 rounded-full bg-accent/60 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Now in early access
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Built for what's next.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          A clean, modern platform prototype that helps teams move faster, stay
          aligned, and focus on what actually matters.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md">
            Start free trial
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-6 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-accent">
            View demo
          </button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          No credit card required. 14-day free trial.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-border bg-card p-2 shadow-2xl">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
          <div className="flex h-full w-full flex-col">
            <div className="flex h-10 items-center gap-2 border-b border-border bg-background px-4">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex flex-1 gap-4 p-6">
              <div className="hidden w-56 flex-col gap-3 sm:flex">
                <div className="h-8 rounded-md bg-muted" />
                <div className="h-8 rounded-md bg-muted" />
                <div className="h-8 rounded-md bg-muted" />
                <div className="mt-auto h-24 rounded-md bg-muted" />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div className="h-32 rounded-xl bg-gradient-to-br from-primary/10 to-accent" />
                <div className="grid flex-1 grid-cols-3 gap-4">
                  <div className="rounded-xl bg-muted" />
                  <div className="rounded-xl bg-muted" />
                  <div className="rounded-xl bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Zap,
      title: "Lightning fast",
      description:
        "Optimized workflows that cut through busywork so your team can ship sooner.",
    },
    {
      icon: Shield,
      title: "Secure by default",
      description:
        "Enterprise-grade permissions and audit trails built in from day one.",
    },
    {
      icon: BarChart3,
      title: "Clear insights",
      description:
        "Live dashboards that turn noisy data into decisions you can act on.",
    },
    {
      icon: Users,
      title: "Team aligned",
      description:
        "Shared views, comments, and notifications keep everyone in sync.",
    },
    {
      icon: Globe,
      title: "Global scale",
      description:
        "Edge-distributed infrastructure that stays fast wherever you are.",
    },
    {
      icon: Sparkles,
      title: "AI assisted",
      description:
        "Smart suggestions that help you draft, organize, and prioritize faster.",
    },
  ];

  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything you need to move forward
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Six core capabilities designed to remove friction and create momentum.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: "40%", label: "Faster delivery" },
    { value: "99.9%", label: "Uptime SLA" },
    { value: "10k+", label: "Active teams" },
    { value: "4.9", label: "Average rating" },
  ];

  return (
    <section id="stats" className="border-y border-border bg-muted/50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {stat.value}
            </div>
            <div className="mt-1 text-sm font-medium text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl bg-primary px-6 py-16 text-primary-foreground sm:px-12 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to build what's next?
          </h2>
          <p className="mt-4 text-lg opacity-90">
            Join thousands of teams already using Nova to ship smarter and scale
            faster.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-background px-6 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-background/90">
              Start free trial
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button className="inline-flex h-12 items-center justify-center rounded-md border border-primary-foreground/30 bg-transparent px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10">
              Talk to sales
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2 text-foreground">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Nova</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Nova Inc. All rights reserved.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">
            Privacy
          </a>
          <a href="#" className="hover:text-foreground">
            Terms
          </a>
          <a href="#" className="hover:text-foreground">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
