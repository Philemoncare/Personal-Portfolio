import { CheckCircle2, Code2, FileText, Link2, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";

import { usePageContent, usePageSeo, useSocialLinks } from "@/app/ContentProvider";
import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { InlineLoading } from "@/components/ui/states";
import { ApiError } from "@/services/api";
import { contactService } from "@/services/contact.service";
import type {
  ContactInquiryType,
  ContactPayload,
  ContactReceipt,
} from "@/types/api";
import { INQUIRY_TYPE_LABELS } from "@/utils/identity";

type FormValues = {
  name: string;
  email: string;
  subject: string;
  inquiry_type: ContactInquiryType | "";
  message: string;
  website: string;
};

type FormErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

const INITIAL_VALUES: FormValues = {
  name: "",
  email: "",
  subject: "",
  inquiry_type: "",
  message: "",
  website: "",
};

const INQUIRY_OPTIONS = Object.entries(INQUIRY_TYPE_LABELS) as Array<
  [ContactInquiryType, string]
>;

function platformIcon(platform: string) {
  switch (platform) {
    case "email":
      return Mail;
    case "phone":
      return Phone;
    case "whatsapp":
      return MessageCircle;
    case "linkedin":
      return Link2;
    case "github":
    default:
      return Code2;
  }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

interface ContactChannel {
  key: string;
  label: string;
  href: string;
  value: string;
  icon: typeof Mail;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim().length < 2) {
    errors.name = "Enter your name (at least 2 characters).";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.subject.trim().length < 3) {
    errors.subject = "Add a short subject (at least 3 characters).";
  }
  if (values.message.trim().length < 10) {
    errors.message = "Write at least 10 characters so the message is actionable.";
  }
  if (values.message.length > 5000) {
    errors.message = "Keep the message under 5,000 characters.";
  }
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
  const socialLinks = useSocialLinks();
  const page = usePageContent("contact");
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ContactReceipt | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (status === "success") {
      successRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
    if (status === "error") {
      errorRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [status]);

  usePageSeo("contact", {
    title: "Contact | Start a conversation",
    description:
      "Start a conversation about project collaboration, technical work, data, or a general inquiry. The form stores your message reliably.",
    path: "/contact",
  });

  const onChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    if (status === "error") {
      setStatus("idle");
      setServerError(null);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = (["name", "email", "subject", "message"] as const).find(
        (field) => nextErrors[field],
      );
      if (firstInvalid) {
        requestAnimationFrame(() => {
          formRef.current
            ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
            ?.focus();
        });
      }
      return;
    }

    setStatus("submitting");
    setServerError(null);

    const payload: ContactPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      subject: values.subject.trim(),
      inquiry_type: values.inquiry_type || null,
      message: values.message.trim(),
      website: values.website,
    };

    try {
      const response = await contactService.submit(payload);
      setReceipt(response);
      setStatus("success");
      setValues(INITIAL_VALUES);
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        if (error.status === 429) {
          setServerError(
            "Too many messages have been sent from this connection. Please wait a little and try again.",
          );
        } else if (error.status === 0) {
          setServerError(
            "The API could not be reached. Your message was not sent — please try again in a moment.",
          );
        } else if (error.status === 422) {
          setServerError(
            "Some details were not accepted. Check the fields and try again.",
          );
        } else {
          setServerError(error.detail);
        }
      } else {
        setServerError("The message could not be sent. Please try again.");
      }
    }
  };

  const channelLinkClass =
    "group flex items-center justify-between gap-4 border-t border-line py-4 transition-colors hover:border-line-strong";

  const emailConfigured =
    receipt?.email_delivery === "configured" ||
    settings?.contact_delivery === "email_configured";

  const channels: ContactChannel[] =
    socialLinks.filter((link) => link.is_visible).length > 0
      ? socialLinks
          .filter((link) => link.is_visible)
          .map((link) => ({
            key: link.id,
            label: link.label,
            href: link.url,
            value:
              link.handle ||
              link.url.replace(/^mailto:/, "").replace(/^tel:/, "") ||
              "Open",
            icon: platformIcon(link.platform),
          }))
      : [
          settings?.email
            ? {
                key: "email",
                label: "Email",
                href: `mailto:${settings.email}`,
                value: settings.email,
                icon: Mail,
              }
            : null,
          settings?.github_url
            ? {
                key: "github",
                label: "GitHub",
                href: settings.github_url,
                value: "Open",
                icon: Code2,
              }
            : null,
          settings?.linkedin_url
            ? {
                key: "linkedin",
                label: "LinkedIn",
                href: settings.linkedin_url,
                value: "Open",
                icon: Link2,
              }
            : null,
        ].filter((channel): channel is ContactChannel => Boolean(channel));

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Contact"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              Start with the{" "}
              <span className="display-serif text-signal">problem.</span>
            </>
          )
        }
        description={
          page?.description ||
          "Project collaboration, technical work, data questions, or a straightforward inquiry. The form writes to the portfolio database and is the most reliable way to get in touch."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Response channel</span>
              <span className="text-paper">Email / inbox</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Message storage</span>
              <span className="text-paper">Private database</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Email delivery</span>
              <span className="text-paper">
                {emailConfigured ? "Configured" : "Not configured"}
              </span>
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
                aria-live="polite"
              >
                <CheckCircle2 className="size-7 text-signal" aria-hidden="true" />
                <h2 className="mt-5 text-2xl font-medium tracking-tight text-paper">
                  Message received.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-paper-dim">
                  {receipt?.stored === false
                    ? "The message was not stored. Please try again or use a direct channel."
                    : emailConfigured
                      ? "Your message has been stored and a notification has been sent. It will be reviewed and answered from the inbox."
                      : "Your message has been stored in the private inbox. Email delivery is not configured on this site, so it will be reviewed directly from the admin panel — not delivered to your inbox automatically."}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Badge tone={emailConfigured ? "signal" : "placeholder"}>
                    {emailConfigured ? "Email delivery configured" : "Stored only"}
                  </Badge>
                  <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                    {receipt?.status ?? "received"}
                  </span>
                </div>
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
              <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6">
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

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="subject"
                      className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                    >
                      Subject <span className="text-signal">*</span>
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={values.subject}
                      onChange={onChange}
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={errors.subject ? "subject-error" : undefined}
                      className="mt-2 h-12 w-full border border-line bg-ink-800/40 px-4 text-base text-paper outline-none transition-colors placeholder:text-faint focus:border-paper aria-[invalid=true]:border-signal"
                      placeholder="A short subject"
                    />
                    <FieldError id="subject-error" message={errors.subject} />
                  </div>

                  <div>
                    <label
                      htmlFor="inquiry_type"
                      className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                    >
                      Inquiry type <span className="text-faint">(optional)</span>
                    </label>
                    <select
                      id="inquiry_type"
                      name="inquiry_type"
                      value={values.inquiry_type}
                      onChange={onChange}
                      className="mt-2 h-12 w-full border border-line bg-ink-800/40 px-4 text-base text-paper outline-none transition-colors focus:border-paper"
                    >
                      <option value="">No preference</option>
                      {INQUIRY_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    className="mt-2 w-full resize-none border border-line bg-ink-800/40 px-4 py-3 text-base leading-relaxed text-paper outline-none transition-colors placeholder:text-faint focus:border-paper aria-[invalid=true]:border-signal"
                    placeholder="What are you working on? Include the context that would help."
                  />
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <p id="message-help" className="text-xs text-muted">
                      The form stores your name, email, subject, inquiry type, and message so it can
                      be answered. No marketing list.
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
                  <div
                    ref={errorRef}
                    className="mt-6 border border-signal/35 bg-signal/5 p-4"
                    role="alert"
                    aria-live="assertive"
                  >
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
              {channels.map((channel) => {
                const Icon = channel.icon;
                const external = isHttpUrl(channel.href);
                return (
                  <a
                    key={channel.key}
                    href={channel.href}
                    {...(external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className={channelLinkClass}
                  >
                    <span className="inline-flex items-center gap-3 text-sm text-paper-dim group-hover:text-paper">
                      <Icon className="size-4" aria-hidden="true" />
                      {channel.label}
                    </span>
                    <span className="max-w-[9rem] break-words text-right text-xs text-muted">
                      {channel.value}
                    </span>
                  </a>
                );
              })}
              {channels.length === 0 ? (
                <p className="border-t border-line pt-4 text-sm leading-relaxed text-muted">
                  Public contact links have not been configured yet. The form still stores your
                  message privately in the portfolio database.
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

            <div className="mt-6 border-t border-line pt-4">
              <Link
                to="/resume"
                className="inline-flex items-center gap-2 text-sm text-paper-dim hover:text-paper"
              >
                <FileText className="size-3.5" aria-hidden="true" />
                Prefer the resume? Read it online
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
