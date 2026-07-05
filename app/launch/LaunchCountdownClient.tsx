"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getGuildLaunchDeadlineTime } from "@/lib/launch";

function getParts(distance: number) {
  const total = Math.max(0, distance);
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1_000) % 60),
  };
}

export function LaunchCountdownClient() {
  const deadline = useMemo(() => getGuildLaunchDeadlineTime(), []);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isOpen = now >= deadline;
  const parts = getParts(deadline - now);

  if (isOpen) {
    return (
      <div className="rounded-[2rem] border border-[#e79f2b]/35 bg-[#091625]/85 p-6 text-center shadow-2xl backdrop-blur md:p-8">
        <p className="mw-eyebrow">The Hall Is Open</p>
        <h2 className="mt-3 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
          The Guild is live.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/75">
          The countdown is complete. Come in, file a field report, vote for Image of the Week, and start your climb toward Master Milky Way Photographer.
        </p>
        <Link className="btn btn-primary mt-7" href="/">
          Enter the Guild Hall
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-5">
      {Object.entries(parts).map(([label, value]) => (
        <div key={label} className="border border-[#e79f2b]/35 bg-[#07111f]/80 p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,.35)] backdrop-blur-sm md:p-7">
          <div className="font-display text-5xl font-black leading-none text-[#f0bd66] md:text-7xl">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-2 font-display text-sm font-bold uppercase tracking-[.24em] text-white/65">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
