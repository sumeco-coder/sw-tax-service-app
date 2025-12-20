import Link from "next/link";

export default function ComingSoon({
  title = "Coming Soon",
  subtitle,
  primaryHref = "/waitlist",
  primaryLabel = "Join the waitlist",
  secondaryHref = "/tax-knowledge",
  secondaryLabel = "Read tax tips",
  tertiaryHref,
  tertiaryLabel,
}: {
  title?: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tertiaryHref?: string;
  tertiaryLabel?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-[28rem] w-[72rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-[-4rem] h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        />

        <section className="mx-auto max-w-3xl px-6 pb-14 pt-20 text-center sm:pt-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold backdrop-blur">
            <span className="text-muted-foreground">SW Tax Service</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-primary">Coming Soon</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {title}
            <span className="block">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--brand-gradient)" }}
              >
                fast, clean, and IRS-ready.
              </span>
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {subtitle ??
              "This page isn’t live yet — but it will be. Join the waitlist and we’ll notify you the moment it opens."}
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryHref}
              className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-95 sm:w-auto"
              style={{ background: "var(--brand-gradient)" }}
            >
              {primaryLabel}
            </Link>

            <Link
              href={secondaryHref}
              className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-secondary sm:w-auto"
            >
              {secondaryLabel}
            </Link>

            {tertiaryHref && tertiaryLabel ? (
              <Link
                href={tertiaryHref}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-black/5 sm:w-auto"
              >
                {tertiaryLabel}
              </Link>
            ) : null}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-left">
              <div className="text-xs font-semibold text-primary">Secure</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Built with modern security practices.
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-left">
              <div className="text-xs font-semibold text-primary">Simple</div>
              <div className="mt-1 text-sm text-muted-foreground">
                No clutter — just what you need.
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-left">
              <div className="text-xs font-semibold text-primary">Fast</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Quick onboarding when we open.
              </div>
            </div>
          </div>

          <footer className="mt-14 border-t border-border pt-8 text-center text-xs text-muted-foreground">
            © {year} SW Tax Service •{" "}
            <a className="underline hover:text-foreground" href="mailto:swynn@swtaxservice.com">
              swynn@swtaxservice.com
            </a>{" "}
            •{" "}
            <a
              className="underline hover:text-foreground"
              href="https://www.swtaxservice.com"
              target="_blank"
              rel="noreferrer"
            >
              swtaxservice.com
            </a>
          </footer>
        </section>
      </div>
    </main>
  );
}
