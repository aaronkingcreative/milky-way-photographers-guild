import Image from "next/image";
import type { ReactNode } from "react";

export function AuthShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section className="mw-join">
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
          <p className="mw-join-eyebrow">{eyebrow}</p>
          <h1 className="mw-join-title">{title}</h1>
          <p className="mw-join-intro">{intro}</p>
        </div>
        <div className="mw-join-form">{children}</div>
      </div>
      <p className="mw-join-credit">Island in the Sky, Canyonlands. Photo by Aaron King</p>
    </section>
  );
}
