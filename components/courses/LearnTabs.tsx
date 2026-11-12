import Link from "next/link";

/** Courses and Resources live under one Learn item in the main nav. */
export function LearnTabs({ current }: { current: "courses" | "resources" }) {
  return (
    <nav className="mw-learn-tabs" aria-label="Learn">
      <Link href="/courses" className="mw-learn-tab" aria-current={current === "courses" ? "page" : undefined}>Courses</Link>
      <Link href="/resources" className="mw-learn-tab" aria-current={current === "resources" ? "page" : undefined}>Resources</Link>
    </nav>
  );
}
