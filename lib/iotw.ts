export type IotwEntry={field_report_id:string;title:string;image_url:string|null;photographer_name:string;user_id:string;capture_date?:string|null;location?:string|null};
export type IotwVote={first_place_field_report_id:string|null;second_place_field_report_id:string|null;third_place_field_report_id:string|null};
const TZ='America/Denver';
function parts(date:Date){const f=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',weekday:'short'});return Object.fromEntries(f.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}
function mtToUtc(y:number,m:number,d:number,h=12){const target=Date.UTC(y,m-1,d,h,0,0);let utc=new Date(target);for(let i=0;i<3;i++){const p=parts(utc);const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);if(wall===target)break;utc=new Date(utc.getTime()+(target-wall));}return utc;}
// Image of the Week runs in two overlapping phases (Aaron, Nov 1, 2026).
// A ballot is keyed by the Sunday 12:00 PM MT when its entries close (period_start).
//   Entries: the previous Sunday 12:00 PM MT until period_start ("upcoming").
//   Voting:  period_start until the next Sunday 12:00 PM MT, period_end ("voting_open").
// So one week's entries are always being voted on while the next week's entries come in.
// Each contest is numbered by the ISO week of its submission week (the Mon to Sun week that ends on the closing Sunday).
// public.iotw_entry_week_sunday(), public.iotw_advance_ballots() and the contest_week trigger mirror this in SQL.
function denverSunday(now:Date){const p=parts(now);const dow=new Date(Date.UTC(+p.year,+p.month-1,+p.day)).getUTCDay();return new Date(Date.UTC(+p.year,+p.month-1,+p.day-dow));}
/** ISO week and ISO year of the Mountain-time calendar day of an instant. */
export function iotwContestWeek(iso:string){const p=parts(new Date(iso));const d=new Date(Date.UTC(+p.year,+p.month-1,+p.day));const dow=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-dow);const year=d.getUTCFullYear();const week=Math.ceil(((d.getTime()-Date.UTC(year,0,1))/86400000+1)/7);return{week,year};}
/** "Week 45" for a ballot row or period (uses the stored contest_week when present). */
export function iotwWeekLabel(b:{contest_week?:number|null;submission_cutoff?:string|null;period_start?:string|null}|null|undefined){if(!b)return'';const w=b.contest_week||iotwContestWeek((b.submission_cutoff||b.period_start)!).week;return`Week ${w}`;}
/** Strip a leading "Week " so "Image of the Week" is not followed by another Week. */
export function iotwWeekNumber(label:string|null|undefined){return String(label||"").replace(/^Week\s+/i,"").trim();}
export function imageOfTheWeekName(label:string|null|undefined){const week=iotwWeekNumber(label);return week?`Image of the Week ${week}`:"Image of the Week";}
/** Calendar parts in America/Denver for a computed close, never a hardcoded date. */
export function formatMountainDateParts(iso:string){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).formatToParts(new Date(iso)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const dayPeriod=(parts.dayPeriod||'').toUpperCase();
  const time=keepTimeTogether(`${parts.hour}:${parts.minute}${dayPeriod?` ${dayPeriod}`:''} ${parts.timeZoneName||''}`.replace(/\s+/g,' ').trim());
  return {weekday:parts.weekday,month:parts.month,day:parts.day,time,headline:`${parts.month}\u00A0${parts.day}`};
}
function ballotFor(sunday:Date,now:Date){const start=mtToUtc(sunday.getUTCFullYear(),sunday.getUTCMonth()+1,sunday.getUTCDate(),12);const end=mtToUtc(sunday.getUTCFullYear(),sunday.getUTCMonth()+1,sunday.getUTCDate()+7,12);const{week,year}=iotwContestWeek(start.toISOString());return{period_start:start.toISOString(),period_end:end.toISOString(),submission_cutoff:start.toISOString(),voting_opens_at:start.toISOString(),voting_closes_at:end.toISOString(),contest_week:week,contest_year:year,status:(now<start?'upcoming':now<end?'voting_open':'voting_closed') as string};}
/** The ballot whose voting is open right now (its entries closed at the most recent Sunday 12:00 PM MT). */
export function getIotwPeriod(now=new Date()){const s=denverSunday(now);const b=ballotFor(s,now);if(now>=new Date(b.period_start))return b;return ballotFor(new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),s.getUTCDate()-7)),now);}
/** The ballot taking entries right now (its entries close at the next Sunday 12:00 PM MT). */
export function getIotwTargetPeriod(now=new Date()){const s=denverSunday(now);const b=ballotFor(s,now);if(now<new Date(b.period_start))return b;return ballotFor(new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),s.getUTCDate()+7)),now);}
/** The ballot new contenders join right now, with its stored contest number when the row exists. */
type IotwScheduleRow={id:string|null;contest_week:number|null;contest_year:number|null;status:string;period_start:string;period_end?:string;submission_cutoff:string;voting_opens_at:string;voting_closes_at:string};
function sameInstant(a?:string|null,b?:string|null){if(!a||!b)return false;return new Date(a).getTime()===new Date(b).getTime();}
function isOpenVotingWindow(row:IotwScheduleRow,now:Date){const t=now.getTime();return t>=new Date(row.voting_opens_at).getTime()&&t<new Date(row.voting_closes_at).getTime();}
async function loadIotwScheduleRows(supabase:any):Promise<IotwScheduleRow[]>{
  const rpc=await supabase.rpc('iotw_schedule_ballots');
  if(!rpc?.error&&Array.isArray(rpc?.data))return rpc.data as IotwScheduleRow[];
  const{data}=await supabase.from('iotw_ballots').select('id,contest_week,contest_year,status,period_start,period_end,submission_cutoff,voting_opens_at,voting_closes_at').in('status',['upcoming','voting_open']);
  return(data||[]) as IotwScheduleRow[];
}
export async function getIotwEntryPeriod(supabase:any, now=new Date()){
  const target=getIotwTargetPeriod(now);
  const rows=await loadIotwScheduleRows(supabase);
  const data=rows.find((r)=>sameInstant(r.period_start,target.period_start))||rows.find((r)=>r.status==='upcoming')||null;
  return{...target,id:(data?.id as string|undefined)||null,contest_week:data?.contest_week||target.contest_week,contest_year:data?.contest_year||target.contest_year};
}
/** The mandatory vote gate only applies to an open ballot that offers a real choice (2 or more images by other members). */
export function iotwVoteIsRequired(ballot:{status?:string|null;voting_opens_at?:string|null},eligibleCount:number,now=new Date()){if(eligibleCount<2)return false;if(ballot.status&&ballot.status!=='voting_open')return false;if(ballot.voting_opens_at&&now<new Date(ballot.voting_opens_at))return false;return true;}
function keepTimeTogether(text:string){return text.replace(/(\d{1,2}:\d{2})\s(AM|PM)\s(M[DS]T)/,"$1\u00A0$2\u00A0$3");}
/** Keep the month and day on one line, so "Nov 15" never wraps as "Nov / 15". */
function keepMonthDayTogether(text:string){return text.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})\b/g,"$1\u00A0$2");}
function formatMountainLine(iso:string,options:Intl.DateTimeFormatOptions){return keepTimeTogether(keepMonthDayTogether(new Intl.DateTimeFormat('en-US',{timeZone:TZ,...options}).format(new Date(iso))));}
export function formatMountainDeadline(iso:string){return formatMountainLine(iso,{weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});}
export function calculateIotwResults(entries:IotwEntry[],votes:IotwVote[]){const map=new Map(entries.map(e=>[e.field_report_id,{...e,total_points:0,first_place_count:0,second_place_count:0,third_place_count:0,total_ballots:0}]));for(const v of votes){const seen=new Set<string>();[[v.first_place_field_report_id,3,'first_place_count'],[v.second_place_field_report_id,2,'second_place_count'],[v.third_place_field_report_id,1,'third_place_count']].forEach(([id,pts,key])=>{if(typeof id==='string'&&!seen.has(id)){const r=map.get(id);if(r){(r as any).total_points+=pts;(r as any)[key as string]+=1;seen.add(id);}}});for(const id of seen){const r=map.get(id);if(r)r.total_ballots+=1;}}return [...map.values()].sort((a,b)=>b.total_points-a.total_points||b.total_ballots-a.total_ballots||b.first_place_count-a.first_place_count||b.second_place_count-a.second_place_count||a.title.localeCompare(b.title)).map((r,i)=>({...r,rank:i+1}));}
export type IotwScheduleWeek={id:string|null;label:string;contest_week:number;entries_close_at:string;voting_opens_at:string;voting_closes_at:string;status:string};
/** Both phases that run at once: the week taking entries and the week being voted on (null before the first vote opens). */
export async function getIotwSchedule(supabase:any,now=new Date()){
  const rows=await loadIotwScheduleRows(supabase);
  const entryPeriod=getIotwTargetPeriod(now);
  const votingRow=rows.find((r)=>r.status==='voting_open'&&isOpenVotingWindow(r,now))||rows.find((r)=>isOpenVotingWindow(r,now))||null;
  const entryRow=rows.find((r)=>r!==votingRow&&r.status==='upcoming')||rows.find((r)=>sameInstant(r.period_start,entryPeriod.period_start))||null;
  const entry:IotwScheduleWeek={
    id:entryRow?.id||null,
    label:`Week ${entryRow?.contest_week||entryPeriod.contest_week}`,
    contest_week:entryRow?.contest_week||entryPeriod.contest_week,
    entries_close_at:entryRow?new Date(entryRow.submission_cutoff).toISOString():entryPeriod.submission_cutoff,
    voting_opens_at:entryRow?new Date(entryRow.voting_opens_at).toISOString():entryPeriod.voting_opens_at,
    voting_closes_at:entryRow?new Date(entryRow.voting_closes_at).toISOString():entryPeriod.voting_closes_at,
    status:entryRow?.status||'upcoming',
  };
  const voting:IotwScheduleWeek|null=votingRow?{
    id:votingRow.id,
    label:iotwWeekLabel(votingRow),
    contest_week:votingRow.contest_week||iotwContestWeek(votingRow.submission_cutoff||votingRow.period_start).week,
    entries_close_at:new Date(votingRow.submission_cutoff).toISOString(),
    voting_opens_at:new Date(votingRow.voting_opens_at).toISOString(),
    voting_closes_at:new Date(votingRow.voting_closes_at).toISOString(),
    status:votingRow.status,
  }:null;
  return{entry,voting};
}
/** Short Mountain time, e.g. "Sun, Nov 15, 12:00 PM MST", with the clock kept on one line. */
export function formatMountainShort(iso:string){return formatMountainLine(iso,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});}

/** Confirmation after a member locks a ballot. The deadline is the ballot's own close, in America/Denver. */
export function voteLockConfirmation(placeCount: number, closesAt: string) {
  const count = Math.max(1, Math.min(3, Math.trunc(placeCount) || 1));
  return `Your Top ${count} is locked in. You can change it until ${formatMountainShort(closesAt)}.`;
}
