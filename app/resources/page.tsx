import { CoursesLibrary } from "@/components/courses/CoursesLibrary";
import { ScenePage } from "@/components/ScenePage";
import { requireAccess } from "@/lib/guards";
import { courseLibraryLabel, courseLibraryUrl, resourcesNote } from "@/lib/public-copy";

export default async function Page() {
  await requireAccess();
  return (
    <ScenePage>
      <h1 className="text-4xl font-bold text-white">Resources</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-[#e7eef6]">{resourcesNote}</p>
      <p className="mt-6">
        <a className="btn btn-secondary" href={courseLibraryUrl}>
          {courseLibraryLabel}
        </a>
      </p>
      <div className="mt-10">
        <CoursesLibrary heading="Online Courses" />
      </div>
    </ScenePage>
  );
}
