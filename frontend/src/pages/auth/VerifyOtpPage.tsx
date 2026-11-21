import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { buttonStyles } from "@/components/ui/button";
import { InlineLoading } from "@/components/ui/states";
import { AuthLayout, Field, FormMessage, inputClassName } from "@/layouts/AuthLayout";
import { destinationFor, type AuthLocationState } from "@/pages/auth/LoginPage";
import { ApiError } from "@/services/api";
import { resendOtp, verifyOtp } from "@/services/auth.service";

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as AuthLocationState;
  const inputRef = useRef<HTMLInputElement>(null);
  const { refresh } = useAuth();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(state.devOtp ?? null);
  const [expiresIn, setExpiresIn] = useState(state.expiresIn ?? 300);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpiresIn((value) => (value > 0 ? value - 1 : 0));
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const challengeId = state.challengeId;

  const maskedPhone = useMemo(
    () => state.phoneMasked ?? "your phone",
    [state.phoneMasked],
  );

  if (!challengeId) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: "Sign in again to receive a new code." }}
      />
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await verifyOtp(challengeId, code);
      if (result.status === "authenticated") {
        await refresh();
        navigate(destinationFor(result.admin, state.from), { replace: true });
        return;
      }
      setError("That code is incorrect or has expired.");
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.detail : "We couldn't verify that code. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);

    try {
      const result = await resendOtp(challengeId);
      if (result.status === "otp_required") {
        setNotice(`We've sent a new code to ${result.phone_masked ?? maskedPhone}.`);
        setDevOtp(result.dev_otp);
        setExpiresIn(result.expires_in);
        setCooldown(60);
        setCode("");
        inputRef.current?.focus();
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 429) {
        const seconds = /(\d+)\s*second/i.exec(cause.detail);
        if (seconds) setCooldown(Number(seconds[1]));
      }
      setError(
        cause instanceof ApiError ? cause.detail : "We couldn't send a new code yet.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Verify your sign-in"
      title="Enter the verification code"
      description={
        devOtp
          ? `No SMS was sent because the SMS provider is not set up on this server. Use the development code below for ${maskedPhone}.`
          : `We sent a 6-digit code to ${maskedPhone}. It expires in five minutes and can be used once.`
      }
      meta={
        <dl className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
              Code expires in
            </dt>
            <dd className="font-mono text-xs text-paper-dim">{formatSeconds(expiresIn)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
              Sent by
            </dt>
            <dd className="text-xs text-paper-dim">
              {devOtp ? "Development code" : "SMS"}
            </dd>
          </div>
        </dl>
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
        {devOtp ? (
          <FormMessage tone="info">
            <span className="block font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal">
              Development only
            </span>
            <span className="mt-1 block">
              No SMS provider is set up. The code for this local session is{" "}
              <span className="font-mono tracking-[0.2em] text-paper">{devOtp}</span>.
            </span>
            <span className="mt-2 block text-xs leading-relaxed text-muted">
              To send real SMS, add the Arkesel API key and sender ID to{" "}
              <span className="font-mono text-paper">backend/.env</span>, then restart the server.
            </span>
            <button
              type="button"
              onClick={() => {
                setCode(devOtp);
                setError(null);
                inputRef.current?.focus();
              }}
              className="mt-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-paper underline decoration-line underline-offset-4 hover:decoration-paper"
            >
              Use this code
            </button>
          </FormMessage>
        ) : null}

        {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}

        <Field
          id="code"
          label="Verification code"
          hint="Enter the 6-digit code we sent to your phone."
        >
          <input
            ref={inputRef}
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${inputClassName} font-mono text-lg tracking-[0.5em]`}
            placeholder="Enter the 6-digit code"
            disabled={submitting}
            aria-describedby="code-hint"
          />
        </Field>

        {error ? <FormMessage>{error}</FormMessage> : null}

        <button
          type="submit"
          className={buttonStyles("primary", "md", "w-full")}
          disabled={submitting || code.length !== 6}
        >
          {submitting ? <InlineLoading label="Verifying" /> : "Verify code"}
          {!submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={onResend}
            disabled={resending || cooldown > 0}
            className={buttonStyles("ghost", "sm", "px-0 normal-case tracking-normal")}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
            5 attempts allowed
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}
