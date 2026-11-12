import type { Metadata } from "next";
import Link from "next/link";
import { KeepTail } from "@/components/KeepTail";
import { ScenePage } from "@/components/ScenePage";
import { notFoundBody, notFoundTitle } from "@/lib/public-copy";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <ScenePage>
      <p className="mw-balance text-sm font-bold uppercase tracking-[.32em] text-[#f4bd61]">Page not found</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl"><KeepTail text={notFoundTitle} /></h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#e7eef6]"><KeepTail text={notFoundBody} /></p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link className="btn btn-secondary" href="/">
          Back to the Guild
        </Link>
        <Link className="btn btn-primary" href="/signup">
          Join free
        </Link>
      </div>
    </ScenePage>
  );
}
