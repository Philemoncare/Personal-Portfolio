import {
  CheckCircle2,
  Download,
  FileText,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  AdminPanel,
  Checkbox,
  Field,
  Select,
  StatusBadge,
  TextInput,
} from "@/components/admin/form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import type { PublishStatus, ResumeAdmin } from "@/types/api";
import { formatDate } from "@/utils/format";
import { formatFileSize } from "@/utils/identity";

const MAX_BYTES = 5 * 1024 * 1024;

const PUBLISH_OPTIONS = [
  { value: "draft", label: "Draft (private)" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

interface UploadState {
  title: string;
  version_label: string;
  publish_status: PublishStatus;
  is_current: boolean;
}

const BLANK_UPLOAD: UploadState = {
  title: "",
  version_label: "",
  publish_status: "draft",
  is_current: false,
};

interface EditState {
  title: string;
  version_label: string;
}

export default function AdminResumePage() {
  const resumes = useApiQuery((signal) => adminContentService.listResumes(signal), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<UploadState>(BLANK_UPLOAD);
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<ResumeAdmin | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ title: "", version_label: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setNotice(null);
  };

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!upload.title.trim() || !upload.version_label.trim()) {
      setNotice({ tone: "error", text: "Please add a title and a version label." });
      return;
    }
    if (!file) {
      setNotice({ tone: "error", text: "Please choose a PDF file." });
      return;
    }
    const looksPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!looksPdf) {
      setNotice({ tone: "error", text: "The file must be a PDF." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setNotice({ tone: "error", text: "The file is too large. Resumes must be 5 MB or smaller." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      await adminContentService.uploadResume(file, {
        title: upload.title.trim(),
        version_label: upload.version_label.trim(),
        publish_status: upload.publish_status,
        is_current: upload.is_current,
      });
      resumes.reload();
      setUpload(BLANK_UPLOAD);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({ tone: "ok", text: "Resume uploaded." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't upload this file. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const patch = async (resume: ResumeAdmin, payload: Parameters<typeof adminContentService.patchResume>[1], message: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await adminContentService.patchResume(resume.id, payload);
      resumes.reload();
      setNotice({ tone: "ok", text: message });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't save your changes. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (resume: ResumeAdmin) => {
    setEditing(resume);
    setEditForm({ title: resume.title, version_label: resume.version_label });
    setNotice(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.title.trim() || !editForm.version_label.trim()) {
      setNotice({ tone: "error", text: "Please add a title and a version label." });
      return;
    }
    await patch(
      editing,
      { title: editForm.title.trim(), version_label: editForm.version_label.trim() },
      "Resume details updated.",
    );
    setEditing(null);
  };

  const remove = async (resume: ResumeAdmin) => {
    if (!window.confirm(`Delete “${resume.title}” (${resume.version_label})? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await adminContentService.deleteResume(resume.id);
      resumes.reload();
      if (editing?.id === resume.id) setEditing(null);
      setNotice({ tone: "ok", text: "Resume deleted." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't delete this resume. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const items = resumes.data ?? [];
  const current = items.find((item) => item.is_current);

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Resume</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Resume
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Upload a PDF of your resume. You can keep older versions and choose which one is
            current.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/resume"
            target="_blank"
            rel="noreferrer"
            className={buttonStyles("secondary", "sm")}
          >
            View resume page
          </Link>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <AdminPanel
          title="Upload a new version"
          description="PDF only, 5 MB maximum. Drafts stay private. Only the published current file appears on your website."
        >
          <form onSubmit={submitUpload} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="resume-title" required>
                <TextInput
                  id="resume-title"
                  value={upload.title}
                  onChange={(event) => setUpload({ ...upload, title: event.target.value })}
                  placeholder="e.g. My resume 2026"
                />
              </Field>
              <Field label="Version" htmlFor="resume-version" required hint="A short label, such as 2026-01 or v3.">
                <TextInput
                  id="resume-version"
                  value={upload.version_label}
                  onChange={(event) =>
                    setUpload({ ...upload, version_label: event.target.value })
                  }
                  placeholder="2026-01"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Visibility" htmlFor="resume-status">
                <Select
                  id="resume-status"
                  value={upload.publish_status}
                  options={PUBLISH_OPTIONS}
                  onChange={(event) =>
                    setUpload({
                      ...upload,
                      publish_status: event.target.value as PublishStatus,
                    })
                  }
                />
              </Field>
              <Field label="PDF file" htmlFor="resume-file" required>
                <input
                  ref={fileInputRef}
                  id="resume-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={onFileChange}
                  className="block w-full cursor-pointer border border-line bg-ink-950 px-3 py-2 font-sans text-sm text-paper file:mr-3 file:border-0 file:bg-ink-800 file:px-3 file:py-1.5 file:font-mono file:text-[0.58rem] file:uppercase file:tracking-[0.12em] file:text-paper-dim focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                />
              </Field>
            </div>

            <div className="border border-line p-4">
              <Checkbox
                checked={upload.is_current}
                onChange={(checked) => setUpload({ ...upload, is_current: checked })}
                label="Make this the current resume"
                hint="Marks this version as current and publishes it. Other versions stop being current."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button type="submit" disabled={busy} className={buttonStyles("primary", "md")}>
                <Upload className="size-4" aria-hidden="true" />
                {busy ? "Uploading..." : "Upload resume"}
              </button>
              {file ? (
                <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted">
                  {file.name} / {formatFileSize(file.size)}
                </span>
              ) : null}
            </div>
          </form>
        </AdminPanel>

        <div className="space-y-6">
          <div className="border border-line bg-ink-900/60 p-5">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
              Current resume
            </p>
            {resumes.loading ? (
              <p className="mt-3 text-sm text-muted">Loading...</p>
            ) : current ? (
              <>
                <p className="mt-3 text-sm font-medium text-paper">{current.title}</p>
                <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                  {current.version_label} / {formatFileSize(current.file_size)} / PDF
                </p>
                <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                  {current.published_at
                    ? `Published ${formatDate(current.published_at, { withDay: true })}`
                    : "Not published"}
                </p>
                <a
                  href={current.download_url}
                  className={buttonStyles("secondary", "sm", "mt-4")}
                  download
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  Download
                </a>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                No current resume. Your online resume is shown until you publish a PDF.
              </p>
            )}
          </div>

          <div className="border border-line bg-ink-900/60 p-5">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
              How files are stored
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li>File names are created automatically.</li>
              <li>Files are only available through the download link.</li>
              <li>Deleting a version removes the file.</li>
            </ul>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="mt-8">
          <AdminPanel
            title="Edit resume details"
            description="The file itself is not replaced here. Upload a new version to change the PDF."
            actions={
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={buttonStyles("ghost", "sm")}
              >
                <X className="size-3.5" aria-hidden="true" />
                Cancel
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="edit-resume-title" required>
                <TextInput
                  id="edit-resume-title"
                  value={editForm.title}
                  onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                />
              </Field>
              <Field label="Version" htmlFor="edit-resume-version" required>
                <TextInput
                  id="edit-resume-version"
                  value={editForm.version_label}
                  onChange={(event) =>
                    setEditForm({ ...editForm, version_label: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy}
                className={buttonStyles("primary", "md")}
              >
                <Save className="size-4" aria-hidden="true" />
                {busy ? "Saving..." : "Save details"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={buttonStyles("ghost", "md")}
              >
                Cancel
              </button>
            </div>
          </AdminPanel>
        </div>
      ) : null}

      <div className="mt-8">
        {resumes.loading ? <LoadingState rows={3} label="Loading resume" /> : null}
        {!resumes.loading && resumes.error ? (
          <ErrorState message="We couldn't load your resume. Please try again." onRetry={resumes.reload} />
        ) : null}
        {!resumes.loading && !resumes.error && items.length === 0 ? (
          <EmptyState
            title="No resume uploaded yet"
            description="Upload your first PDF. It stays private until you publish it. Your online resume works without it."
          />
        ) : null}

        {items.length > 0 ? (
          <div className="border border-line">
            <ul className="divide-y divide-line">
              {items.map((resume) => (
                <li
                  key={resume.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="size-3.5 text-muted" aria-hidden="true" />
                      <p className="truncate text-sm font-medium text-paper">{resume.title}</p>
                      <StatusBadge status={resume.status} />
                      {resume.is_current ? (
                        <Badge tone="signal">
                          <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                          Current
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      {resume.version_label} / {formatFileSize(resume.file_size)} /{" "}
                      {resume.original_filename}
                    </p>
                    <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                      {resume.published_at
                        ? `Published ${formatDate(resume.published_at, { withDay: true })}`
                        : "Unpublished"}{" "}
                      / {resume.download_count} download{resume.download_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={resume.download_url}
                      className={buttonStyles("secondary", "sm")}
                      download
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => startEdit(resume)}
                      className={buttonStyles("secondary", "sm")}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    {resume.status !== "published" ? (
                      <button
                        type="button"
                        onClick={() => patch(resume, { publish_status: "published" }, "Resume published.")}
                        disabled={busy}
                        className={buttonStyles("secondary", "sm")}
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => patch(resume, { publish_status: "draft" }, "Resume moved to draft.")}
                        disabled={busy}
                        className={buttonStyles("ghost", "sm")}
                      >
                        Unpublish
                      </button>
                    )}
                    {!resume.is_current ? (
                      <button
                        type="button"
                        onClick={() =>
                          patch(
                            resume,
                            { is_current: true, publish_status: "published" },
                            "This is now the current resume.",
                          )
                        }
                        disabled={busy}
                        className={buttonStyles("secondary", "sm")}
                      >
                        Make current
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(resume)}
                      disabled={busy}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                      aria-label={`Delete ${resume.title}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </>
  );
}
