import Image from "next/image";
import Link from "next/link";
import { GUILD_LAUNCH_DEADLINE } from "@/lib/launch";
import { LaunchCountdownClient } from "./LaunchCountdownClient";

const workshops = [
  ["Oregon Coast Vertical Milky Way", "August 9 to 16, 2026", "Oregon Coast", "Vertical Milky Way"],
  ["Southern Utah Late Season Vertical Milky Way", "September 4 to 6, 2026", "Southern Utah", "Late season"],
  ["Southern Utah Winter + Early Summer MW Panoramas", "February 8 to 10, 2027", "Southern Utah", "Panoramas"],
  ["Death Valley Winter + Summer Milky Way", "February 12 to 15, 2027", "Death Valley", "Winter + summer"],
  ["Lofoten Landscapes & Aurora Adventure", "March 5 to 12, 2027", "Lofoten", "Aurora"],
  ["Bisti Badlands Winter & Summer Milky Way Panorama", "April 3 to 10, 2027", "Bisti Badlands", "Panorama"],
  ["Southern Utah Opening Summer MW Panorama", "May 27 to June 3, 2027", "Southern Utah", "Opening summer"],
  ["Faroe Islands Summer Puffins & Landscapes Adventure", "July 14 to 21, 2027", "Faroe Islands", "Puffins + landscapes"],
  ["Oregon Coast Vertical Milky Way", "August 1 to 8, 2027", "Oregon Coast", "Vertical Milky Way"],
];

const honors = ["Decade of Dark", "Year Streak", "Month Streak", "Galactic Core", "Natural Arch", "Panorama", "Reflections", "Winter Milky Way"];

export default function LaunchPage() {
  return (
    <div className="overflow-hidden bg-[#050d18] text-white">
      <section className="relative min-h-[92vh] px-5 py-20 md:py-28">
        <Image src="/launch/mwpg/AaronKing_SaltFlatsPano_PhotogAdventures.jpg" alt="Milky Way arch over the Bonneville Salt Flats" fill priority className="object-cover opacity-55" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,13,24,.48),rgba(5,13,24,.38)_38%,rgba(5,13,24,.96))]" />
        <div className="absolute inset-0 bg-[radial-gradient(1px_1px_at_12%_18%,rgba(255,255,255,.8),transparent),radial-gradient(1px_1px_at_78%_12%,rgba(255,255,255,.6),transparent),radial-gradient(1px_1px_at_40%_32%,rgba(255,255,255,.55),transparent),radial-gradient(1px_1px_at_90%_40%,rgba(255,255,255,.45),transparent),radial-gradient(1px_1px_at_22%_60%,rgba(255,255,255,.5),transparent)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center text-center">
          <Image src="/launch/mwpg/MWPG_Logo-ed9aab66.png" alt="Milky Way Photographers Guild" width={360} height={180} className="h-auto w-64 drop-shadow-2xl md:w-80" />
          <p className="mt-8 font-display text-sm font-bold uppercase tracking-[.34em] text-[#f0bd66]">The Guild Is Almost Open</p>
          <h1 className="mt-5 max-w-5xl font-display text-6xl font-black uppercase leading-[.86] tracking-tight text-white md:text-8xl lg:text-9xl">
            Something is rising in the dark.
          </h1>
          <p className="mt-7 max-w-3xl text-xl leading-9 text-white/82 md:text-2xl">
            The new Milky Way Photographers Guild goes fully live Monday, July 6 at 12:00 Noon Pacific. Community gallery, ranks, field reports, and the hunt for Image of the Week, all in one place.
          </p>
          <div className="mt-10 w-full max-w-4xl"><LaunchCountdownClient /></div>
          <p className="mt-7 font-display text-lg font-bold uppercase tracking-[.18em] text-[#f0bd66]">Monday, July 6, 2026 at 12:00 Noon Pacific</p>
          <p className="mt-2 text-sm text-white/55">Deadline source: {GUILD_LAUNCH_DEADLINE}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
        <div>
          <p className="mw-eyebrow">The Guild Hall</p>
          <h2 className="mt-3 font-display text-5xl font-black uppercase leading-none md:text-7xl">The Hall Is Open.</h2>
          <p className="mt-6 text-lg leading-8 text-white/72">Every guildie gets a shared home for field reports, useful reactions, weekly voting, and a visible climb toward Master. It is built for photographers who would rather learn from the night than chase another social feed.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="mw-card-gold p-6"><p className="mw-eyebrow">The Ascent</p><h3 className="mt-3 text-2xl font-black">Every climb on one board</h3><p className="mt-4 text-white/70">Unranked, Beginner, Amateur, Novice, Veteran, and Master, with real progress tied to the work you share.</p></div>
          <div className="mw-card p-6"><p className="mw-eyebrow">Hall of Envy</p><h3 className="mt-3 text-2xl font-black">Image of the Week</h3><p className="mt-4 text-white/70">Members vote each week, and Aaron picks a favorite for the Monday Moment of Envy.</p></div>
          <Image src="/launch/mwpg/NewZealand-Pano-MidEdit.jpg" alt="Milky Way panorama" width={760} height={430} className="md:col-span-2 h-72 w-full rounded-sm border border-white/10 object-cover shadow-2xl" />
        </div>
      </section>

      <section className="bg-[#091625] px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mw-eyebrow">Your Field Desk</p>
          <h2 className="mt-3 font-display text-5xl font-black uppercase leading-none md:text-7xl">A story, not just a photo.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {["File a Field Report with gear, settings, and the adventure behind the image.", "Earn achievements for seasons, foregrounds, techniques, and grand feats.", "Get reactions that say something useful: Beautiful Sky, Envy, Great Foreground, and more."].map((text) => <div className="mw-card p-6" key={text}><p className="text-lg leading-8 text-white/76">{text}</p></div>)}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">{honors.map((honor) => <span className="rounded-full border border-[#e79f2b]/30 bg-[#e79f2b]/10 px-4 py-2 font-display text-sm uppercase tracking-wider text-[#f0bd66]" key={honor}>{honor}</span>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
          <div><p className="mw-eyebrow">Launch-Week Offer</p><h2 className="mt-3 font-display text-5xl font-black uppercase leading-none md:text-7xl">Ready to shoot it yourself?</h2><p className="mt-6 text-lg leading-8 text-white/72">Join Aaron on a Milky Way workshop before the crowds catch on. Through midnight Pacific, July 6, take $200 off any workshop, from $700 down to $500.</p><a className="btn btn-primary mt-8" href="https://workshops.photogadventures.com">Claim $200 Off Workshops</a></div>
          <div className="overflow-hidden border border-[#e79f2b]/25 bg-[#0b1a2b]/90 shadow-2xl">
            {workshops.map(([name, dates, location, type]) => <div className="grid gap-2 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-[1.4fr_.9fr_.7fr_.8fr] md:items-center" key={`${name}-${dates}`}><strong className="font-display text-lg uppercase text-white">{name}</strong><span className="text-[#f0bd66]">{dates}</span><span className="text-white/65">{location}</span><span className="text-white/55">{type}</span></div>)}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20"><div className="mx-auto max-w-5xl rounded-[2rem] border border-[#e79f2b]/30 bg-[linear-gradient(135deg,rgba(231,159,43,.15),rgba(13,30,48,.92))] p-8 text-center shadow-2xl md:p-12"><p className="mw-eyebrow">MilkyWayPhotographersGuild.com</p><h2 className="mt-3 font-display text-4xl font-black uppercase md:text-6xl">See you in the Guild Hall.</h2><p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/75">Bring your best night sky stories, your field notes, and the images you want the Guild to see first.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link className="btn btn-secondary" href="/login">Member sign in</Link><a className="btn btn-ghost" href="https://www.photogadventures.com">Photog Adventures</a></div></div></section>
    </div>
  );
}
