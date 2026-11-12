/** Small line icons for the category boxes. Stroke only, so they take the gold from CSS. */
export function ForumCategoryIcon({ slug }: { slug: string }) {
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (slug) {
    case "general":
      return <svg {...common}><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></svg>;
    case "locations":
      return <svg {...common}><path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>;
    case "techniques":
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 4l3.5 6M20 12l-6.9.1M16 19l-3.5-6M8 19.9l3.4-6M4 12l6.9-.1M8 4.1l3.5 6" /></svg>;
    case "gear":
      return <svg {...common}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
    case "trips":
      return <svg {...common}><path d="M3 20l9-15 9 15z" /><path d="M12 5v15M9 20l3-5 3 5" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

export function LockIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
}
