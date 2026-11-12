import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KeepTail } from "@/components/KeepTail";
import { keepLastTwo } from "@/lib/keep-last-two";
import { RankLadder } from "@/components/RankLadder";
import { PublicShowcase } from "@/components/PublicShowcase";
import { isBeforeGuildLaunch } from "@/lib/launch";
import {
  afterFeaturesLead,
  closingLead,
  feedbackExampleBody,
  feedbackExampleDisclaimer,
  feedbackExampleTitle,
  homeFeatures,
  contactLead,
  homeHeadline,
  homeLead,
  homeSectionTitle,
} from "@/lib/public-copy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const heroPhoto = "/join/island-in-the-sky-milky-way.jpg";

/** Keep "photographers" whole. The rest of the sentence still wraps, and KeepTail holds the ending together. */
function HomeLead({ text }: { text: string }) {
  const marker = "photographers";
  const at = text.indexOf(marker);
  if (at < 0) return <KeepTail text={text} />;
  const before = text.slice(0, at).trimEnd();
  let rest = text.slice(at + marker.length);
  let period = "";
  if (rest.startsWith(".")) {
    period = ".";
    rest = rest.slice(1).trimStart();
  }
  return (
    <>
      <KeepTail text={before} /> <span className="mw-unbreakable">{`${marker}${period}`}</span>{rest ? <> <KeepTail text={rest} /></> : null}
    </>
  );
}

export default async function Home() {
  if (isBeforeGuildLaunch()) {
    redirect("/launch");
  }

  // Signed-in members go straight to the Guild Hall. The landing page is for visitors.
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/guild-hall");

  return (
    <div className="mw-public">
      <section className="starfield relative px-3 py-20 min-[380px]:px-5 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_18%,rgba(231,159,43,.20),transparent_22rem),radial-gradient(circle_at_24%_30%,rgba(47,68,93,.44),transparent_24rem)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.86fr_1.14fr] xl:grid-cols-[.8fr_1.2fr]">
          <div className="lg:col-span-2">
            <p className="mw-brand-eyebrow mw-balance text-sm font-bold uppercase tracking-[.35em] text-[#f4bd61]">
              Milky Way Photographers Guild
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.95] tracking-tight text-white md:text-7xl">
              <KeepTail text={homeHeadline} />
            </h1>
          </div>
          <div className="lg:-ml-2">
            <p className="mt-6 max-w-3xl text-2xl leading-9 text-[#f4bd61] lg:mt-0">
              <HomeLead text={homeLead} />
            </p>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#b8c4d4]">
              <KeepTail text="I rebuilt the Milky Way Photographers Guild into a better home for sharing your night-sky images." />
            </p>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#b8c4d4]">
              <KeepTail text="Members vote on each other's images to find the Image of the Week, and I celebrate weekly winners with a Monday Moment of Envy." />
            </p>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#b8c4d4]">
              <KeepTail text="You still get useful feedback, and a way to improve your Milky Way photography without ads or social media noise." />
            </p>
            <p className="mt-5 text-lg font-semibold text-white">
              <KeepTail text="Aaron King of Photog Adventures." />
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link className="btn btn-primary" href="/signup">
                Join the Guild free
              </Link>
              <Link className="btn btn-ghost" href="/login">
                Member sign in
              </Link>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-[44rem] lg:max-w-none lg:justify-self-end">
            <Image
              src={heroPhoto}
              alt="The Milky Way over Island in the Sky in Canyonlands"
              width={2000}
              height={1125}
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="h-auto w-full rounded-md border border-white/15 object-cover shadow-[0_28px_70px_rgba(0,0,0,0.42)]"
            />
            <figcaption className="mt-3 text-base leading-6 text-[#f4f7fb]">
              <KeepTail text="Island in the Sky, Canyonlands. Photo by Aaron King" />
            </figcaption>
          </figure>
        </div>
      </section>

      <Suspense fallback={null}>
        <PublicShowcase />
      </Suspense>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="mw-balance text-sm font-bold uppercase tracking-[.32em] text-[#f4bd61]">
            Inside the Guild
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
            <KeepTail text={homeSectionTitle} />
          </h2>
        </div>
        <div className="mw-inside">
          <div className="mw-inside-lead">
            {homeFeatures.slice(0, 2).map((item, index) => (
              <article className="mw-inside-feature" key={item.title}>
                <p className="mw-inside-num">{String(index + 1).padStart(2, "0")}</p>
                <div>
                  <h3><KeepTail text={item.title} /></h3>
                  <p className="mw-copy-natural">{item.body}</p>
                </div>
              </article>
            ))}
            <aside className="mw-inside-quote" aria-labelledby="feedback-example-title">
              <p id="feedback-example-title" className="mw-inside-quote-kicker">
                <KeepTail text={feedbackExampleTitle} />
              </p>
              <p className="mw-inside-quote-note mw-copy-natural">{keepLastTwo(feedbackExampleDisclaimer)}</p>
              <blockquote className="mw-copy-natural">
                {feedbackExampleBody}
              </blockquote>
            </aside>
          </div>
          <div className="mw-inside-list">
            {homeFeatures.slice(2).map((item, index) => (
              <article className="mw-inside-item" key={item.title}>
                <p className="mw-inside-num">{String(index + 3).padStart(2, "0")}</p>
                <div>
                  <h3><KeepTail text={item.title} /></h3>
                  <p className="mw-copy-natural">{item.body}</p>
                  {item.title === "Ranks" ? <RankLadder /> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-10">
          <p className="max-w-2xl text-lg leading-8 text-[#e7eef6]"><KeepTail text={afterFeaturesLead} /></p>
          <Link className="btn btn-primary mt-5" href="/signup">
            Join the Guild free
          </Link>
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="starfield card mx-auto max-w-5xl rounded-[2rem] p-8 text-center sm:p-12">
          <p className="mw-balance text-sm font-bold uppercase tracking-[.32em] text-[#f4bd61]">
            More from Aaron
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-xl leading-9 text-[#e7eef6]"><KeepTail text={closingLead} /></p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link className="btn btn-primary" href="/signup">
              Join the Guild free
            </Link>
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[#dbe5f1]">
            <KeepTail text={"You can also find all my photography content and resources through the Photog\u00A0Adventures YouTube and Podcast."} />
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a className="btn btn-ghost" href="https://www.youtube.com/c/PhotogAdventures">
              YouTube
            </a>
            <a className="btn btn-ghost" href="https://soundcloud.com/user-407436417">
              Podcast
            </a>
            <a className="btn btn-ghost" href="https://www.photogadventures.com">
              Photog&nbsp;Adventures
            </a>
          </div>
          <p className="mt-8 text-base text-[#d5deea]">
            <KeepTail text={contactLead} />
          </p>
          <p className="mt-2 text-base">
            <a className="text-[#f4bd61] underline-offset-4 hover:underline" href="mailto:aaron@photogadventures.com">
              aaron@photogadventures.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
