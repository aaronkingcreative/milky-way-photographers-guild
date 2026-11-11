"use client";
import { useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/images";

/**
 * Country and region pickers. The region starts empty ("Choose...") so nobody ends up in Alabama by accident,
 * and a saved value that is not in the list is kept as its own option instead of silently becoming the first one.
 */
export function LocationSelects({ defaults, required = false }: { required?: boolean; defaults?: { country?: string | null; state_or_province?: string | null; specific_location_name?: string | null } }) {
  const initialCountry = defaults?.country || (required ? COUNTRIES[0].name : "");
  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState(defaults?.state_or_province || "");
  const listed = useMemo(() => (country ? COUNTRIES.find((c) => c.name === country)?.regions || ["Not applicable / No region listed"] : []), [country]);
  const regions = region && !listed.includes(region) && country === initialCountry ? [region, ...listed] : listed;
  const countries = country && !COUNTRIES.some((c) => c.name === country) ? [country, ...COUNTRIES.map((c) => c.name)] : COUNTRIES.map((c) => c.name);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <label className="mw-submit-field-label">Country<select className="mw-input mt-2" name="country" required={required} value={country} onChange={(e) => { setCountry(e.target.value); setRegion(""); }}>{!country || !required ? <option value="">Choose a country</option> : null}{countries.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="mw-submit-field-label">State / province / region<select className="mw-input mt-2" name="state_or_province" required={required} value={region} onChange={(e) => setRegion(e.target.value)} disabled={!country}><option value="">{country ? (country === "United States" ? "Choose a state" : "Choose a region") : "Choose a country first"}</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
      <label className="mw-submit-field-label">Specific location <span>(optional)</span><input className="mw-input mt-2" name="specific_location_name" defaultValue={defaults?.specific_location_name || ""} placeholder="Mesa Arch, Southern Utah..." /></label>
    </div>
  );
}
