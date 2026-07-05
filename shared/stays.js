// shared/stays.js
import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { calculateCycleStartDate, getCourt, getInnerSeason, getWing } from "./seasons.js";
import { getMoonMagic } from "./moon.js";

export const FLOWTEL_TIME_ZONE = "America/Los_Angeles";

export function getFlowtelDateISO(date = new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{
    timeZone:FLOWTEL_TIME_ZONE,
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).formatToParts(date).reduce((acc,part)=>{
    if(part.type!=="literal") acc[part.type]=part.value;
    return acc;
  },{});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function todayISO(){
  return getFlowtelDateISO();
}

function utcDateFromISO(iso){
  const [year,month,day]=String(iso||todayISO()).slice(0,10).split("-").map(Number);
  return Date.UTC(year,month-1,day);
}

function flowtelDateFromValue(value){
  if(!value) return "";
  const raw=String(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date=new Date(raw);
  if(Number.isNaN(date.getTime())) return raw.slice(0,10);
  return getFlowtelDateISO(date);
}

function stayCheckinDate(stay){
  return stay?.checkin_date || flowtelDateFromValue(stay?.checked_in_at || stay?.created_at);
}

function daysBetween(startDate,endDate){
  const a=utcDateFromISO(startDate), b=utcDateFromISO(endDate);
  return Math.max(1, Math.round((b-a)/86400000)+1);
}

export async function getOpenStaysForClient(clientId){
  const {data,error}=await supabase.from("flowtel_stays").select("*")
    .eq("client_id",clientId).is("checked_out_at",null)
    .order("checked_in_at",{ascending:false});
  if(error) throw error;
  return data || [];
}

export async function getOpenStayForClient(clientId){
  const stays=await getOpenStaysForClient(clientId);
  return stays[0] || null;
}


export async function getTodayStayForClient(clientId){
  const {data,error}=await supabase.from("flowtel_stays").select("*")
    .eq("client_id",clientId).eq("checkin_date",todayISO())
    .order("checked_in_at",{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  return data;
}

export async function autoCloseOpenStayIfNeeded(clientId){
  const openStays=await getOpenStaysForClient(clientId);
  if(!openStays.length) return null;

  const today=todayISO();
  const todaysOpenStay=openStays.find(stay=>stayCheckinDate(stay)===today);
  let lastClosed=null;

  const staleOpenStays=openStays.filter(stay=>stayCheckinDate(stay)!==today);
  for(const openStay of staleOpenStays){
    const now=new Date().toISOString();
    const {data,error}=await supabase.from("flowtel_stays").update({
      checked_out_at:now,
      stay_status:"checked_out",
      stay_end_type:"automatic",
      stay_length_days:daysBetween(stayCheckinDate(openStay),today),
      updated_at:now,
    }).eq("id",openStay.id).select().single();
    if(error) throw error;
    lastClosed=data;
  }

  return todaysOpenStay || lastClosed;
}

export async function createStay({cycleDay,feelsLike}){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  await autoCloseOpenStayIfNeeded(user.id);

  // Flowtel allows one stay per local calendar day.
  // If today's room already exists, return it rather than creating or reopening history.
  const existingToday=await getTodayStayForClient(user.id);
  if(existingToday) return existingToday;

  const innerSeason=getInnerSeason(cycleDay);
  const moon=getMoonMagic();
  const stay={
    client_id:user.id,
    checkin_date:todayISO(),
    cycle_day_claimed:Number(cycleDay),
    cycle_day_calculated:Number(cycleDay),
    cycle_start_date:calculateCycleStartDate(Number(cycleDay)),
    inner_season:innerSeason,
    feels_like_inner_season:feelsLike,
    wing:getWing(innerSeason),
    court:getCourt(innerSeason),
    moon_day:moon.moonDay,
    moon_phase:moon.phase,
    moon_inner_season:moon.innerSeason,
    moon_theme:moon.theme,
    stay_status:"arrived",
  };
  const {data,error}=await supabase.from("flowtel_stays")
    .insert(stay).select().single();
  if(error) throw error;
  return data;
}

export async function saveReflection(stayId, reflection){
  const cleaned=String(reflection||"").trim();
  if(!cleaned) throw new Error("Add a reflection before saving.");

  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const savedAt=new Date().toISOString();

  const { data:entry, error:entryError } = await supabase
    .from("flowtel_reflections")
    .insert({
      stay_id: stayId,
      client_id: user.id,
      reflection: cleaned,
      created_at: savedAt,
    })
    .select()
    .single();

  if(entryError) throw entryError;

  const {data,error}=await supabase.from("flowtel_stays").update({
    reflection: cleaned,
    stay_status:"settled",
    updated_at:savedAt
  }).eq("id",stayId).select().single();

  if(error) throw error;

  return { ...data, latest_reflection_entry: entry };
}

export async function closeStayPersonally(stayId, checkoutNotes=""){
  const {data:stay,error:stayError}=await supabase.from("flowtel_stays").select("*").eq("id",stayId).single();
  if(stayError) throw stayError;
  const {data,error}=await supabase.from("flowtel_stays").update({
    checkout_notes:checkoutNotes,
    checked_out_at:new Date().toISOString(),
    stay_status:"checked_out",
    stay_end_type:"manual",
    stay_length_days:daysBetween(stay.checkin_date,todayISO()),
    updated_at:new Date().toISOString(),
  }).eq("id",stayId).select().single();
  if(error) throw error;
  return data;
}

export async function clockInPractitioner(stay){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const clockedInAt=new Date().toISOString();

  const payload={
    practitioner_id:user.id,
    stay_id:stay?.id || null,
    clocked_in_at:clockedInAt,
    cycle_day_claimed:stay?.cycle_day_claimed || null,
    inner_season:stay?.inner_season || null,
    practitioner_wing:stay?.wing || null,
    assigned_wing:oppositeWing(stay?.wing),
    created_at:clockedInAt,
    updated_at:clockedInAt,
  };

  const {data,error}=await supabase
    .from("flowtel_practitioner_clock_sessions")
    .insert(payload)
    .select()
    .single();

  if(error) throw error;
  return data;
}

export async function clockOutPractitioner(clockSessionId){
  if(!clockSessionId) return null;
  const now=new Date().toISOString();
  const {data,error}=await supabase
    .from("flowtel_practitioner_clock_sessions")
    .update({clocked_out_at:now, updated_at:now})
    .eq("id",clockSessionId)
    .select()
    .single();

  if(error) throw error;
  return data;
}

function oppositeWing(wing){
  return {
    "East Wing":"West Wing",
    "West Wing":"East Wing",
    "North Wing":"South Wing",
    "South Wing":"North Wing",
  }[wing] || null;
}


export async function getPreviousVisits(clientId, roomNumber=null){
  let q=supabase.from("flowtel_stays").select("*").eq("client_id",clientId)
    .order("checkin_date",{ascending:false}).limit(80);
  if(roomNumber) q=q.eq("cycle_day_claimed",Number(roomNumber));
  const {data,error}=await q;
  if(error) throw error;

  const visits=data||[];
  const ids=visits.map(visit=>visit.id).filter(Boolean);
  if(!ids.length) return visits;

  const {data:reflectionRows,error:reflectionError}=await supabase
    .from("flowtel_reflections")
    .select("*")
    .in("stay_id",ids)
    .order("created_at",{ascending:true});

  if(reflectionError){
    console.warn("Reflection log lookup failed; falling back to stay reflection field.", reflectionError);
    return visits;
  }

  const grouped=(reflectionRows||[]).reduce((map,row)=>{
    if(!map[row.stay_id]) map[row.stay_id]=[];
    map[row.stay_id].push(row);
    return map;
  },{});

  return visits.map(visit=>({
    ...visit,
    reflections: grouped[visit.id] || [],
  }));
}


export async function markConciergeNotesRead(stayId, signature){
  const now=new Date().toISOString();
  const {data,error}=await supabase.from("flowtel_stays").update({
    concierge_notes_read_signature: signature || "",
    concierge_notes_read_at: now,
    updated_at: now,
  }).eq("id",stayId).select().single();

  if(error) throw error;
  return data;
}

export async function getFrontDeskStays(){
  const {data,error}=await supabase.from("flowtel_stays").select(`
    *,
    profiles:client_id (first_name,last_name,email,role), witness_profile:witnessed_by (first_name,last_name,email,role)
  `).order("checked_in_at",{ascending:false}).limit(500);
  if(error) throw error;
  return data||[];
}


function parseStoredConciergeNotes(raw, fallbackBy="", fallbackAt=""){
  if(!raw) return [];
  try{
    const parsed=JSON.parse(raw);
    if(Array.isArray(parsed)){
      return parsed.filter(Boolean);
    }
  }catch(error){}
  return [{
    id:`legacy-${Date.now()}`,
    note:String(raw),
    by:fallbackBy || "Your Concierge",
    at:fallbackAt || new Date().toISOString(),
  }];
}


export async function witnessStay(stayId,witnessNote=""){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  let practitionerLabel="";
  try{
    const {data:profile}=await supabase.from("profiles")
      .select("first_name,last_name,email,role")
      .eq("id",user.id)
      .single();
    const name=[profile?.first_name,profile?.last_name].filter(Boolean).join(" ") || profile?.email || "your Concierge";
    const level=profile?.role==="practitioner" ? "Practitioner" : "Concierge";
    practitionerLabel=`${level} ${name}`;
  }catch(error){
    practitionerLabel="Your Concierge";
  }

  const {data:existing,error:existingError}=await supabase.from("flowtel_stays")
    .select("witness_note,witness_note_by,witnessed_at,updated_at,turndown_status,turndown_requested_at")
    .eq("id",stayId)
    .single();
  if(existingError) throw existingError;

  const now=new Date().toISOString();
  const notes=parseStoredConciergeNotes(existing?.witness_note, existing?.witness_note_by, existing?.witnessed_at || existing?.updated_at);
  if(witnessNote){
    notes.push({
      id:`note-${now}`,
      note:witnessNote,
      by:practitionerLabel,
      at:now,
    });
  }

  const hadTurndownRequest=!!(existing?.turndown_requested_at || existing?.turndown_status==="requested");
  const updatePayload={
    witnessed_by:user.id,
    witnessed_at:now,
    witness_note:JSON.stringify(notes),
    witness_note_by:practitionerLabel,
    stay_status:"witnessed",
    updated_at:now,
  };

  if(hadTurndownRequest){
    updatePayload.turndown_status="completed";
  }

  const {data,error}=await supabase.from("flowtel_stays").update(updatePayload).eq("id",stayId).select().single();
  if(error) throw error;
  return data;
}


export async function prepareRoomAfterCheckout(stayId, practitionerLabel=""){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const now=new Date().toISOString();
  const note=practitionerLabel
    ? `${practitionerLabel} cleansed your space after your stay.`
    : "Concierge has cleansed your space.";

  const {data:existing,error:existingError}=await supabase.from("flowtel_stays")
    .select("witness_note,witness_note_by,witnessed_at,updated_at")
    .eq("id",stayId)
    .single();
  if(existingError) throw existingError;

  const notes=parseStoredConciergeNotes(existing?.witness_note, existing?.witness_note_by, existing?.witnessed_at || existing?.updated_at);
  notes.push({
    id:`cleanse-${now}`,
    note,
    by:practitionerLabel || "Your Concierge",
    at:now,
  });

  const {data,error}=await supabase.from("flowtel_stays").update({
    witnessed_by:user.id,
    witnessed_at:now,
    witness_note:JSON.stringify(notes),
    witness_note_by:practitionerLabel || "Your Concierge",
    stay_status:"witnessed",
    updated_at:now,
  }).eq("id",stayId).select().single();
  if(error) throw error;
  return data;
}
