"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Instant click feedback for every internal link.
 * A gold bar starts at the top of the page the moment a link is clicked and finishes when the new page renders.
 * The clicked link gets data-nav-pending (pressed look in CSS). Links marked data-list-sort also dim the list
 * they control (html[data-list-loading]) and show a spinner until the new sort renders.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<number[]>([]);

  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  const clearPending = () => {
    document.querySelectorAll("[data-nav-pending]").forEach((el) => el.removeAttribute("data-nav-pending"));
    delete document.documentElement.dataset.listLoading;
    delete document.documentElement.dataset.navLoading;
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.dataset.noProgress !== undefined) return;
      let url: URL;
      try { url = new URL(anchor.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page or hash jump
      clearTimers();
      clearPending();
      anchor.setAttribute("data-nav-pending", "");
      document.documentElement.dataset.navLoading = "";
      if (anchor.dataset.listSort !== undefined) document.documentElement.dataset.listLoading = "";
      setState("loading");
      timers.current.push(window.setTimeout(() => { clearPending(); setState("idle"); }, 15000));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    clearPending();
    clearTimers();
    setState((s) => (s === "loading" ? "done" : s));
    timers.current.push(window.setTimeout(() => setState("idle"), 450));
  }, [pathname, search]);

  return <div className={`mw-nav-progress is-${state}`} aria-hidden="true"><span /></div>;
}
