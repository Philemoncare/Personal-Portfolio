import { useEffect, useState } from "react";

import { SOCIAL_IMAGE } from "@/assets/registry";
import { getSeoSiteDefaults, subscribeSeoSiteDefaults } from "@/utils/seo";

interface SeoOptions {
  title: string;
  description?: string | null;
  path?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  image?: string | null;
  imageAlt?: string | null;
}

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? window.location.origin).replace(/\/+$/, "");

function absoluteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function setMeta(attribute: "name" | "property", key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function iconType(href: string): string | null {
  const path = href.split(/[?#]/)[0]?.toLowerCase() ?? "";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function setIcon(href: string) {
  setLink("icon", href);
  const element = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!element) return;
  const type = iconType(href);
  if (type) element.setAttribute("type", type);
  else element.removeAttribute("type");
}

export function useSeo({
  title,
  description,
  path,
  noIndex = false,
  type = "website",
  image,
  imageAlt,
}: SeoOptions) {
  const [defaultsVersion, setDefaultsVersion] = useState(0);

  useEffect(() => subscribeSeoSiteDefaults(() => setDefaultsVersion((value) => value + 1)), []);

  useEffect(() => {
    const defaults = getSeoSiteDefaults();
    document.title = title;
    const copy = description?.trim();
    if (copy) setMeta("name", "description", copy);

    if (defaults.favicon) {
      setIcon(absoluteUrl(defaults.favicon));
    }
    if (defaults.wordmark) {
      setMeta("property", "og:site_name", defaults.wordmark);
    }

    setMeta("property", "og:title", title);
    if (copy) setMeta("property", "og:description", copy);
    setMeta("property", "og:type", type);
    setMeta("name", "twitter:title", title);
    if (copy) setMeta("name", "twitter:description", copy);

    if (image) {
      const href = absoluteUrl(image);
      setMeta("property", "og:image", href);
      setMeta("name", "twitter:image", href);
      setMeta("name", "twitter:card", "summary_large_image");
      if (imageAlt) {
        setMeta("property", "og:image:alt", imageAlt);
        setMeta("name", "twitter:image:alt", imageAlt);
      }
    } else if (!noIndex) {
      const href = absoluteUrl(defaults.socialImage || SOCIAL_IMAGE);
      setMeta("property", "og:image", href);
      setMeta("name", "twitter:image", href);
      setMeta("name", "twitter:card", "summary_large_image");
    }

    const canonical = path ? `${SITE_URL}${path}` : undefined;
    if (canonical) {
      setMeta("property", "og:url", canonical);
      setLink("canonical", canonical);
    }
    setMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
  }, [title, description, path, noIndex, type, image, imageAlt, defaultsVersion]);
}
