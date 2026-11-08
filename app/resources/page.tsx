import { requireAccess } from "@/lib/guards";
import { courseLibraryLabel, courseLibraryUrl, resourcesNote } from "@/lib/public-copy";

export default async function Page() {
  await requireAccess();
  return (
    <section className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-4xl font-bold">Resources</h1>
      <p className="mt-6 text-lg leading-8 text-[#e7eef6]">{resourcesNote}</p>
      <p className="mt-6">
        <a className="text-[#f4bd61] underline underline-offset-4" href={courseLibraryUrl}>
          {courseLibraryLabel}
        </a>
      </p>
    </section>
  );
}
