import { useEffect } from "react";

import { SOCIAL_IMAGE } from "@/assets/registry";

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

export function useSeo({
  title,
  description,
  path,
  noIndex = false,
  type = "website",
  image,
  imageAlt,
}: SeoOptions) {
  useEffect(() => {
    document.title = title;
    const copy = description?.trim();
    if (copy) setMeta("name", "description", copy);

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
      const href = absoluteUrl(SOCIAL_IMAGE);
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
  }, [title, description, path, noIndex, type, image, imageAlt]);
}
