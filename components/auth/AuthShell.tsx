import Image from "next/image";
import type { ReactNode } from "react";
import { KeepTail } from "@/components/KeepTail";

export function AuthShell({ eyebrow, title, intro, offer, children }: { eyebrow: string; title: string; intro?: string; offer?: readonly string[]; children: ReactNode }) {
  return (
    <section className="mw-public mw-join">
      <Image
        src="/join/island-in-the-sky-milky-way.jpg"
        alt="The Milky Way arching over Island in the Sky, Canyonlands"
        fill
        priority
        sizes="100vw"
        className="mw-join-photo"
      />
      <div className="mw-join-shade" aria-hidden="true" />
      <div className="mw-join-inner">
        <div className="mw-join-copy">
          <p className="mw-join-eyebrow"><KeepTail text={eyebrow} /></p>
          <h1 className="mw-join-title"><KeepTail text={title} /></h1>
          {offer && offer.length ? (
            <ul className="mw-join-offer">
              {offer.map((line) => (
                <li key={line}><KeepTail text={line} /></li>
              ))}
            </ul>
          ) : null}
          {intro ? <p className="mw-join-intro"><KeepTail text={intro} /></p> : null}
        </div>
        <div className="mw-join-form">{children}</div>
      </div>
      <p className="mw-join-credit"><KeepTail text="Island in the Sky, Canyonlands. Photo by Aaron King" /></p>
    </section>
  );
}
