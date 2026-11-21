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
      setError("Enter the 6-digit code from the text message.");
      return;
    }
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters for the new password.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await resetPassword(state.challengeId as string, code, password);
      navigate("/login", {
        replace: true,
        state: { message: "Your password has been updated. Sign in with your new password." },
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.detail : "We couldn't update your password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Password reset"
      title="Create a new password"
      description={
        state.phoneMasked
          ? `Enter the code we sent to ${state.phoneMasked}, then choose a new password.`
          : "Enter the verification code, then choose a new password."
      }
      meta={
        <p className="text-xs leading-relaxed text-muted">
          This will sign you out of all other sessions.
        </p>
      }
      footer={
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Send a new code
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
              No SMS provider is set up. The code for this local session is{" "}
              <span className="font-mono tracking-[0.2em] text-paper">{state.devOtp}</span>.
            </span>
          </FormMessage>
        ) : null}

        <Field id="code" label="Verification code">
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
            placeholder="Enter the 6-digit code"
            disabled={submitting}
          />
        </Field>

        <Field
          id="password"
          label="New password"
          hint={`Use at least ${MIN_LENGTH} characters. A longer phrase is easier to remember.`}
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
            placeholder="Enter your new password"
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
            placeholder="Enter your new password again"
            disabled={submitting}
          />
        </Field>

        {error ? <FormMessage>{error}</FormMessage> : null}

        <button
          type="submit"
          className={buttonStyles("primary", "md", "w-full")}
          disabled={submitting}
        >
          {submitting ? <InlineLoading label="Updating" /> : "Update password"}
          {!submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </button>
      </form>
    </AuthLayout>
  );
}
