import {
  Archive,
  ArrowLeft,
  Check,
  Copy,
  Mail,
  MailWarning,
  Reply,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import type { ContactInquiryType, ContactMessageAdmin } from "@/types/api";
import { cn } from "@/utils/cn";
import { relativeTime } from "@/utils/format";
import { INQUIRY_TYPE_LABELS } from "@/utils/identity";

type MessageStatus = ContactMessageAdmin["status"];

const STATUS_TABS: Array<{ value: "" | MessageStatus; label: string }> = [
  { value: "", label: "Inbox" },
  { value: "new", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
  { value: "spam", label: "Spam" },
];

function inquiryLabel(value: string | null): string {
  if (!value) return "No inquiry type";
  const label = INQUIRY_TYPE_LABELS[value as ContactInquiryType];
  return label ?? value;
}

const EMAIL_STATUS_COPY: Record<ContactMessageAdmin["email_status"], string> = {
  not_configured: "Stored only — email delivery is not configured",
  sent: "Notification email sent",
  failed: "Notification email failed",
};

export default function AdminMessagesPage() {
  const [statusFilter, setStatusFilter] = useState<"" | MessageStatus>("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const messages = useApiQuery(
    (signal) =>
      adminContentService.listMessages(
        { status: statusFilter || undefined, search: deferredSearch || undefined },
        signal,
      ),
    [statusFilter, deferredSearch],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const items = messages.data?.items ?? [];
  const selected = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;

  // If a filter or search narrows the list, close a detail that is no longer present.
  useEffect(() => {
    if (!messages.data) return;
    if (selectedId && !messages.data.items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [messages.data, selectedId]);

  const unread = messages.data?.unread ?? 0;
  const spam = messages.data?.spam ?? 0;
  const emailConfigured = messages.data?.email_delivery_configured ?? false;

  const setStatus = async (message: ContactMessageAdmin, status: MessageStatus) => {
    setBusyId(message.id);
    setNotice(null);
    try {
      await adminContentService.setMessageStatus(message.id, status);
      messages.reload();
      setNotice({
        tone: "ok",
        text:
          status === "replied"
            ? "Marked replied. Reply by email to actually deliver your answer."
            : `Message marked ${status}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The message status could not be changed.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const openMessage = (message: ContactMessageAdmin) => {
    setSelectedId(message.id);
    if (message.status === "new") {
      void setStatus(message, "read");
    }
  };

  const remove = async (message: ContactMessageAdmin) => {
    if (!window.confirm(`Delete the message from ${message.name} permanently?`)) return;
    setBusyId(message.id);
    setNotice(null);
    try {
      await adminContentService.deleteMessage(message.id);
      if (selectedId === message.id) setSelectedId(null);
      messages.reload();
      setNotice({ tone: "ok", text: "Message deleted." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The message could not be deleted.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ tone: "ok", text: `Copied ${label}.` });
    } catch {
      setNotice({ tone: "error", text: `Copy failed. The value is: ${value}` });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Inbox</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Messages
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Every submission from the public contact form is stored here before anything else
            happens. Email notification is optional and its real status is shown per message.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={unread > 0 ? "signal" : "muted"}>{unread} unread</Badge>
          <Badge tone="outline">{spam} spam</Badge>
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-faint">
            {messages.data?.total ?? 0} total
          </span>
        </div>
      </div>

      <div
        className={cn(
          "mt-5 flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between",
          emailConfigured ? "border-line bg-ink-800/40" : "border-signal/25 bg-signal/5",
        )}
      >
        <div className="flex items-start gap-3">
          {emailConfigured ? (
            <Mail className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
          ) : (
            <MailWarning className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
          )}
          <p className="text-sm leading-relaxed text-paper-dim">
            {emailConfigured
              ? "Email delivery is configured. New messages are stored and a notification is attempted."
              : "Email delivery is not configured. Messages are stored only and must be reviewed here — no email is sent automatically."}
          </p>
        </div>
        {messages.data?.notification_email ? (
          <span className="shrink-0 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
            {messages.data.notification_email}
          </span>
        ) : null}
      </div>

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "mt-4 border border-signal/35 bg-signal/5 px-4 py-3 text-sm text-paper-dim"
              : "mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim"
          }
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setSelectedId(null);
              }}
              aria-pressed={statusFilter === tab.value}
              className={cn(
                "border-b-2 pb-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
                statusFilter === tab.value
                  ? "border-signal text-paper"
                  : "border-transparent text-muted hover:text-paper",
              )}
            >
              {tab.label}
              {tab.value === "" && unread > 0 ? (
                <span className="ml-2 text-signal">{unread}</span>
              ) : null}
              {tab.value === "spam" && spam > 0 ? (
                <span className="ml-2 text-signal">{spam}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
          <label htmlFor="message-search" className="sr-only">
            Search messages
          </label>
          <input
            id="message-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, subject, or text"
            className="w-full border border-line bg-ink-950 py-2 pl-9 pr-3 font-sans text-sm text-paper placeholder:text-faint focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
        </div>
      </div>

      <div className="mt-6">
        {messages.loading && !messages.data ? (
          <LoadingState rows={4} label="Loading messages" />
        ) : null}
        {!messages.loading && messages.error ? (
          <ErrorState message="Messages could not be loaded." onRetry={messages.reload} />
        ) : null}
        {!messages.loading && !messages.error && items.length === 0 ? (
          <EmptyState
            title={search || statusFilter ? "No matching messages" : "No messages yet"}
            description={
              search || statusFilter
                ? "Try a different search term or status filter."
                : "Contact form submissions will appear here once they are sent."
            }
          />
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-0 border border-line lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div
              className={cn(
                "min-w-0 border-line lg:border-r",
                selected ? "hidden lg:block" : "block",
              )}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-faint">
                  {items.length} shown
                </span>
                <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-faint">
                  Newest first
                </span>
              </div>
              <ul className="max-h-[40rem] divide-y divide-line overflow-y-auto">
                {items.map((message) => {
                  const active = selectedId === message.id;
                  const isUnread = message.status === "new";
                  return (
                    <li key={message.id}>
                      <button
                        type="button"
                        onClick={() => openMessage(message)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors",
                          active ? "bg-ink-800/70" : "hover:bg-ink-900/60",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isUnread ? (
                            <span className="size-1.5 shrink-0 bg-signal" aria-hidden="true" />
                          ) : null}
                          <p
                            className={cn(
                              "min-w-0 flex-1 truncate text-sm",
                              isUnread ? "font-semibold text-paper" : "font-medium text-paper-dim",
                            )}
                          >
                            {message.name}
                          </p>
                          <span className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
                            {relativeTime(message.created_at)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "truncate text-sm",
                            isUnread ? "text-paper" : "text-paper-dim",
                          )}
                        >
                          {message.subject}
                        </p>
                        <p className="truncate text-xs text-muted">{message.message}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="border border-line px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.1em] text-muted">
                            {inquiryLabel(message.inquiry_type)}
                          </span>
                          {message.status === "replied" ? (
                            <span className="border border-signal/60 px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.1em] text-signal">
                              Replied
                            </span>
                          ) : null}
                          {message.status === "archived" ? (
                            <span className="border border-line px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.1em] text-faint">
                              Archived
                            </span>
                          ) : null}
                          {message.status === "spam" ? (
                            <span className="border border-warning/60 px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.1em] text-warning">
                              Spam
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={cn("min-w-0", selected ? "block" : "hidden lg:block")}>
              {selected ? (
                <article aria-label={`Message from ${selected.name}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="mb-2 inline-flex items-center gap-1.5 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted hover:text-paper lg:hidden"
                      >
                        <ArrowLeft className="size-3" aria-hidden="true" />
                        Back to inbox
                      </button>
                      <h2 className="text-balance text-lg font-medium leading-snug text-paper">
                        {selected.subject}
                      </h2>
                      <p className="mt-1.5 text-sm text-paper-dim">
                        <span className="font-medium text-paper">{selected.name}</span>{" "}
                        <span className="font-mono text-[0.62rem] text-muted">
                          &lt;{selected.email}&gt;
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="muted">{inquiryLabel(selected.inquiry_type)}</Badge>
                      {selected.status === "spam" ? (
                        <Badge tone="placeholder">Spam</Badge>
                      ) : selected.status === "replied" ? (
                        <Badge tone="signal">Replied</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-b border-line px-4 py-2.5 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.52rem] uppercase tracking-[0.1em] text-faint">
                      <span>{new Date(selected.created_at).toLocaleString()}</span>
                      <span
                        className={cn(
                          selected.email_status === "sent"
                            ? "text-success"
                            : selected.email_status === "failed"
                              ? "text-warning"
                              : "text-muted",
                        )}
                      >
                        {EMAIL_STATUS_COPY[selected.email_status]}
                      </span>
                      {selected.read_at ? <span>Read {relativeTime(selected.read_at)}</span> : null}
                      {selected.replied_at ? (
                        <span>Replied {relativeTime(selected.replied_at)}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-4 py-5 sm:px-5">
                    <p className="max-w-3xl whitespace-pre-wrap break-words text-pretty text-sm leading-relaxed text-paper-dim">
                      {selected.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-line px-4 py-4 sm:px-5">
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(
                        `Re: ${selected.subject}`,
                      )}`}
                      className={buttonStyles("primary", "sm")}
                    >
                      <Reply className="size-3.5" aria-hidden="true" />
                      Reply by email
                    </a>
                    <button
                      type="button"
                      onClick={() => copy(selected.email, "email address")}
                      className={buttonStyles("secondary", "sm")}
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                      Copy address
                    </button>
                    {selected.status !== "read" && selected.status !== "spam" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(selected, "read")}
                        disabled={busyId === selected.id}
                        className={buttonStyles("secondary", "sm")}
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                        Mark read
                      </button>
                    ) : null}
                    {selected.status !== "replied" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(selected, "replied")}
                        disabled={busyId === selected.id}
                        className={buttonStyles("secondary", "sm")}
                      >
                        Mark replied
                      </button>
                    ) : null}
                    {selected.status !== "archived" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(selected, "archived")}
                        disabled={busyId === selected.id}
                        className={buttonStyles("ghost", "sm")}
                      >
                        <Archive className="size-3.5" aria-hidden="true" />
                        Archive
                      </button>
                    ) : null}
                    {selected.status === "spam" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(selected, "read")}
                        disabled={busyId === selected.id}
                        className={buttonStyles("ghost", "sm")}
                      >
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Not spam
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStatus(selected, "spam")}
                        disabled={busyId === selected.id}
                        className={buttonStyles("ghost", "sm")}
                      >
                        <ShieldAlert className="size-3.5" aria-hidden="true" />
                        Mark spam
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(selected)}
                      disabled={busyId === selected.id}
                      className="inline-flex items-center gap-2 border border-line px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </div>

                  <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">
                    “Reply by email” opens your mail client with a prefilled subject. This app does
                    not send replies itself, so the replied status is only a record of what you did.
                  </p>
                </article>
              ) : (
                <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                  <Mail className="size-6 text-faint" aria-hidden="true" />
                  <p className="mt-3 text-sm text-paper-dim">Select a message to read it here.</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
                    Message bodies render as plain text only. HTML in a submission is never
                    executed.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
