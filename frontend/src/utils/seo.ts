export interface SeoSiteDefaults {
  wordmark?: string | null;
  socialImage?: string | null;
  favicon?: string | null;
}

type SeoSiteDefaultsListener = () => void;

let defaults: SeoSiteDefaults = {};
const listeners = new Set<SeoSiteDefaultsListener>();

/** Called by the site-settings provider so non-hook helpers can read branding. */
export function setSeoSiteDefaults(next: SeoSiteDefaults): void {
  defaults = next;
  for (const listener of listeners) listener();
}

export function getSeoSiteDefaults(): SeoSiteDefaults {
  return defaults;
}

/** Subscribe to branding updates so SEO tags can be re-applied after settings load. */
export function subscribeSeoSiteDefaults(listener: SeoSiteDefaultsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
