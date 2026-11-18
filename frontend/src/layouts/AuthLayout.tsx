import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSeo } from "@/hooks/useSeo";
import { cn } from "@/utils/cn";

/**
 * Shell for the private authentication screens.
 *
 * Deliberately restrained: no portraits, no marketing imagery. The public site
 * is editorial; the private area is a locked door with clear type.
 */
export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
  meta,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  useSeo({
    title: `${title} — Phill admin`,
    description: "Private administrator access.",
    noIndex: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-surface/80">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-base font-semibold tracking-[-0.02em] text-paper">PHILL</span>
            <span className="size-1.5 bg-signal" aria-hidden="true" />
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
              Private
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden sm:inline font-mono text-[0.56rem] uppercase tracking-[0.16em] text-faint">
              Administration
            </span>
          </div>
        </Container>
      </header>

      <main>
        <Container className="py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="type-meta text-signal">{eyebrow}</p>
              <h1 className="mt-4 max-w-md text-[clamp(1.9rem,4vw,2.9rem)] font-medium leading-[1.02] tracking-[-0.03em] text-paper">
                {title}
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
              {meta ? <div className="mt-8 border-t border-line pt-5">{meta}</div> : null}
            </div>

            <div className={cn("lg:col-span-6 lg:col-start-7", className)}>
              <div className="border border-line bg-surface p-6 sm:p-8">
                {children}
              </div>
              {footer ? <div className="mt-5">{footer}</div> : null}
            </div>
          </div>
        </Container>
      </main>

      <footer className="border-t border-line">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-faint">
            Authorised personnel only
          </p>
          <Link
            to="/"
            className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
          >
            Return to public site
          </Link>
        </Container>
      </footer>
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted"
      >
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs leading-relaxed text-faint">{hint}</p> : null}
      {error ? (
        <p className="text-xs leading-relaxed text-error font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClassName =
  "h-11 w-full border border-line bg-background px-3.5 text-sm text-paper outline-none transition-colors placeholder:text-faint focus:border-line-strong focus:outline-2 focus:outline-signal disabled:opacity-50";

export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const styles = {
    error: "border-error/40 bg-error/10 text-error",
    info: "border-line-strong bg-surface text-paper-dim",
    success: "border-success/40 bg-success/10 text-success",
  }[tone];

  return (
    <div
      className={cn("border px-4 py-3 text-sm leading-relaxed font-sans", styles)}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
