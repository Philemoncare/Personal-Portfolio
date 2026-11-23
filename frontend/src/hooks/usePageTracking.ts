import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { analyticsService } from "@/services/analytics.service";

function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem("phill_visitor_id");
    if (!id) {
      id = "v_" + crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem("phill_visitor_id", id);
    }
    return id;
  } catch {
    return "v_anon_" + Math.random().toString(36).slice(2);
  }
}

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem("phill_session_id");
    if (!id) {
      id = "s_" + crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem("phill_session_id", id);
    }
    return id;
  } catch {
    return "s_anon_" + Math.random().toString(36).slice(2);
  }
}

export function usePageTracking() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;

    // Do not track admin route changes
    if (path.startsWith("/admin") || path === lastPath.current) {
      return;
    }

    lastPath.current = path;

    const visitor_id = getOrCreateVisitorId();
    const session_id = getOrCreateSessionId();

    // Fire non-blocking analytics request after DOM updates
    const timer = setTimeout(() => {
      void analyticsService.collect({
        path,
        title: document.title || undefined,
        referrer: document.referrer || undefined,
        visitor_id,
        session_id,
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
