import {
  AlertTriangle,
  Check,
  Copy,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { listImages } from "@/assets/registry";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/services/api";
import {
  MEDIA_FOLDERS,
  deleteMedia,
  getMediaUsage,
  listMedia,
  replaceMedia,
  updateMedia,
  uploadMedia,
} from "@/services/auth.service";
import type { MediaAsset, MediaList, MediaUsage } from "@/types/api";
import { formatDate } from "@/utils/format";
import { formatFileSize } from "@/utils/identity";
import { cn } from "@/utils/cn";

const ASSOCIATION_TYPES = [
  "project",
  "data_project",
  "case_study",
  "profile",
  "site_settings",
  "leadership",
  "experience",
];

const inputClass =
  "h-10 w-full border border-line bg-ink-950 px-3 text-sm text-paper outline-none transition-colors placeholder:text-faint focus:border-paper";

const labelClass =
  "block font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted";

const MAX_BYTES = 8 * 1024 * 1024;

interface EditState {
  title: string;
  alt_text: string;
  caption: string;
  folder: string;
  attached_to_type: string;
  attached_to_id: string;
}

function editStateFrom(asset: MediaAsset): EditState {
  return {
    title: asset.title,
    alt_text: asset.alt_text,
    caption: asset.caption ?? "",
    folder: asset.folder,
    attached_to_type: asset.attached_to_type ?? "",
    attached_to_id: asset.attached_to_id ?? "",
  };
}

export default function AdminMediaPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [kind, setKind] = useState("");
  const [folder, setFolder] = useState("");
  const [association, setAssociation] = useState("");
  const [revision, setRevision] = useState(0);

  const [data, setData] = useState<MediaList | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadFolder, setUploadFolder] = useState("misc");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [usage, setUsage] = useState<MediaUsage | null>(null);
  const [usageBusy, setUsageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError(null);

    listMedia({
      search: debouncedSearch || undefined,
      kind: kind || undefined,
      folder: folder || undefined,
      attachedToType: association || undefined,
      limit: 100,
    })
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setListError(
          cause instanceof ApiError ? cause.detail : "The media library could not load.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, kind, folder, association, revision]);

  const loadUsage = useCallback(async (asset: MediaAsset) => {
    setUsageBusy(true);
    setUsage(null);
    try {
      const result = await getMediaUsage(asset.id);
      setUsage(result);
    } catch {
      setUsage(null);
    } finally {
      setUsageBusy(false);
    }
  }, []);

  const openEditor = (asset: MediaAsset) => {
    setSelected(asset);
    setEdit(editStateFrom(asset));
    setSaveError(null);
    setNotice(null);
    setConfirmDelete(false);
    setReplaceFile(null);
    void loadUsage(asset);
  };

  const closeEditor = () => {
    setSelected(null);
    setEdit(null);
    setUsage(null);
    setConfirmDelete(false);
    setReplaceFile(null);
    setSaveError(null);
  };

  const onUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setUploadError("Choose an image first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Images must be 8 MB or smaller.");
      return;
    }

    const form = new FormData();
    form.set("file", file);
    if (uploadTitle.trim()) form.set("title", uploadTitle.trim());
    if (uploadAlt.trim()) form.set("alt_text", uploadAlt.trim());
    form.set("folder", uploadFolder);

    setUploading(true);
    setUploadError(null);
    setNotice(null);

    try {
      const asset = await uploadMedia(form);
      setFile(null);
      setUploadTitle("");
      setUploadAlt("");
      const input = document.getElementById("media-file") as HTMLInputElement | null;
      if (input) input.value = "";
      reload();
      setNotice(`Uploaded ${asset.filename} to ${asset.folder}.`);
      openEditor(asset);
    } catch (cause) {
      setUploadError(
        cause instanceof ApiError ? cause.detail : "The upload could not be completed.",
      );
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!selected || !edit) return;
    if (!edit.title.trim() || edit.alt_text.trim().length < 4) {
      setSaveError("A title and a meaningful alt text are required.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await updateMedia(selected.id, {
        title: edit.title.trim(),
        alt_text: edit.alt_text.trim(),
        caption: edit.caption.trim() || null,
        folder: edit.folder || "misc",
        attached_to_type: edit.attached_to_type || null,
        attached_to_id: edit.attached_to_id.trim() || null,
      });
      setSelected(updated);
      setEdit(editStateFrom(updated));
      setNotice("Media metadata saved.");
      reload();
      void loadUsage(updated);
    } catch (cause) {
      setSaveError(
        cause instanceof ApiError ? cause.detail : "The metadata could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onReplace = async () => {
    if (!selected || !replaceFile) return;
    setReplacing(true);
    setSaveError(null);
    try {
      const updated = await replaceMedia(selected.id, replaceFile);
      setSelected(updated);
      setEdit(editStateFrom(updated));
      setReplaceFile(null);
      const input = document.getElementById("replace-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice(`Replaced the file behind ${updated.filename}. Existing references still work.`);
      reload();
      void loadUsage(updated);
    } catch (cause) {
      setSaveError(
        cause instanceof ApiError ? cause.detail : "The file could not be replaced.",
      );
    } finally {
      setReplacing(false);
    }
  };

  const onDelete = async (asset: MediaAsset, force: boolean) => {
    setSaving(true);
    setSaveError(null);

    try {
      await deleteMedia(asset.id, force);
      setConfirmDelete(false);
      closeEditor();
      setNotice("Media asset deleted.");
      reload();
    } catch (cause) {
      setSaveError(
        cause instanceof ApiError ? cause.detail : "The asset could not be deleted.",
      );
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`Copied ${label}.`);
    } catch {
      setNotice(`Copy failed. Select the value manually: ${value}`);
    }
  };

  const items = data?.items ?? [];
  const folders = data?.folders?.length ? data.folders : [...MEDIA_FOLDERS];
  const registered = listImages();
  const usageCount = usage?.count ?? 0;
  const attached = Boolean(edit?.attached_to_type && edit.attached_to_id);

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
          Media library
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
          Images and references
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Uploaded files are validated server-side, stored under a generated filename, and served
          from <code className="font-mono text-[0.85em] text-paper-dim">/media</code>. Nothing here
          exposes a filesystem path, and deleting a referenced asset is blocked until you confirm.
        </p>
      </header>

      {notice ? (
        <div
          className="flex items-start justify-between gap-4 border border-success/40 bg-success/5 px-5 py-3 text-sm text-paper"
          role="status"
        >
          <span className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-muted hover:text-paper"
            aria-label="Dismiss notice"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section aria-labelledby="upload-heading" className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 id="upload-heading" className={labelClass}>
            Upload
          </h2>
          <form onSubmit={onUpload} className="mt-4 space-y-4 border border-line p-5">
            <div className="space-y-2">
              <label htmlFor="media-file" className={labelClass}>
                Image file
              </label>
              <input
                id="media-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-paper-dim file:mr-4 file:border file:border-line-strong file:bg-transparent file:px-3 file:py-2 file:font-mono file:text-[0.58rem] file:uppercase file:tracking-[0.14em] file:text-paper"
              />
              <p className="text-xs text-faint">
                JPEG, PNG or WebP. Maximum 8 MB and 8000px. Executable and markup extensions are
                rejected before the file is written.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="media-title" className={labelClass}>
                  Title
                </label>
                <input
                  id="media-title"
                  value={uploadTitle}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="media-alt" className={labelClass}>
                  Alt text
                </label>
                <input
                  id="media-alt"
                  value={uploadAlt}
                  onChange={(event) => setUploadAlt(event.target.value)}
                  className={inputClass}
                  placeholder="Describe the image"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="media-folder" className={labelClass}>
                  Folder
                </label>
                <select
                  id="media-folder"
                  value={uploadFolder}
                  onChange={(event) => setUploadFolder(event.target.value)}
                  className={inputClass}
                >
                  {folders.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {uploadError ? (
              <p className="border border-signal/40 bg-signal/5 px-4 py-3 text-sm text-paper" role="alert">
                {uploadError}
              </p>
            ) : null}

            <button
              type="submit"
              className={buttonStyles("primary", "sm")}
              disabled={uploading || !file}
            >
              <Upload className="size-3.5" aria-hidden="true" />
              {uploading ? "Uploading" : "Upload image"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5">
          <h2 className={labelClass}>Curated registry</h2>
          <ul className="mt-4 max-h-72 divide-y divide-line overflow-y-auto border border-line">
            {registered.map((asset) => (
              <li key={asset.id} className="flex items-center gap-3 px-4 py-3">
                <ImageIcon className="size-4 shrink-0 text-faint" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-paper">{asset.id}</p>
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                    {asset.width}×{asset.height} · {asset.variants.length} variants
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copy(asset.id, "registry id")}
                  className={buttonStyles("ghost", "sm", "px-2")}
                  aria-label={`Copy registry id ${asset.id}`}
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="library-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
          <h2 id="library-heading" className={labelClass}>
            Uploaded assets
          </h2>
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-faint">
            {data?.total ?? 0} total
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
            placeholder="Search title, filename, alt text"
            aria-label="Search media"
          />
          <select
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            className={inputClass}
            aria-label="Filter by folder"
          >
            <option value="">All folders</option>
            {folders.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className={inputClass}
            aria-label="Filter by kind"
          >
            <option value="">All kinds</option>
            <option value="image">Images</option>
          </select>
          <select
            value={association}
            onChange={(event) => setAssociation(event.target.value)}
            className={inputClass}
            aria-label="Filter by attached content"
          >
            <option value="">All associations</option>
            {ASSOCIATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFolder("")}
            className={cn(
              "border px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.1em] transition-colors",
              folder === ""
                ? "border-paper text-paper"
                : "border-line text-muted hover:border-line-strong hover:text-paper",
            )}
          >
            All
          </button>
          {folders.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFolder(folder === name ? "" : name)}
              className={cn(
                "border px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.1em] transition-colors",
                folder === name
                  ? "border-paper text-paper"
                  : "border-line text-muted hover:border-line-strong hover:text-paper",
              )}
            >
              {name}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="mt-6">
            <LoadingState label="Loading media" rows={3} />
          </div>
        ) : listError ? (
          <div className="mt-6">
            <ErrorState message={listError} onRetry={reload} />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 border border-dashed border-line-strong px-5 py-8">
            <p className="text-sm text-paper">No assets match this view.</p>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
              Upload an image above, or clear the filters. Public pages fall back to typographic
              layouts when no real image exists.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((asset) => (
              <li
                key={asset.id}
                className={cn(
                  "border transition-colors",
                  selected?.id === asset.id ? "border-paper" : "border-line",
                )}
              >
                <button
                  type="button"
                  onClick={() => openEditor(asset)}
                  className="group block w-full text-left"
                  aria-label={`Edit ${asset.title}`}
                >
                  <PortfolioImage
                    src={asset.url}
                    alt={asset.alt_text}
                    aspect="wide"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    imageClassName="transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <span className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
                    <span className="truncate font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                      {asset.folder}
                    </span>
                    {asset.attached_to_type ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
                        <Link2 className="size-2.5" aria-hidden="true" />
                        attached
                      </span>
                    ) : null}
                  </span>
                  <span className="block border-t border-line px-4 py-3">
                    <span className="block truncate text-sm text-paper">{asset.title}</span>
                    <span className="mt-1 block font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                      {asset.width}×{asset.height} · {formatFileSize(asset.size_bytes)} ·{" "}
                      {asset.extension.toUpperCase()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && edit ? (
        <section
          aria-labelledby="editor-heading"
          className="border border-line-strong bg-ink-900/40 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 id="editor-heading" className={labelClass}>
                Edit asset
              </h2>
              <p className="mt-1 break-all font-mono text-[0.56rem] text-faint">{selected.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copy(selected.url, "media URL")}
                className={buttonStyles("secondary", "sm")}
              >
                <Copy className="size-3.5" aria-hidden="true" />
                Copy reference
              </button>
              <button
                type="button"
                onClick={() => copy(selected.filename, "filename")}
                className={buttonStyles("ghost", "sm", "border border-line")}
              >
                Copy filename
              </button>
              <button type="button" onClick={closeEditor} className={buttonStyles("ghost", "sm")}>
                Close
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <PortfolioImage
                src={selected.url}
                alt={selected.alt_text}
                aspect="square"
                fit="contain"
                className="border border-line bg-ink-950"
                sizes="16rem"
              />
              <dl className="mt-3 space-y-1 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-faint">
                <div className="flex justify-between gap-3">
                  <dt>Dimensions</dt>
                  <dd>
                    {selected.width}×{selected.height}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Size</dt>
                  <dd>{formatFileSize(selected.size_bytes)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Type</dt>
                  <dd>{selected.mime_type}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Folder</dt>
                  <dd>{selected.folder}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Uploaded</dt>
                  <dd>{formatDate(selected.created_at, { withDay: true })}</dd>
                </div>
              </dl>

              <div className="mt-5 border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                    Usage
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadUsage(selected)}
                    className="text-muted hover:text-paper"
                    aria-label="Refresh usage"
                  >
                    <RefreshCw
                      className={cn("size-3.5", usageBusy && "animate-spin")}
                      aria-hidden="true"
                    />
                  </button>
                </div>
                {usageBusy ? (
                  <p className="mt-2 text-xs text-muted">Checking references…</p>
                ) : usage ? (
                  usage.count === 0 ? (
                    <p className="mt-2 text-xs text-muted">Not used anywhere yet.</p>
                  ) : (
                    <>
                      <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-paper">
                        Used in {usage.count} {usage.count === 1 ? "place" : "places"}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {usage.entries.map((entry) => (
                          <li key={`${entry.type}-${entry.id}-${entry.field}`} className="text-xs">
                            <p className="truncate text-paper-dim">{entry.title}</p>
                            <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
                              {entry.type} · {entry.field}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                ) : (
                  <p className="mt-2 text-xs text-muted">
                    Usage could not be checked. Deleting asks the server to confirm references.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="edit-title" className={labelClass}>
                    Title
                  </label>
                  <input
                    id="edit-title"
                    value={edit.title}
                    onChange={(event) => setEdit({ ...edit, title: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-alt" className={labelClass}>
                    Alt text
                  </label>
                  <input
                    id="edit-alt"
                    value={edit.alt_text}
                    onChange={(event) => setEdit({ ...edit, alt_text: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="space-y-2">
                  <label htmlFor="edit-caption" className={labelClass}>
                    Caption
                  </label>
                  <input
                    id="edit-caption"
                    value={edit.caption}
                    onChange={(event) => setEdit({ ...edit, caption: event.target.value })}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-folder" className={labelClass}>
                    Folder
                  </label>
                  <select
                    id="edit-folder"
                    value={edit.folder}
                    onChange={(event) => setEdit({ ...edit, folder: event.target.value })}
                    className={inputClass}
                  >
                    {folders.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className={labelClass}>Attachment</p>
                  {attached ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEdit({ ...edit, attached_to_type: "", attached_to_id: "" })
                      }
                      className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-signal hover:text-paper"
                    >
                      Detach
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="edit-association" className={labelClass}>
                      Attach to
                    </label>
                    <select
                      id="edit-association"
                      value={edit.attached_to_type}
                      onChange={(event) =>
                        setEdit({ ...edit, attached_to_type: event.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="">Not attached</option>
                      {ASSOCIATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-association-id" className={labelClass}>
                      Content id
                    </label>
                    <input
                      id="edit-association-id"
                      value={edit.attached_to_id}
                      onChange={(event) =>
                        setEdit({ ...edit, attached_to_id: event.target.value })
                      }
                      className={inputClass}
                      placeholder="UUID of the project or entry"
                      disabled={!edit.attached_to_type}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Attaching records which content an asset belongs to. Project and page image
                  fields are what actually render on the public site.
                </p>
              </div>

              <div className="border border-line p-4">
                <p className={labelClass}>Replace file</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Keeps the same filename and URL so existing references keep working. The new file
                  must use the same extension ({selected.extension.toUpperCase()}).
                </p>
                <input
                  id="replace-file"
                  type="file"
                  accept={
                    selected.extension === "png"
                      ? "image/png"
                      : selected.extension === "webp"
                        ? "image/webp"
                        : "image/jpeg"
                  }
                  onChange={(event) => setReplaceFile(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-paper-dim file:mr-4 file:border file:border-line-strong file:bg-transparent file:px-3 file:py-2 file:font-mono file:text-[0.58rem] file:uppercase file:tracking-[0.14em] file:text-paper"
                />
                <button
                  type="button"
                  onClick={onReplace}
                  disabled={replacing || !replaceFile}
                  className={buttonStyles("secondary", "sm", "mt-3")}
                >
                  {replacing ? "Replacing…" : "Replace file"}
                </button>
              </div>

              {saveError ? (
                <p
                  className="border border-signal/40 bg-signal/5 px-4 py-3 text-sm text-paper"
                  role="alert"
                >
                  {saveError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className={buttonStyles("primary", "sm")}
                >
                  {saving ? "Saving" : "Save metadata"}
                </button>

                {confirmDelete ? (
                  <div className="flex flex-col gap-2 border border-signal/40 bg-signal/5 px-4 py-3">
                    {usageCount > 0 ? (
                      <p className="flex items-start gap-2 text-sm text-paper">
                        <AlertTriangle
                          className="mt-0.5 size-4 shrink-0 text-signal"
                          aria-hidden="true"
                        />
                        Used in {usageCount} {usageCount === 1 ? "place" : "places"}. Deleting will
                        leave broken references there.
                      </p>
                    ) : (
                      <p className="text-sm text-paper">Delete this asset permanently?</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDelete(selected, usageCount > 0)}
                        disabled={saving}
                        className={buttonStyles("secondary", "sm", "border-signal text-signal")}
                      >
                        {usageCount > 0 ? "Delete anyway" : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className={buttonStyles("ghost", "sm")}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className={buttonStyles("ghost", "sm", "border border-line")}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
