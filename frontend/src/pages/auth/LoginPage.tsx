import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { AuthLayout, Field, FormMessage, inputClassName } from "@/layouts/AuthLayout";
import { buttonStyles } from "@/components/ui/button";
import { InlineLoading } from "@/components/ui/states";
import { ApiError } from "@/services/api";
import { login } from "@/services/auth.service";
import type { Admin } from "@/types/api";

export interface AuthLocationState {
  from?: string;
  challengeId?: string;
  phoneMasked?: string | null;
  devOtp?: string | null;
  expiresIn?: number;
  identifier?: string;
  message?: string;
}

export function destinationFor(admin: Admin, from?: string): string {
  if (admin.must_change_password) return "/change-password";
  if (from && from.startsWith("/admin")) return from;
  return "/admin";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as AuthLocationState;
  const { status, admin: existingAdmin, refresh } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && existingAdmin) {
      navigate(destinationFor(existingAdmin, state.from), { replace: true });
    } else if (status === "must_change_password") {
      navigate("/change-password", { replace: true });
    }
  }, [status, existingAdmin, navigate, state.from]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await login(identifier.trim(), password);
      if (result.status === "otp_required") {
        navigate("/verify-otp", {
          replace: true,
          state: {
            challengeId: result.challenge_id,
            phoneMasked: result.phone_masked,
            devOtp: result.dev_otp,
            expiresIn: result.expires_in,
            identifier: identifier.trim(),
            from: state.from,
          } satisfies AuthLocationState,
        });
        return;
      }

      await refresh();
      navigate(destinationFor(result.admin, state.from), { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Sign in failed. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "initializing") {
    return (
      <AuthLayout
        eyebrow="Admin"
        title="Sign in"
        description="Checking whether you are already signed in."
      >
        <InlineLoading label="Checking your session" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Admin"
      title="Sign in"
      description="Manage the content on your website. Visitors do not need an account."
      meta={
        <dl className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
              You can manage
            </dt>
            <dd className="text-xs text-paper-dim">Content, media and settings</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
              How you sign in
            </dt>
            <dd className="text-xs text-paper-dim">Password and phone code</dd>
          </div>
        </dl>
      }
      footer={
        <p className="font-mono text-[0.56rem] uppercase leading-relaxed tracking-[0.14em] text-faint">
          Sign-in attempts are recorded. Too many failed attempts will lock the account for a short time.
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {state.message ? <FormMessage tone="info">{state.message}</FormMessage> : null}

        <Field
          id="identifier"
          label="Email or phone number"
          hint="Use the email address or phone number linked to your account."
        >
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className={inputClassName}
            placeholder="Enter your email or phone number"
            disabled={submitting}
          />
        </Field>

        <Field id="password" label="Password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            placeholder="Enter your password"
            disabled={submitting}
          />
        </Field>

        {error ? <FormMessage>{error}</FormMessage> : null}

        <button
          type="submit"
          className={buttonStyles("primary", "md", "w-full")}
          disabled={submitting || !identifier.trim() || !password}
        >
          {submitting ? <InlineLoading label="Signing in" /> : "Sign in"}
          {!submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </button>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <Link
            to="/forgot-password"
            className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper"
          >
            Forgot your password?
          </Link>
          <Link
            to="/"
            className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper"
          >
            Back to website
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
