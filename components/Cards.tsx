import Link from "next/link";
import { KeepTail } from "@/components/KeepTail";
export function FeatureCard({title,children}:{title:string;children:React.ReactNode}){return <div className="card rounded-2xl p-6"><h3 className="text-xl font-bold text-[#f4bd61]">{title}</h3><div className="mt-3 text-[#b8c4d4]">{children}</div></div>}
export function DashboardCard({title,href,children}:{title:string;href:string;children:string}){return <Link href={href} className="card block rounded-2xl p-6 transition hover:-translate-y-1 hover:border-[#e79f2b]/60"><h3 className="text-xl font-bold">{title}</h3><p className="mt-3 text-[#b8c4d4]">{children}</p></Link>}
export function AccessNeededPanel(){return <div className="card mx-auto max-w-3xl rounded-3xl p-8 text-center"><p className="eyebrow">Membership coming soon</p><p className="mt-3 text-2xl font-bold">Your account is set up, and Guild memberships are opening soon.</p><p className="mt-3 text-white/68">We will let you know as soon as you can join.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><a className="btn btn-secondary" href="mailto:aaron@photogadventures.com">Contact Aaron if you believe this is a mistake.</a></div></div>}
export function CourseLinkCard({title, body, image, featured}:{title:string; body:string; image:string; featured?:boolean}){
  return (
    <a href="https://onlinecourses.photogadventures.com" className={featured ? "mw-course-card is-featured" : "mw-course-card"}>
      <span className="mw-course-media">
        <img src={image} alt="" />
        <span className="mw-course-shade" aria-hidden="true" />
        {featured ? (
          <span className="mw-course-overlay">
            <span className="mw-course-kicker">Start here</span>
            <h3 className="mw-course-title">{title}</h3>
            <p className="mw-course-body"><KeepTail text={body} /></p>
          </span>
        ) : (
          <h3 className="mw-course-title">{title}</h3>
        )}
      </span>
      {featured ? null : (
        <span className="mw-course-copy">
          <p className="mw-course-body"><KeepTail text={body} /></p>
        </span>
      )}
    </a>
  );
}
export function WinnerPlaceholder({title}:{title:string}){return <div className="starfield card rounded-3xl p-8"><p className="text-sm uppercase tracking-[.25em] text-[#f4bd61]">Coming soon</p><h3 className="mt-16 text-2xl font-bold">{title}</h3></div>}
