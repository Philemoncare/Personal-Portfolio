import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";

import { buttonStyles } from "@/components/ui/button";
import { InlineLoading } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import { apiRequest, ApiError } from "@/services/api";
import type { Admin } from "@/types/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const existing = useApiResource<Admin>("/api/v1/auth/me");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Admin sign in — Phill",
    description: "Private administrator sign in.",
    noIndex: true,
  });

  if (existing.data) {
    return <RedirectToAdmin />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest<Admin>("/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
      });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith("/admin") ? from : "/admin", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 429
            ? "Too many attempts. Wait a few minutes before trying again."
            : err.status === 422
              ? "Enter a valid email address and a password of at least 8 characters."
              : err.detail
          : "Sign in failed. Check the API connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-line p-10 lg:flex xl:p-14">
        <Link to="/" className="inline-flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-[-0.02em]">PHILL</span>
          <span className="size-1.5 bg-signal" aria-hidden="true" />
        </Link>

        <div className="max-w-lg">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Private administration
          </p>
          <h1 className="mt-6 text-[clamp(2.5rem,4.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.04em] text-paper">
            Manage the work,
            <br />
            not the markup.
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            The admin is the control surface for the portfolio content that is served publicly by
            the FastAPI content layer.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-line pt-5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
          <span>Session auth</span>
          <span>Private routes</span>
          <span>PostgreSQL</span>
        </div>
      </section>

      <section className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/" className="inline-flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-[-0.02em]">PHILL</span>
              <span className="size-1.5 bg-signal" aria-hidden="true" />
            </Link>
            <Link
              to="/"
              className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
            >
              View site
            </Link>
          </div>

          <div className="mt-14 lg:mt-0">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
              Admin / Sign in
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-paper">
              Authenticate to continue.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              This area is restricted to a seeded administrator account. There is no public
              registration.
            </p>

            <form onSubmit={submit} className="mt-8">
              <div>
                <label
                  htmlFor="admin-email"
                  className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                >
                  Email
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-12 w-full border border-line bg-ink-800/40 px-4 text-base text-paper outline-none transition-colors focus:border-paper"
                  placeholder="admin@example.com"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="admin-password"
                  className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-12 w-full border border-line bg-ink-800/40 px-4 text-base text-paper outline-none transition-colors focus:border-paper"
                  placeholder="Your password"
                />
              </div>

              {error ? (
                <div className="mt-5 border border-signal/35 bg-signal/5 p-4" role="alert">
                  <p className="text-sm text-paper-dim">{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className={buttonStyles("primary", "lg", "mt-6 w-full")}
              >
                {submitting ? (
                  <InlineLoading label="Signing in" className="text-ink-950" />
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-5">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
              >
                <ArrowLeft className="size-3" aria-hidden="true" />
                Back to portfolio
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
              >
                Contact
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RedirectToAdmin() {
  return <Navigate to="/admin" replace />;
}
