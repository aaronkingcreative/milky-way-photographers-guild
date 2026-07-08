import { adminFinalizeIotw } from "@/app/actions";
import { requireAdmin } from "@/lib/guards";
import { calculateIotwResults, formatMountainDeadline } from "@/lib/iotw";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data: ballots } = await supabase.from("iotw_ballots").select("*").order("period_start", { ascending: false }).limit(8);
  const ballot = ballots?.[0];
  let results: any[] = [];
  let votes: any[] = [];
  if (ballot) {
    const [{ data: entries }, { data: voteRows }] = await Promise.all([
      supabase.from("iotw_ballot_entries").select("field_report_id,user_id,field_reports(title,capture_date,country,region,guild_images(image_url),profiles(display_name,full_name,email))").eq("ballot_id", ballot.id),
      supabase.from("iotw_votes").select("first_place_field_report_id,second_place_field_report_id,third_place_field_report_id").eq("ballot_id", ballot.id),
    ]);
    votes = voteRows || [];
    results = calculateIotwResults((entries || []).map((row: any) => ({ field_report_id: row.field_report_id, user_id: row.user_id, title: row.field_reports?.title || "Untitled", image_url: row.field_reports?.guild_images?.image_url || null, photographer_name: row.field_reports?.profiles?.display_name || row.field_reports?.profiles?.full_name || "Guild photographer", capture_date: row.field_reports?.capture_date, location: [row.field_reports?.region, row.field_reports?.country].filter(Boolean).join(", ") })), votes);
  }
  return <section className="mx-auto max-w-7xl px-5 py-14"><h1 className="font-display text-4xl uppercase">Image of the Week Admin</h1>{!ballot ? <p className="mt-4 mw-muted">No ballots yet.</p> : <><div className="mw-admin-card mt-6 p-5"><p className="mw-eyebrow text-[#f0bd66]">{ballot.status}</p><p className="mt-2">Voting period, {formatMountainDeadline(ballot.voting_opens_at)} to {formatMountainDeadline(ballot.voting_closes_at)}</p><p className="mt-2">Contenders, {results.length}. Votes cast, {votes.length}.</p></div><div className="mt-6 overflow-x-auto mw-admin-card"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#2f445d]/35 font-display uppercase tracking-[.12em] text-[#f0bd66]"><tr><th className="p-3">Rank</th><th>Image</th><th>Photographer</th><th>Points</th><th>#1</th><th>#2</th><th>#3</th><th>Ballots</th><th>Tie breaker</th></tr></thead><tbody>{results.map((result) => <tr key={result.field_report_id} className="border-t border-white/10"><td className="p-3">{result.rank}</td><td><div className="flex items-center gap-3"><img src={result.image_url || ""} alt="" className="h-14 w-20 rounded object-cover"/><span>{result.title}</span></div></td><td>{result.photographer_name}</td><td>{result.total_points}</td><td>{result.first_place_count}</td><td>{result.second_place_count}</td><td>{result.third_place_count}</td><td>{result.total_ballots}</td><td>Points, #1 votes, ballots, #2 votes, admin tie-breaker</td></tr>)}</tbody></table></div><form action={adminFinalizeIotw} className="mw-admin-card mt-6 grid gap-4 p-5 md:grid-cols-2"><input type="hidden" name="ballot_id" value={ballot.id}/>{([ ["winner", "Winner"], ["second", "Second place"], ["third", "Third place"], ["phavorite", "Photog Phavorite"] ] as const).map(([name, label], index) => <label key={name} className="mw-submit-field-label">{label}<select name={name} className="mw-input mt-2" defaultValue={results[index]?.field_report_id || ""}><option value="">Select image</option>{results.map((result) => <option key={result.field_report_id} value={result.field_report_id}>{result.title} by {result.photographer_name}</option>)}</select></label>)}<label className="mw-submit-field-label md:col-span-2">Admin notes<textarea name="admin_notes" className="mw-input mt-2"/></label><button className="mw-btn-primary md:col-span-2">Finalize Image of the Week</button></form></>}</section>;
}
