import { CourseLinkCard } from "@/components/Cards";
import { requireAccess } from "@/lib/guards";

const courses = [
  ["Beginner Milky Way Photography", "For a first night under the Milky Way. You will plan the shot, expose the sky, and bring a frame home."],
  ["Master PhotoPills", "For planning the Milky Way before you leave home. You will find the core, the time, and a foreground that fits."],
  ["Eric Benedetti Star Tracking", "For tracking the sky with a mount. You will keep the stars sharp on a longer exposure."],
  ["MaryBeth Kiczenski Star Tracked Post-Processing", "For the edit after a tracked night. You will blend the sky and the ground into one photograph."],
];

export default async function Page() {
  await requireAccess();
  return (
    <section className="mx-auto max-w-7xl px-5 py-14">
      <h1 className="text-4xl font-bold">Online Courses</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-[#e7eef6]">Each card opens the Photog Adventures course library.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {courses.map(([title, body]) => <CourseLinkCard key={title} title={title} body={body} />)}
      </div>
    </section>
  );
}
