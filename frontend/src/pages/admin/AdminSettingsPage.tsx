import { ArrowUpRight, FileText, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AdminPanel, Field, TextArea, TextInput } from "@/components/admin/form";
import { MediaField } from "@/components/admin/MediaField";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import { listMedia } from "@/services/auth.service";
import type { AdminSettings, AdminSettingsInput, SiteSettingsAdmin } from "@/types/api";
import { formatDate } from "@/utils/format";
import { formatFileSize } from "@/utils/identity";

interface SiteFormState {
  site_name: string;
  site_description: string;
  wordmark: string;
  accent: string;
  footer_text: string;
  copyright_text: string;
  social_image: string;
  favicon: string;
  seo_title: string;
  seo_description: string;
}

function siteToForm(site: SiteSettingsAdmin): SiteFormState {
  return {
    site_name: site.site_name,
    site_description: site.site_description ?? "",
    wordmark: site.wordmark,
    accent: site.accent,
    footer_text: site.footer_text ?? "",
    copyright_text: site.copyright_text ?? "",
    social_image: site.social_image ?? "",
    favicon: site.favicon ?? "",
    seo_title: site.seo_title ?? "",
    seo_description: site.seo_description ?? "",
  };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function siteToInput(form: SiteFormState): AdminSettingsInput["site"] {
  return {
    site_name: form.site_name.trim(),
    site_description: optional(form.site_description),
    wordmark: form.wordmark.trim(),
    accent: form.accent.trim(),
    footer_text: optional(form.footer_text),
    copyright_text: optional(form.copyright_text),
    social_image: optional(form.social_image),
    favicon: optional(form.favicon),
    seo_title: optional(form.seo_title),
    seo_description: optional(form.seo_description),
  };
}

export default function AdminSettingsPage() {
  const settings = useApiQuery((signal) => adminContentService.getSettings(signal), []);
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);
  const [siteForm, setSiteForm] = useState<SiteFormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    setSiteForm(siteToForm(settings.data.site));
  }, [settings.data]);

  const save = async () => {
    if (!settings.data || !siteForm) return;
    if (!siteForm.site_name.trim() || !siteForm.wordmark.trim()) {
      setNotice({ tone: "error", text: "Site name and wordmark are required." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const updated: AdminSettings = await adminContentService.updateSettings({
        // Identity lives on the Profile page; send the current record unchanged.
        profile: settings.data.profile,
        site: siteToInput(siteForm),
      });
      setSiteForm(siteToForm(updated.site));
      settings.reload();
      setNotice({ tone: "ok", text: "Settings updated." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't save your changes. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const data = settings.data;
  const mediaAssets = media.data?.items ?? [];

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Settings
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Settings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Manage your website name, search information, branding and footer text here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/" target="_blank" rel="noreferrer" className={buttonStyles("secondary", "sm")}>
            View website
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={busy || !siteForm}
            className={buttonStyles("primary", "sm")}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {busy ? "Saving..." : "Save settings"}
          </button>
        </div>
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

      {settings.loading && !data ? <LoadingState rows={6} label="Loading settings" /> : null}
      {!settings.loading && settings.error ? (
        <div className="mt-6">
          <ErrorState message={settings.error.detail} onRetry={settings.reload} />
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <AdminPanel
              title="Website details"
              description="These settings control how your website appears in the browser, search results and footer."
            >
              {siteForm ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Website name" htmlFor="site-name" required>
                      <TextInput
                        id="site-name"
                        value={siteForm.site_name}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, site_name: event.target.value })
                        }
                        placeholder="Enter your website name"
                      />
                    </Field>
                    <Field
                      label="Short name"
                      htmlFor="site-wordmark"
                      required
                      hint="The short name shown in the header, such as PHILL."
                    >
                      <TextInput
                        id="site-wordmark"
                        value={siteForm.wordmark}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, wordmark: event.target.value })
                        }
                        placeholder="Enter a short name"
                      />
                    </Field>
                  </div>

                  <Field
                    label="Website description"
                    htmlFor="site-description"
                    hint="A short description of your website."
                  >
                    <TextArea
                      id="site-description"
                      rows={3}
                      value={siteForm.site_description}
                      onChange={(event) =>
                        setSiteForm({ ...siteForm, site_description: event.target.value })
                      }
                      placeholder="Write a short description"
                    />
                  </Field>

                  <Field
                    label="Accent colour"
                    htmlFor="site-accent"
                    hint="The theme colour used for highlights. The default is signal."
                  >
                    <TextInput
                      id="site-accent"
                      value={siteForm.accent}
                      onChange={(event) =>
                        setSiteForm({ ...siteForm, accent: event.target.value })
                      }
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Favicon" hint="The small icon shown in browser tabs.">
                      <MediaField
                        value={siteForm.favicon}
                        onChange={(value) => setSiteForm({ ...siteForm, favicon: value })}
                        assets={mediaAssets}
                        loading={media.loading}
                        onUploaded={() => media.reload()}
                        folder="ui"
                        title="Website favicon"
                        altText="Website favicon"
                        emptyLabel="No favicon uploaded."
                      />
                    </Field>
                    <Field
                      label="Social share image"
                      hint="The image shown when your website is shared on social media."
                    >
                      <MediaField
                        value={siteForm.social_image}
                        onChange={(value) => setSiteForm({ ...siteForm, social_image: value })}
                        assets={mediaAssets}
                        loading={media.loading}
                        onUploaded={() => media.reload()}
                        folder="social"
                        title="Social share image"
                        altText="Social share image"
                        emptyLabel="No social share image uploaded."
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Search title"
                      htmlFor="site-seo-title"
                      hint="The title that may appear in search results and browser tabs."
                    >
                      <TextInput
                        id="site-seo-title"
                        value={siteForm.seo_title}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, seo_title: event.target.value })
                        }
                        placeholder="Enter a search title"
                      />
                    </Field>
                    <Field
                      label="Search description"
                      htmlFor="site-seo-description"
                      hint="A short description that may appear in search results."
                    >
                      <TextArea
                        id="site-seo-description"
                        rows={2}
                        value={siteForm.seo_description}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, seo_description: event.target.value })
                        }
                        placeholder="Write a short description"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Footer text" htmlFor="site-footer">
                      <TextArea
                        id="site-footer"
                        rows={3}
                        value={siteForm.footer_text}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, footer_text: event.target.value })
                        }
                        placeholder="Text shown in the footer"
                      />
                    </Field>
                    <Field label="Copyright text" htmlFor="site-copyright">
                      <TextArea
                        id="site-copyright"
                        rows={3}
                        value={siteForm.copyright_text}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, copyright_text: event.target.value })
                        }
                        placeholder="Copyright line"
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
            </AdminPanel>

            <AdminPanel
              title="Profile"
              description="Your name, role and contact details. Edit them on the Profile page."
              actions={
                <Link to="/admin/profile" className={buttonStyles("ghost", "sm")}>
                  Edit profile
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              }
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[0.54rem] uppercase tracking-[0.13em] text-faint">
                    Display name
                  </dt>
                  <dd className="mt-1 text-sm text-paper">{data.profile.display_name}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.54rem] uppercase tracking-[0.13em] text-faint">
                    Professional title
                  </dt>
                  <dd className="mt-1 text-sm text-paper">
                    {data.profile.professional_title || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.54rem] uppercase tracking-[0.13em] text-faint">
                    Email address
                  </dt>
                  <dd className="mt-1 break-words text-sm text-paper">
                    {data.profile.email || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.54rem] uppercase tracking-[0.13em] text-faint">
                    Location
                  </dt>
                  <dd className="mt-1 text-sm text-paper">{data.profile.location || "Not set"}</dd>
                </div>
              </dl>
            </AdminPanel>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className={buttonStyles("primary", "md")}
              >
                <Save className="size-4" aria-hidden="true" />
                {busy ? "Saving..." : "Save settings"}
              </button>
              <Link to="/admin/profile" className={buttonStyles("ghost", "md")}>
                Edit profile
              </Link>
            </div>
          </div>

          <aside className="h-fit space-y-6 lg:sticky lg:top-24">
            <div className="border border-line bg-ink-900/60 p-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Message delivery
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={data.email_delivery_configured ? "signal" : "placeholder"}>
                  {data.email_delivery_configured ? "Email notifications on" : "Saved in inbox"}
                </Badge>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {data.email_delivery_configured
                  ? "Email notifications are sent after each message is saved."
                  : "Messages are always saved in your inbox. Add email settings to receive them by email."}
              </p>
              {data.notification_email ? (
                <p className="mt-3 break-words font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                  {data.notification_email}
                </p>
              ) : null}
              <Link
                to="/admin/messages"
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.13em] text-paper hover:text-signal"
              >
                View messages
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            <div className="border border-line bg-ink-900/60 p-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Resume
              </p>
              {data.resume ? (
                <>
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-paper">
                    <FileText className="size-3.5 text-muted" aria-hidden="true" />
                    {data.resume.title}
                  </p>
                  <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                    {data.resume.version_label} / {formatFileSize(data.resume.file_size)} / PDF
                  </p>
                  <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                    {data.resume.published_at
                      ? `Published ${formatDate(data.resume.published_at, { withDay: true })}`
                      : "Not published"}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  No resume uploaded. The online resume is still available.
                </p>
              )}
              <Link
                to="/admin/resume"
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.13em] text-paper hover:text-signal"
              >
                Manage resume
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            <div className="border border-line bg-ink-900/60 p-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Last updated
              </p>
              <p className="mt-3 text-sm text-paper">
                {formatDate(data.site.updated_at, { withDay: true })}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                The last time these settings were changed.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
