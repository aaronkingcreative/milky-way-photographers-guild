import { CourseLinkCard } from "@/components/Cards";
import { KeepTail } from "@/components/KeepTail";
import { guildCourses } from "@/lib/courses";

export function CoursesLibrary({ heading, intro }: { heading?: string; intro?: string }) {
  return (
    <div className="mw-course-library-wrap">
      {heading ? <h2 className="mw-course-library-heading"><KeepTail text={heading} /></h2> : null}
      {intro ? <p className="mw-course-library-intro"><KeepTail text={intro} /></p> : null}
      <div className="mw-course-library">
        {guildCourses.map((course) => (
          <CourseLinkCard
            key={course.title}
            title={course.title}
            body={course.body}
            image={course.image}
            featured={course.featured}
            mediaFit={course.mediaFit}
          />
        ))}
      </div>
    </div>
  );
}
