"use client";
export function OpenVoteButton({ className = "" }: { className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("mw:open-iotw"))}>Vote for This Image</button>;
}
