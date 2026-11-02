"use client";
export function OpenVoteButton({ className = "", label = "Vote for This Image" }: { className?: string; label?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("mw:open-iotw"))}>{label}</button>;
}
