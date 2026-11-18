import { ArrowUpRight, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AdminPanel } from "@/components/admin/form";
import {
  ProfileFields,
  formToProfileInput,
  profileToForm,
  type ProfileFormState,
} from "@/components/admin/profile-fields";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import type { ProfileAdmin } from "@/types/api";

export default function AdminProfilePage() {
  const profile = useApiQuery((signal) => adminContentService.getProfile(signal), []);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile.data) setForm(profileToForm(profile.data));
  }, [profile.data]);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.display_name.trim()) {
      setNotice({ tone: "error", text: "Name and display name are required." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const updated: ProfileAdmin = await adminContentService.updateProfile(
        formToProfileInput(form),
      );
      setForm(profileToForm(updated));
      profile.reload();
      setNotice({ tone: "ok", text: "Profile saved." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The profile could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Identity</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Profile
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            The authoritative identity record used by the header, footer, About page, hero, and
            resume. Leave a field empty rather than guessing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/about" target="_blank" rel="noreferrer" className={buttonStyles("secondary", "sm")}>
            View About
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={busy || !form}
            className={buttonStyles("primary", "sm")}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {busy ? "Saving…" : "Save profile"}
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

      <div className="mt-6">
        {profile.loading && !form ? <LoadingState rows={6} label="Loading profile" /> : null}
        {!profile.loading && profile.error ? (
          <ErrorState
            message={
              profile.error.status === 404
                ? "The profile is not configured. Run the seed command or create it from the settings page."
                : profile.error.detail
            }
            onRetry={profile.reload}
          />
        ) : null}

        {form ? (
          <AdminPanel
            title="Profile record"
            description="Everything on the public About page comes from these fields. Empty sections are hidden or replaced with an honest note."
          >
            <ProfileFields form={form} onChange={setForm} />
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className={buttonStyles("primary", "md")}
              >
                <Save className="size-4" aria-hidden="true" />
                {busy ? "Saving…" : "Save profile"}
              </button>
              <Link to="/admin/settings" className={buttonStyles("ghost", "md")}>
                Global settings
              </Link>
            </div>
          </AdminPanel>
        ) : null}
      </div>
    </>
  );
}
