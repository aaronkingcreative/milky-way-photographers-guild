import Link from "next/link";
import { KeepTail } from "@/components/KeepTail";
import type { LegalSection } from "@/lib/public-copy";

export function LegalDocument({
  title,
  intro,
  sections,
  relatedHref,
  relatedLabel,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  relatedHref: string;
  relatedLabel: string;
}) {
  return (
    <article className="mw-public mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl"><KeepTail text={title} /></h1>
      <p className="mt-6 text-lg leading-8 text-[#e7eef6]"><KeepTail text={intro} /></p>
      {sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-2xl font-bold text-[#f4bd61]"><KeepTail text={section.heading} /></h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-4 text-lg leading-8 text-[#e7eef6]">
              <KeepTail text={paragraph} />
            </p>
          ))}
        </section>
      ))}
      <p className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-lg">
        <Link className="text-[#f6e2b0] underline underline-offset-4" href={relatedHref}>
          {relatedLabel}
        </Link>
        <Link className="text-[#f6e2b0] underline underline-offset-4" href="/">
          Back to the Guild
        </Link>
      </p>
    </article>
  );
}
