import Image from "next/image";
import type { ReactNode } from "react";
import { KeepTail } from "@/components/KeepTail";

const scenePhoto = "/join/island-in-the-sky-milky-way.jpg";

export function ScenePage({ children }: { children: ReactNode }) {
  return (
    <section className="mw-public mw-scene">
      <Image
        src={scenePhoto}
        alt="The Milky Way arching over Island in the Sky, Canyonlands"
        fill
        priority
        sizes="100vw"
        className="mw-scene-photo"
      />
      <div className="mw-scene-shade" aria-hidden="true" />
      <div className="mw-scene-inner">{children}</div>
      <p className="mw-scene-credit"><KeepTail text="Island in the Sky, Canyonlands. Photo by Aaron King" /></p>
    </section>
  );
}
