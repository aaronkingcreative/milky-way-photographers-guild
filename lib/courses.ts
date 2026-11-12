import { courseLibraryUrl } from "@/lib/public-copy";

export type GuildCourse = {
  title: string;
  body: string;
  image: string;
  featured?: boolean;
  mediaFit?: "cover" | "contain";
};

export const guildCourses: GuildCourse[] = [
  {
    title: "Beginner Milky Way Photography",
    body: "For a first night under the Milky Way. You will plan the shot, expose the sky, and bring a frame home.",
    image: "/courses/beginner-lake.jpg",
    featured: true,
  },
  {
    title: "Master PhotoPills",
    body: "For planning the Milky Way before you leave home. You will find the core, the time, and a foreground that fits.",
    image: "/courses/photopills-mark.jpg",
    mediaFit: "contain",
  },
  {
    title: "Eric Benedetti Star Tracking",
    body: "For tracking the sky with a mount. You will keep the stars sharp on a longer\u00A0exposure.",
    image: "/courses/eric-benedetti-sky.jpg",
  },
  {
    title: "MaryBeth Kiczenski Star Tracked Post-Processing",
    body: "For the edit after a tracked night. You will blend the sky and the ground into one\u00A0photograph.",
    image: "/courses/marybeth-sky.jpg",
  },
];

export { courseLibraryUrl };
