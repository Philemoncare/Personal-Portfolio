import { CheckCircle2, Code2, Link2, Mail, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { PageIntro } from "@/components/layout/PageIntro";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { InlineLoading } from "@/components/ui/states";
import { useSeo } from "@/hooks/useSeo";
import { apiRequest, ApiError } from "@/services/api";
import type { ContactPayload, ContactReceipt } from "@/types/api";

type FormValues = ContactPayload;

type FormErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

const INITIAL_VALUES: FormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

const SUBJECTS = [
  "Project collaboration",
  "Technical consulting",
  "General inquiry",
  "Something else",
];

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim().length < 2) errors.name = "Enter your name (at least 2 characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.subject.trim()) errors.subject = "Choose a subject.";
  if (values.message.trim().length < 10) {
    errors.message = "Write at least 10 characters so the message is actionable.";
  }
  if (values.message.length > 5000) errors.message = "Keep the message under 5,000 characters.";
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-xs text-signal-soft" role="alert">
      {message}
    </p>
  );
}

export default function ContactPage() {
  const { settings } = useSiteSettings();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ContactReceipt | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "success") {
      successRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [status]);

  useSeo({
    title: "Contact — Phill",
    description:
      "Start a conversation about project collaboration, technical work, or a general inquiry.",
    path: "/contact",
  });

  const onChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    if (status === "error") setStatus("idle");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    setServerError(null);

    try {
      const response = await apiRequest<ContactReceipt>("/api/v1/contact", {
        method: "POST",
        body: values,
      });
      setReceipt(response);
      setStatus("success");
      setValues(INITIAL_VALUES);
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setServerError(
          error.status === 429
            ? "Too many messages have been sent from this connection. Please wait and try again later."
            : error.detail,
        );
      } else {
        setServerError("The message could not be sent. Please try again.");
      }
    }
  };

  const channelLinkClass =
    "group flex items-center justify-between gap-4 border-t border-line py-4 transition-colors hover:border-line-strong";

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title={
          <>
            Start with the{" "}
            <span className="display-serif text-signal">problem.</span>
          </>
        }
        description="Project collaboration, technical work, or a straightforward question. The form writes to the portfolio database and is the most reliable way to get in touch."
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Response channel</span>
              <span className="text-paper">Email / form</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Data handling</span>
              <span className="text-paper">Stored to reply</span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20">
          <div>
            <Eyebrow>Message</Eyebrow>

            {status === "success" ? (
              <div
                ref={successRef}
                className="mt-6 border border-line bg-ink-800/40 p-7 sm:p-9"
                role="status"
              >
                <CheckCircle2 className="size-7 text-signal" aria-hidden="true" />
                <h2 className="mt-5 text-2xl font-medium tracking-tight text-paper">
                  Message received.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-paper-dim">
                  {receipt?.message ||
                    "Thank you. Your message has been stored and will be reviewed."}
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("idle");
                      setReceipt(null);
                    }}
                    className={buttonStyles("secondary", "sm")}
                  >
                    Send another message
                  </button>
                  <Link to="/work" className={buttonStyles("ghost", "sm")}>
                    Back to work
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                    >
                      Name <span className="text-signal">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={values.name}
                      onChange={onChange}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "name-error" : undefined}
                      className="mt-2 h-12 w-full border border-line bg-ink-800/40 px-4 text-base text-paper outline-none transition-colors placeholder:text-faint focus:border-paper aria-[invalid=true]:border-signal"
                      placeholder="Your name"
                    />
                    <FieldError id="name-error" message={errors.name} />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                    >
                      Email <span className="text-signal">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={values.email}
                      onChange={onChange}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className="mt-2 h-12 w-full border border-line bg-ink-800/40 px-4 text-base text-paper outline-none transition-colors placeholder:text-faint focus:border-paper aria-[invalid=true]:border-signal"
                      placeholder="you@example.com"
                    />
                    <FieldError id="email-error" message={errors.email} />
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="subject"
                    className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                  >
                    Subject <span className="text-signal">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={values.subject}
                    onChange={onChange}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? "subject-error" : undefined}
                    className="mt-2 h-12 w-full border border-line bg-ink-800/40 px-4 text-base text-paper outline-none transition-colors focus:border-paper aria-[invalid=true]:border-signal"
                  >
                    <option value="" disabled>
                      Choose a subject
                    </option>
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  <FieldError id="subject-error" message={errors.subject} />
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="message"
                    className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                  >
                    Message <span className="text-signal">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={7}
                    value={values.message}
                    onChange={onChange}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={
                      errors.message ? "message-error message-help" : "message-help"
                    }
                    className="mt-2 w-full resize-y border border-line bg-ink-800/40 px-4 py-3 text-base leading-relaxed text-paper outline-none transition-colors placeholder:text-faint focus:border-paper aria-[invalid=true]:border-signal"
                    placeholder="What are you working on? Include the context that would help."
                  />
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <p id="message-help" className="text-xs text-muted">
                      The form stores your name, email, subject, and message so it can be answered.
                    </p>
                    <span className="shrink-0 font-mono text-[0.58rem] tabular-nums text-faint">
                      {values.message.length}/5000
                    </span>
                  </div>
                  <FieldError id="message-error" message={errors.message} />
                </div>

                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="website">Leave this field empty</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.website}
                    onChange={onChange}
                  />
                </div>

                {status === "error" && serverError ? (
                  <div className="mt-6 border border-signal/35 bg-signal/5 p-4" role="alert">
                    <p className="text-sm text-paper-dim">{serverError}</p>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className={buttonStyles("primary", "lg")}
                  >
                    {status === "submitting" ? (
                      <InlineLoading label="Sending" className="text-ink-950" />
                    ) : (
                      <>
                        Send message
                        <Send className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
                    No newsletter. No automated marketing.
                  </p>
                </div>
              </form>
            )}
          </div>

          <aside className="h-fit border-t border-line pt-6 lg:sticky lg:top-24">
            <Eyebrow>Direct channels</Eyebrow>
            <div className="mt-5">
              {settings?.email ? (
                <a href={`mailto:${settings.email}`} className={channelLinkClass}>
                  <span className="inline-flex items-center gap-3 text-sm text-paper-dim group-hover:text-paper">
                    <Mail className="size-4" aria-hidden="true" />
                    Email
                  </span>
                  <span className="max-w-[9rem] break-words text-right text-xs text-muted">
                    {settings.email}
                  </span>
                </a>
              ) : null}
              {settings?.github_url ? (
                <a
                  href={settings.github_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={channelLinkClass}
                >
                  <span className="inline-flex items-center gap-3 text-sm text-paper-dim group-hover:text-paper">
                    <Code2 className="size-4" aria-hidden="true" />
                    GitHub
                  </span>
                  <span className="text-xs text-muted">Open</span>
                </a>
              ) : null}
              {settings?.linkedin_url ? (
                <a
                  href={settings.linkedin_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={channelLinkClass}
                >
                  <span className="inline-flex items-center gap-3 text-sm text-paper-dim group-hover:text-paper">
                    <Link2 className="size-4" aria-hidden="true" />
                    LinkedIn
                  </span>
                  <span className="text-xs text-muted">Open</span>
                </a>
              ) : null}
              {!settings?.email && !settings?.github_url && !settings?.linkedin_url ? (
                <p className="border-t border-line pt-4 text-sm leading-relaxed text-muted">
                  Public contact links have not been configured yet. The form still stores your
                  message securely in the portfolio database.
                </p>
              ) : null}
            </div>

            <div className="mt-8 border border-line bg-ink-800/40 p-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                Good starting points
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-paper-dim">
                <li>Project context and the problem</li>
                <li>What a useful outcome looks like</li>
                <li>Timing and constraints, if known</li>
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
