import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { InlineLoading } from "@/components/ui/states";
import { AuthLayout, Field, FormMessage, inputClassName } from "@/layouts/AuthLayout";
import { ApiError } from "@/services/api";
import { forgotPassword } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await forgotPassword(identifier.trim());
      navigate("/reset-password", {
        replace: true,
        state: {
          challengeId: result.challenge_id,
          phoneMasked: result.phone_masked,
          devOtp: result.dev_otp,
          expiresIn: result.expires_in,
          identifier: identifier.trim(),
          message: result.message,
        },
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "The request could not be sent. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Request a reset code."
      description="Recovery is delivered by SMS to the verification number on the administrator record. If no account matches, the same message is shown."
      meta={
        <p className="text-xs leading-relaxed text-muted">
          Codes are single-use, expire after five minutes, and are stored only as a hash.
        </p>
      }
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field
          id="identifier"
          label="Email or phone"
          hint="Use the address or Ghana mobile number on the administrator record."
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
            placeholder="you@example.com"
            disabled={submitting}
          />
        </Field>

        {error ? <FormMessage>{error}</FormMessage> : null}

        <button
          type="submit"
          className={buttonStyles("primary", "md", "w-full")}
          disabled={submitting || identifier.trim().length < 3}
        >
          {submitting ? <InlineLoading label="Requesting" /> : "Send reset code"}
          {!submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </button>

        <p className="border-t border-line pt-4 text-xs leading-relaxed text-faint">
          Recovery requires a verification phone. An account without one must be reset by an
          operator with server access.
        </p>
      </form>
    </AuthLayout>
  );
}
