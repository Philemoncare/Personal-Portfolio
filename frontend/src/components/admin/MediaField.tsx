import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { PortfolioImage } from "@/components/media/PortfolioImage";
import { buttonStyles } from "@/components/ui/button";
import { uploadMedia } from "@/services/auth.service";
import type { MediaAsset } from "@/types/api";

/**
 * Image field backed by the media library.
 *
 * Images are always uploaded through the backend (or chosen from existing
 * media), never referenced by a hand-typed external URL.
 */
export function MediaField({
  value,
  onChange,
  assets,
  loading,
  onUploaded,
  title,
  altText,
  folder = "projects",
  emptyLabel = "No image selected.",
}: {
  value: string;
  onChange: (url: string) => void;
  assets: MediaAsset[];
  loading: boolean;
  onUploaded?: (asset: MediaAsset) => void;
  title?: string;
  altText?: string;
  folder?: string;
  emptyLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);
      if (title?.trim()) body.set("title", title.trim());
      if (altText?.trim()) body.set("alt_text", altText.trim());
      const asset = await uploadMedia(body);
      onChange(asset.url);
      onUploaded?.(asset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't upload this image. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-center gap-3 border border-line bg-ink-950/40 p-2">
          <PortfolioImage src={value} alt={altText || title || "Selected image"} aspect="wide" sizes="96px" />
          <p className="min-w-0 flex-1 truncate font-mono text-[0.58rem] text-paper-dim" title={value}>
            {value}
          </p>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted transition-colors hover:text-signal"
            aria-label="Remove image"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 border border-dashed border-line-strong px-3 py-2 text-xs text-muted">
          <ImageIcon className="size-3.5" aria-hidden="true" />
          {emptyLabel}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload image"
        onChange={(event) => upload(event.target.files?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={buttonStyles("secondary", "sm")}
        >
          <Upload className="size-3.5" aria-hidden="true" />
          {uploading ? "Uploading..." : value ? "Replace image" : "Upload image"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={buttonStyles("outline", "sm")}
          aria-expanded={open}
        >
          <ImageIcon className="size-3.5" aria-hidden="true" />
          {open ? "Hide library" : "Choose from library"}
        </button>
      </div>

      {error ? (
        <p className="text-[0.68rem] font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="border border-line bg-ink-950/60 p-3">
          {loading ? (
            <p className="p-3 text-sm text-muted">Loading media library...</p>
          ) : assets.length === 0 ? (
            <p className="p-3 text-sm text-muted">No files have been uploaded yet.</p>
          ) : (
            <ul className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(asset.url);
                      setOpen(false);
                    }}
                    className="block w-full border border-line text-left transition-colors hover:border-paper"
                    title={`${asset.title} · ${asset.folder}`}
                  >
                    <PortfolioImage
                      src={asset.url}
                      alt={asset.alt_text}
                      aspect="wide"
                      sizes="140px"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
