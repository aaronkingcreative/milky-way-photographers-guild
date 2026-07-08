"use client";
import { useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/images";

export function LocationSelects({ defaults }: { defaults?: { country?: string | null; state_or_province?: string | null; specific_location_name?: string | null } }) {
  const [country, setCountry] = useState(defaults?.country || COUNTRIES[0].name);
  const regions = useMemo(() => COUNTRIES.find((c) => c.name === country)?.regions || ["Not applicable / No region listed"], [country]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <label className="mw-submit-field-label">Country<select className="mw-input mt-2" name="country" value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></label>
      <label className="mw-submit-field-label">State / province / region<select className="mw-input mt-2" name="state_or_province" defaultValue={defaults?.state_or_province || regions[0]}>{regions.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label className="mw-submit-field-label">Specific location <span>(optional)</span><input className="mw-input mt-2" name="specific_location_name" defaultValue={defaults?.specific_location_name || ""} placeholder="Mesa Arch, Southern Utah..." /></label>
    </div>
  );
}
