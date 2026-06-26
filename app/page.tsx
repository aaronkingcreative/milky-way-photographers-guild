import Link from "next/link";

const whatsComing = [
  "Image sharing built for photographers",
  "Weekly Image of the Week voting",
  "Aaron’s Favorite weekly feature",
  "Milky Way planning resources",
  "Guild feedback and learning tools",
  "Future achievement badges for submitted images",
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      <section className="starfield relative px-5 py-20 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_18%,rgba(244,179,93,.18),transparent_22rem),radial-gradient(circle_at_24%_30%,rgba(87,125,178,.22),transparent_24rem)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.35em] text-amber-200">
              Milky Way Photographers Guild
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.95] tracking-tight text-white md:text-7xl">
              The Guild is being rebuilt.
            </h1>
            <p className="mt-6 max-w-3xl text-2xl leading-9 text-amber-100">
              A private image-first community for Milky Way photographers is
              coming soon.
            </p>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              I’m rebuilding the Milky Way Photographers Guild into a better
              home for sharing night-sky images, getting useful feedback,
              celebrating weekly image wins, and improving your Milky Way
              photography without ads or social media noise.
            </p>
            <p className="mt-5 text-lg font-semibold text-slate-100">
              Built by Aaron King of Photog Adventures.
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

          <div className="card relative min-h-[28rem] overflow-hidden rounded-[2rem] p-6">
            <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(8,13,23,.2),rgba(8,13,23,.88)_62%),radial-gradient(ellipse_at_48%_78%,rgba(232,121,62,.42),transparent_22rem),radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,.58),rgba(255,255,255,.08)_18%,transparent_38%)]" />
            <div className="absolute left-1/2 top-7 h-[26rem] w-28 -translate-x-1/2 rotate-[22deg] rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-0 right-0 h-36 bg-[linear-gradient(172deg,transparent_20%,rgba(7,10,16,.9)_21%),linear-gradient(90deg,rgba(244,179,93,.14),rgba(232,121,62,.2))]" />
            <div className="relative flex h-full min-h-[25rem] flex-col justify-between">
              <div className="w-fit rounded-full border border-amber-200/30 bg-black/25 px-4 py-2 text-sm font-bold uppercase tracking-[.24em] text-amber-100">
                Under construction
              </div>
              <div>
                <p className="max-w-sm text-3xl font-black leading-tight text-white">
                  A quieter home for night-sky photographers is on the way.
                </p>
                <p className="mt-4 max-w-md leading-7 text-slate-300">
                  For now, Photog Adventures is the best place for current
                  resources, workshops, videos, and updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[.32em] text-amber-200">
            What’s coming
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
            Built around images, learning, and the Milky Way.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {whatsComing.map((item, index) => (
            <div className="card rounded-3xl p-6" key={item}>
              <p className="text-sm font-black text-amber-200">
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
          <p className="text-sm font-bold uppercase tracking-[.32em] text-amber-200">
            For now
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-xl leading-9 text-slate-200">
            While the Guild is being rebuilt, you can still find my current
            photography resources, workshops, videos, and updates through
            Photog Adventures.
          </p>
          <a className="btn btn-primary mt-8" href="https://www.photogadventures.com">
            Go to Photog Adventures
          </a>
          <p className="mt-8 text-sm text-slate-400">
            Questions? Contact Aaron at{" "}
            <a className="text-amber-200 underline-offset-4 hover:underline" href="mailto:aaron@photogadventures.com">
              aaron@photogadventures.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
