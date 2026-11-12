import { CoursesLibrary } from "@/components/courses/CoursesLibrary";
import { requireAccess } from "@/lib/guards";

export default async function Page() {
  await requireAccess();
  return (
    <section className="mw-public mx-auto max-w-7xl px-5 py-14">
      <h1 className="text-4xl font-bold">Online Courses</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-[#e7eef6]">Each card opens the Photog Adventures course library.</p>
      <div className="mt-8">
        <CoursesLibrary />
      </div>
    </section>
  );
}
