import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { buttonStyles } from "@/components/ui/button";
import { InlineLoading, LoadingState } from "@/components/ui/states";
import { AuthLayout, Field, FormMessage, inputClassName } from "@/layouts/AuthLayout";
import { ApiError } from "@/services/api";
import { changePassword } from "@/services/auth.service";

const MIN_LENGTH = 12;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { status, admin, error: sessionError, refresh } = useAuth();

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "initializing") {
    return (
      <AuthLayout
        eyebrow="Account"
        title="Change password"
        description="Checking your session."
      >
        <LoadingState label="Checking your session" rows={2} />
      </AuthLayout>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "error") {
    return (
      <AuthLayout
        eyebrow="Account"
        title="We couldn't load your account"
        description="Please sign in again to continue."
      >
        <FormMessage>{sessionError ?? "We couldn't load your account."}</FormMessage>
      </AuthLayout>
    );
  }

  const forced = admin?.must_change_password ?? false;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password === current) {
      setError("Choose a password that is different from your current one.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await changePassword(current, password);
      await refresh();
      navigate("/admin", { replace: true });
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
      eyebrow="Account"
      title={forced ? "Choose a new password" : "Change your password"}
      description={
        forced
          ? "Your account is using a temporary password. Choose a new one to continue."
          : "Changing your password will sign you out of all other sessions."
      }
      meta={
        <dl className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
              Account
            </dt>
            <dd className="max-w-[16rem] truncate text-xs text-paper-dim">{admin?.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
              Role
            </dt>
            <dd className="text-xs text-paper-dim">{admin?.role ?? "-"}</dd>
          </div>
        </dl>
      }
      footer={
        <p className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Your password is stored securely
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field id="current" label="Current password">
          <input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className={inputClassName}
            placeholder="Enter your current password"
            disabled={submitting}
          />
        </Field>

        <Field
          id="password"
          label="New password"
          hint={`Use at least ${MIN_LENGTH} characters.`}
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
          {submitting ? <InlineLoading label="Saving" /> : "Update password"}
          {!submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </button>
      </form>
    </AuthLayout>
  );
}
