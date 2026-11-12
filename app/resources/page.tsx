import Link from "next/link";
import { ScenePage } from "@/components/ScenePage";
import { LearnTabs } from "@/components/courses/LearnTabs";
import { requireAccess } from "@/lib/guards";
import { courseLibraryLabel, courseLibraryUrl, resourcesNote } from "@/lib/public-copy";

export default async function Page() {
  await requireAccess();
  return (
    <ScenePage>
      <LearnTabs current="resources" />
      <h1 className="text-4xl font-bold text-white">Resources</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-[#e7eef6]">{resourcesNote}</p>
      <p className="mt-6 flex flex-wrap gap-3">
        <a className="btn btn-secondary" href={courseLibraryUrl}>
          {courseLibraryLabel}
        </a>
        <Link className="btn btn-secondary" href="/courses">See the Guild courses</Link>
      </p>
    </ScenePage>
  );
}
