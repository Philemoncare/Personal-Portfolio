import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { InlineLoading } from "@/components/ui/states";
import { AuthLayout, Field, FormMessage, inputClassName } from "@/layouts/AuthLayout";
import type { AuthLocationState } from "@/pages/auth/LoginPage";
import { ApiError } from "@/services/api";
import { resetPassword } from "@/services/auth.service";

const MIN_LENGTH = 12;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as AuthLocationState;

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state.challengeId) {
    return (
      <Navigate
        to="/forgot-password"
        replace
        state={{ message: "Request a reset code to continue." }}
      />
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from the SMS.");
      return;
    }
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters for the new password.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await resetPassword(state.challengeId as string, code, password);
      navigate("/login", {
        replace: true,
        state: { message: "Password reset. Sign in with your new password." },
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.detail : "The password could not be reset.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Set a new password."
      description={
        state.phoneMasked
          ? `Enter the code sent to ${state.phoneMasked} and choose a new password.`
          : "Enter the recovery code and choose a new password. Resetting signs out every existing session."
      }
      meta={
        <p className="text-xs leading-relaxed text-muted">
          A reset invalidates the code and revokes all active sessions for the account.
        </p>
      }
      footer={
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Request another code
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {state.devOtp ? (
          <FormMessage tone="info">
            <span className="block font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal">
              Development only
            </span>
            <span className="mt-1 block">
              No SMS provider is configured. The code for this local session is{" "}
              <span className="font-mono tracking-[0.2em] text-paper">{state.devOtp}</span>.
            </span>
          </FormMessage>
        ) : null}

        <Field id="code" label="Six-digit code">
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${inputClassName} font-mono tracking-[0.4em]`}
            placeholder="000000"
            disabled={submitting}
          />
        </Field>

        <Field
          id="password"
          label="New password"
          hint={`At least ${MIN_LENGTH} characters. Long is better than complicated.`}
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            disabled={submitting}
          />
        </Field>

        <Field id="confirm" label="Confirm new password">
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={inputClassName}
            disabled={submitting}
          />
        </Field>

        {error ? <FormMessage>{error}</FormMessage> : null}

        <button
          type="submit"
          className={buttonStyles("primary", "md", "w-full")}
          disabled={submitting}
        >
          {submitting ? <InlineLoading label="Resetting" /> : "Reset password"}
          {!submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </button>
      </form>
    </AuthLayout>
  );
}
