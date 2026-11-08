import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { privacyIntro, privacySections } from "@/lib/public-copy";

export const metadata: Metadata = {
  title: "Privacy notes",
  description: "What the Milky Way Photographers Guild stores and who can see it.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy notes"
      intro={privacyIntro}
      sections={privacySections}
      relatedHref="/terms"
      relatedLabel="Terms"
    />
  );
}
