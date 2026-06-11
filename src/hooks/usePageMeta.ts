import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://krefwatch.com';

/**
 * Lean per-route document-head management (no react-helmet):
 * sets document.title, meta[name=description], and link[rel=canonical]
 * (absolute https://krefwatch.com + pathname).
 */
export function usePageMeta(title: string, description?: string): void {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;

    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = SITE_ORIGIN + pathname;
  }, [title, description, pathname]);
}
