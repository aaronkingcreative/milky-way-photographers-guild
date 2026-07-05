import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isBeforeGuildLaunch } from "@/lib/launch";

const logoUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo.png";

const whatsComing = [
  "Image sharing built with photographers in mind",
  "Weekly Image of the Week voting",
  "Winner Monday Moment of Envy",
  "Earn Milky Way achievement badges from submitted images",
  "Graduate from Beginner Milky Way Photographer to Master Milky Way Photographer",
  "Learn from each other's shared tips & tricks",
];

export default function Home() {
  if (isBeforeGuildLaunch()) {
    redirect("/launch");
  }

  return (
    <div className="overflow-hidden">
      <section className="starfield relative px-5 py-20 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_18%,rgba(231,159,43,.20),transparent_22rem),radial-gradient(circle_at_24%_30%,rgba(47,68,93,.44),transparent_24rem)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.86fr_1.14fr] xl:grid-cols-[.8fr_1.2fr]">
          <div className="lg:-ml-2">
            <p className="text-sm font-bold uppercase tracking-[.35em] text-[#f4bd61]">
              Milky Way Photographers Guild
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.95] tracking-tight text-white md:text-7xl">
              The Guild is being rebuilt.
            </h1>
            <p className="mt-6 max-w-3xl text-2xl leading-9 text-[#f4bd61]">
              The private image-first, ad-free community for Milky Way photographers is returning.
            </p>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#b8c4d4]">
              I&apos;m rebuilding the Milky Way Photographers Guild into a better home for sharing your
              night-sky images, voting on each other&apos;s images to find the Image of the Week,
              celebrating weekly winners with a Monday Moment of Envy, while still keeping the
              original benefits of getting useful feedback and improving your Milky Way photography
              without ads or social media noise.
            </p>
            <p className="mt-5 text-lg font-semibold text-white">
              Aaron King of Photog Adventures.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a className="btn btn-primary" href="https://www.photogadventures.com">
                Visit Photog Adventures
              </a>
              <a
                className="btn btn-secondary"
                href="https://onlinecourses.photogadventures.com"
              >
                View Online Courses
              </a>
              <Link className="btn btn-ghost" href="/login">
                Member sign in
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute inset-0 -z-10 rounded-full bg-[#e79f2b]/10 blur-3xl" />
            <Image
              src={logoUrl}
              alt="Milky Way Photographers Guild"
              width={900}
              height={450}
              priority
              className="h-auto w-full max-w-[38rem] drop-shadow-[0_28px_70px_rgba(0,0,0,0.42)] sm:max-w-[44rem] lg:max-w-[48rem] xl:max-w-[54rem]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[.32em] text-[#f4bd61]">
            What&apos;s coming
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
            Share your images, pass off achievements and earn Master Milky Way Photographer.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {whatsComing.map((item, index) => (
            <div className="card rounded-3xl p-6" key={item}>
              <p className="text-sm font-black text-[#f4bd61]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-5 text-xl font-bold leading-7 text-white">
                {item}
              </h3>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="starfield card mx-auto max-w-5xl rounded-[2rem] p-8 text-center sm:p-12">
          <p className="text-sm font-bold uppercase tracking-[.32em] text-[#f4bd61]">
            For now
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-xl leading-9 text-[#dbe5f1]">
            While the Guild is being rebuilt, you can still find all my photography content &amp;
            resources through the Photog Adventures YouTube &amp; Podcast.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a className="btn btn-primary" href="https://www.photogadventures.com">
              Go to Photog Adventures
            </a>
            <a className="btn btn-secondary" href="https://www.youtube.com/c/PhotogAdventures">
              YouTube
            </a>
            <a className="btn btn-ghost" href="https://soundcloud.com/user-407436417">
              Podcast
            </a>
          </div>
          <p className="mt-8 text-sm text-[#9fb0c0]">
            Questions? Contact Aaron at{" "}
            <a className="text-[#f4bd61] underline-offset-4 hover:underline" href="mailto:aaron@photogadventures.com">
              aaron@photogadventures.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
