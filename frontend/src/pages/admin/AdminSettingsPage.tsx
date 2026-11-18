import { ArrowUpRight, FileText, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  AdminPanel,
  Field,
  TextArea,
  TextInput,
} from "@/components/admin/form";
import {
  ProfileFields,
  formToProfileInput,
  profileToForm,
  type ProfileFormState,
} from "@/components/admin/profile-fields";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
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
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    setProfileForm(profileToForm(settings.data.profile));
    setSiteForm(siteToForm(settings.data.site));
  }, [settings.data]);

  const save = async () => {
    if (!profileForm || !siteForm) return;
    if (!profileForm.name.trim() || !profileForm.display_name.trim()) {
      setNotice({ tone: "error", text: "Name and display name are required." });
      return;
    }
    if (!siteForm.site_name.trim() || !siteForm.wordmark.trim()) {
      setNotice({ tone: "error", text: "Site name and wordmark are required." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const updated: AdminSettings = await adminContentService.updateSettings({
        profile: formToProfileInput(profileForm),
        site: siteToInput(siteForm),
      });
      setProfileForm(profileToForm(updated.profile));
      setSiteForm(siteToForm(updated.site));
      settings.reload();
      setNotice({ tone: "ok", text: "Global settings saved." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The settings could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  };

  const data = settings.data;

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Configuration
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Global settings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            One central place for identity, SEO, appearance, and footer copy. Social links and
            contact details come from the profile record; secrets stay in environment variables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/" target="_blank" rel="noreferrer" className={buttonStyles("secondary", "sm")}>
            View site
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={busy || !profileForm || !siteForm}
            className={buttonStyles("primary", "sm")}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {busy ? "Saving…" : "Save settings"}
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
              title="Site identity"
              description="These values drive the document title, metadata, wordmark, accent, and footer defaults."
            >
              {siteForm ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Site name" htmlFor="site-name" required>
                      <TextInput
                        id="site-name"
                        value={siteForm.site_name}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, site_name: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Wordmark" htmlFor="site-wordmark" required>
                      <TextInput
                        id="site-wordmark"
                        value={siteForm.wordmark}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, wordmark: event.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Site description" htmlFor="site-description">
                    <TextArea
                      id="site-description"
                      rows={3}
                      value={siteForm.site_description}
                      onChange={(event) =>
                        setSiteForm({ ...siteForm, site_description: event.target.value })
                      }
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Accent token"
                      htmlFor="site-accent"
                      hint="The theme accent name, normally signal."
                    >
                      <TextInput
                        id="site-accent"
                        value={siteForm.accent}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, accent: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Favicon" htmlFor="site-favicon" hint="A URL or site-relative path.">
                      <TextInput
                        id="site-favicon"
                        value={siteForm.favicon}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, favicon: event.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <Field
                    label="Social image"
                    htmlFor="site-social"
                    hint="Used for Open Graph and Twitter cards. A URL or site-relative path."
                  >
                    <TextInput
                      id="site-social"
                      value={siteForm.social_image}
                      onChange={(event) =>
                        setSiteForm({ ...siteForm, social_image: event.target.value })
                      }
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="SEO title" htmlFor="site-seo-title">
                      <TextInput
                        id="site-seo-title"
                        value={siteForm.seo_title}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, seo_title: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="SEO description" htmlFor="site-seo-description">
                      <TextArea
                        id="site-seo-description"
                        rows={2}
                        value={siteForm.seo_description}
                        onChange={(event) =>
                          setSiteForm({ ...siteForm, seo_description: event.target.value })
                        }
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
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
            </AdminPanel>

            <AdminPanel
              title="Identity and contact"
              description="Shared with the Profile page and the public header, footer, About page, and resume."
              actions={
                <Link to="/admin/profile" className={buttonStyles("ghost", "sm")}>
                  Open profile
                </Link>
              }
            >
              {profileForm ? (
                <ProfileFields form={profileForm} onChange={setProfileForm} idPrefix="settings" />
              ) : null}
            </AdminPanel>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className={buttonStyles("primary", "md")}
              >
                <Save className="size-4" aria-hidden="true" />
                {busy ? "Saving…" : "Save settings"}
              </button>
              <Link to="/admin/profile" className={buttonStyles("ghost", "md")}>
                Edit profile only
              </Link>
            </div>
          </div>

          <aside className="h-fit space-y-6 lg:sticky lg:top-24">
            <div className="border border-line bg-ink-900/60 p-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Delivery status
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={data.email_delivery_configured ? "signal" : "placeholder"}>
                  {data.email_delivery_configured ? "Email configured" : "Stored only"}
                </Badge>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {data.email_delivery_configured
                  ? "Contact notifications are attempted after each message is stored."
                  : "Messages are always stored in the database. Email delivery requires SMTP environment variables; until then, review the inbox."}
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
                Open messages
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            <div className="border border-line bg-ink-900/60 p-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Current resume
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
                  No current PDF. The online resume remains available.
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
                Reflects the last change to these records. Settings are stored as explicit typed
                fields, not a free-form JSON blob.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
