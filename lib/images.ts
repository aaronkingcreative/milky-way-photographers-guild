export const REACTION_TYPES = [
  ['like','Like'],['love','Love'],['wow','Wow'],['envy','Envy'],['beautiful_sky','Beautiful sky'],['great_foreground','Great foreground'],['strong_composition','Strong composition'],['inspiring_adventure','Inspiring adventure'],['helpful_story','Helpful story']
] as const;
/** Sunday (YYYY-MM-DD) that opened the current Guild submission week. Weeks turn over Sunday 12:00 PM America/Denver, matching the IOTW entry week. */
export function getWeekStart(date = new Date()) { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(date).filter((x) => x.type !== "literal").map((x) => [x.type, x.value])); const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)); const dow = d.getUTCDay(); d.setUTCDate(d.getUTCDate() - dow - (dow === 0 && +p.hour < 12 ? 7 : 0)); return d.toISOString().slice(0,10); }
/**
 * Per-member cap on field reports in the current submission week
 * (Sunday 12:00 PM America/Denver through the next Sunday noon).
 *
 * Aaron temporarily lifted this for achievement catch-up during Milky Way Wednesday
 * (this week, and maybe next). `null` or `0` means unlimited.
 * Restore to `3` to bring the planned default back. One IOTW contender per member
 * per week, the Sunday noon close, voting, and achievement logic are unchanged.
 */
export const WEEKLY_SUBMISSION_LIMIT: number | null = null;

/** True when members may file as many field reports as they want this week. */
export function weeklySubmissionsUnlimited(limit: number | null = WEEKLY_SUBMISSION_LIMIT) {
  return limit == null || limit <= 0;
}

/** True when this member has used every slot for the week. Stays false while the cap is off. */
export function weeklySubmissionCapReached(filedThisWeek: number, limit: number | null = WEEKLY_SUBMISSION_LIMIT) {
  if (weeklySubmissionsUnlimited(limit) || limit == null) return false;
  return filedThisWeek >= limit;
}
export const COUNTRIES = [
 {name:'United States', regions:['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']},
 {name:'Canada', regions:['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon']},
 {name:'Australia', regions:['Australian Capital Territory','New South Wales','Northern Territory','Queensland','South Australia','Tasmania','Victoria','Western Australia']},
 {name:'New Zealand', regions:['Auckland','Canterbury','Otago','Southland','Waikato','Wellington']},
 {name:'United Kingdom', regions:['England','Northern Ireland','Scotland','Wales']},
 {name:'Netherlands', regions:['Drenthe','Flevoland','Friesland','Gelderland','Groningen','Limburg','North Brabant','North Holland','Overijssel','South Holland','Utrecht','Zeeland']},
 {name:'Iceland', regions:['Capital Region','Eastern Region','Northeastern Region','Northwestern Region','Southern Peninsula','Southern Region','Western Region','Westfjords']},
 {name:'Italy', regions:['Abruzzo','Lazio','Lombardy','Piedmont','Sardinia','Sicily','Tuscany','Veneto']},
 {name:'France', regions:['Auvergne-Rhône-Alpes','Brittany','Corsica','Île-de-France','Normandy','Occitanie','Provence-Alpes-Côte d’Azur']},
 {name:'Spain', regions:['Andalusia','Aragon','Asturias','Canary Islands','Catalonia','Galicia','Madrid','Valencian Community']},
 {name:'Chile', regions:['Antofagasta','Atacama','Coquimbo','Los Lagos','Magallanes','Metropolitana de Santiago','Valparaíso']},
 {name:'Argentina', regions:['Buenos Aires','Catamarca','Chubut','Mendoza','Neuquén','Río Negro','Santa Cruz','Tierra del Fuego']},
 {name:'South Africa', regions:['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape']},
 {name:'Other', regions:['Not applicable / No region listed']}
];
