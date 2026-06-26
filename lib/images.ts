export const REACTION_TYPES = [
  ['like','Like'],['love','Love'],['wow','Wow'],['envy','Envy'],['beautiful_sky','Beautiful sky'],['great_foreground','Great foreground'],['strong_composition','Strong composition'],['inspiring_adventure','Inspiring adventure'],['helpful_story','Helpful story']
] as const;
export function getWeekStart(date = new Date()) { const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0,10); }
export const SUBMISSION_LIMIT = 3;
export const COUNTRIES = [
 {name:'United States', regions:['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Florida','Georgia','Idaho','Maine','Michigan','Montana','Nevada','New Mexico','New York','North Carolina','Oregon','Pennsylvania','Texas','Utah','Washington','Wyoming']},
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
