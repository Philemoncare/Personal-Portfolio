import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useSeo } from "@/hooks/useSeo";
import { siteService } from "@/services/site.service";
import type { PageContent, SocialLink } from "@/types/api";

interface ContentContextValue {
  pages: Record<string, PageContent>;
  socialLinks: SocialLink[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const ContentContext = createContext<ContentContextValue | null>(null);

/**
 * Loads DB-managed page content and social links once per public session.
 * Public endpoints already hide unpublished records, so anything returned here
 * is safe to render.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApiQuery(async (signal) => {
    const [pages, socialLinks] = await Promise.all([
      siteService.listPages(signal),
      siteService.listSocialLinks(signal),
    ]);
    const byKey: Record<string, PageContent> = {};
    for (const page of pages) {
      if (page.is_published) byKey[page.page_key] = page;
    }
    return { pages: byKey, socialLinks };
  }, []);

  return (
    <ContentContext.Provider
      value={{
        pages: data?.pages ?? {},
        socialLinks: data?.socialLinks ?? [],
        loading,
        error: error?.detail ?? null,
        reload,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

function useContentContext(): ContentContextValue {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error("useContentContext must be used within ContentProvider");
  }
  return context;
}

export function usePageContent(pageKey: string): PageContent | null {
  return useContentContext().pages[pageKey] ?? null;
}

export function useSocialLinks(): SocialLink[] {
  return useContentContext().socialLinks;
}

export function useContentStatus() {
  const { loading, error, reload } = useContentContext();
  return { loading, error, reload };
}

/**
 * Applies per-page SEO managed in the CMS, falling back to the route's
 * built-in defaults when a page has no saved record.
 */
export function usePageSeo(
  pageKey: string,
  options: {
    title: string;
    description?: string | null;
    path?: string;
    noIndex?: boolean;
    type?: "website" | "article";
    image?: string | null;
    imageAlt?: string | null;
  },
) {
  const page = usePageContent(pageKey);
  useSeo({
    title: page?.seo_title || options.title,
    description: page?.seo_description || page?.description || options.description,
    path: page?.canonical_path || options.path,
    noIndex: options.noIndex,
    type: options.type,
    image: page?.og_image || options.image,
    imageAlt: options.imageAlt,
  });
}
