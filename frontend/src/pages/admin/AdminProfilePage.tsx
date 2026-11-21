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
import { listMedia } from "@/services/auth.service";
import type { ProfileAdmin } from "@/types/api";

export default function AdminProfilePage() {
  const profile = useApiQuery((signal) => adminContentService.getProfile(signal), []);
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile.data) setForm(profileToForm(profile.data));
  }, [profile.data]);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.display_name.trim()) {
      setNotice({ tone: "error", text: "Please add your name and display name." });
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
      setNotice({ tone: "ok", text: "Profile updated." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't save your changes. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Profile</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Profile
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Your name, role, contact details and photo. This information appears across your website.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/about" target="_blank" rel="noreferrer" className={buttonStyles("secondary", "sm")}>
            View website
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={busy || !form}
            className={buttonStyles("primary", "sm")}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {busy ? "Saving..." : "Save profile"}
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
                ? "Your profile has not been set up yet. Add your details to get started."
                : "We couldn't load your profile. Please try again."
            }
            onRetry={profile.reload}
          />
        ) : null}

        {form ? (
          <AdminPanel
            title="Your details"
            description="These details appear on your homepage, About page and resume. Leave anything you don't want to share empty."
          >
            <ProfileFields
              form={form}
              onChange={setForm}
              mediaAssets={media.data?.items ?? []}
              mediaLoading={media.loading}
              onMediaUploaded={() => media.reload()}
            />
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className={buttonStyles("primary", "md")}
              >
                <Save className="size-4" aria-hidden="true" />
                {busy ? "Saving..." : "Save profile"}
              </button>
              <Link to="/admin/settings" className={buttonStyles("ghost", "md")}>
                Settings
              </Link>
            </div>
          </AdminPanel>
        ) : null}
      </div>
    </>
  );
}
