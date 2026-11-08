import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { termsIntro, termsSections } from "@/lib/public-copy";

export const metadata: Metadata = {
  title: "Terms",
  description: "How the Milky Way Photographers Guild site works today.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms"
      intro={termsIntro}
      sections={termsSections}
      relatedHref="/privacy"
      relatedLabel="Privacy notes"
    />
  );
}
