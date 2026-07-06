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

function calendarDaysBetween(startDate,endDate){
  const a=utcDateFromISO(startDate), b=utcDateFromISO(endDate);
  return Math.round((b-a)/86400000);
}

function singularizeDay(count){
  return Number(count)===1 ? "day" : "days";
}

function cycleAccuracyMessage({actualDay, recordedDay, difference, resetType}){
  if(resetType==="day_one"){
    return "Permission to play hooky today.";
  }

  if(resetType==="confirmed_new_cycle"){
    return `Welcome back. Your new cycle has been confirmed. You are on Day ${actualDay}.`;
  }

  if(resetType==="inferred_new_cycle"){
    return `Welcome back. It looks like a new cycle began while you were away. You are on Day ${actualDay}.`;
  }

  if(difference===0){
    return `You nailed it. You are on Day ${actualDay}.`;
  }

  const distance=Math.abs(difference);
  if(difference>0){
    return `Your mind is ${distance} ${singularizeDay(distance)} ahead of your body. You are actually on Day ${actualDay}.`;
  }

  return `Your mind is ${distance} ${singularizeDay(distance)} behind your body. You are actually on Day ${actualDay}.`;
}

function cycleMatchStatus(difference,resetType){
  if(resetType==="day_one") return "new_cycle_day_one";
  if(resetType==="confirmed_new_cycle") return "confirmed_new_cycle";
  if(resetType==="inferred_new_cycle") return "inferred_new_cycle";
  if(difference===0) return "matched";
  return difference>0 ? "recorded_ahead" : "recorded_behind";
}

async function getPreviousCycleContext(clientId){
  const today=todayISO();
  const {data,error}=await supabase
    .from("flowtel_stays")
    .select("id, checkin_date, checked_in_at, cycle_start_date, cycle_day_claimed, cycle_day_calculated")
    .eq("client_id",clientId)
    .lt("checkin_date",today)
    .order("checkin_date",{ascending:false})
    .order("checked_in_at",{ascending:false})
    .limit(1);

  if(error) throw error;
  return (data||[])[0] || null;
}

async function resolveCycleIntelligence(clientId, recordedDay, options={}){
  const recorded=Number(recordedDay);
  const today=todayISO();
  const inferredStartFromRecorded=calculateCycleStartDate(recorded);
  const previous=await getPreviousCycleContext(clientId);
  const previousStart=previous?.cycle_start_date || null;
  const systemActualDay=previousStart ? daysBetween(previousStart,today) : recorded;
  const newCycleConfirmed=options?.newCycleConfirmed === true;

  let cycleStartDate=previousStart || inferredStartFromRecorded;
  let actualDay=systemActualDay;
  let resetType=previousStart ? "continuing" : "first_checkin";
  let previousCycleLengthDays=null;

  if(!previousStart && recorded===1){
    cycleStartDate=today;
    actualDay=1;
    resetType="day_one";
  }else if(previousStart && recorded<systemActualDay && newCycleConfirmed){
    cycleStartDate=inferredStartFromRecorded;
    actualDay=recorded;
    resetType=recorded===1 ? "day_one" : "confirmed_new_cycle";
    if(cycleStartDate>previousStart){
      previousCycleLengthDays=Math.max(1, calendarDaysBetween(previousStart,cycleStartDate));
    }
  }

  actualDay=Math.max(1, Math.round(Number(actualDay)||recorded));
  const difference=recorded-actualDay;

  return {
    actualDay,
    recordedDay:recorded,
    difference,
    matchStatus:cycleMatchStatus(difference,resetType),
    message:cycleAccuracyMessage({actualDay, recordedDay:recorded, difference, resetType}),
    cycleStartDate,
    previousCycleLengthDays,
    resetType,
  };
}

export async function getCycleDayConfirmationContext(recordedDay){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const recorded=Number(recordedDay);
  if(!Number.isFinite(recorded)) return {needsConfirmation:false};

  const previous=await getPreviousCycleContext(user.id);
  const previousStart=previous?.cycle_start_date || null;
  if(!previousStart) return {needsConfirmation:false,recordedDay:recorded};

  const actualDay=daysBetween(previousStart,todayISO());
  const needsConfirmation=recorded<actualDay;
  const distance=Math.abs(recorded-actualDay);

  return {
    needsConfirmation,
    recordedDay:recorded,
    actualDay,
    previousCycleStartDate:previousStart,
    inferredCycleStartDate:calculateCycleStartDate(recorded),
    behindMessage:`Ah, your mind is ${distance} ${singularizeDay(distance)} behind your body. You are actually on Day ${actualDay}. We have got you.`,
  };
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

export async function createStay({cycleDay,feelsLike,newCycleConfirmed=false}){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  await autoCloseOpenStayIfNeeded(user.id);

  // Flowtel allows one stay per local calendar day.
  // If today's room already exists, return it rather than creating or reopening history.
  const existingToday=await getTodayStayForClient(user.id);
  if(existingToday) return existingToday;

  const cycle=await resolveCycleIntelligence(user.id, Number(cycleDay), { newCycleConfirmed });
  const innerSeason=getInnerSeason(cycle.actualDay);
  const moon=getMoonMagic();
  const stay={
    client_id:user.id,
    checkin_date:todayISO(),

    // Compatibility fields retained for existing screens and older RPCs.
    // Claimed = the guest’s recorded practice. Calculated = Flowtel’s actual source of truth.
    cycle_day_claimed:cycle.recordedDay,
    cycle_day_calculated:cycle.actualDay,

    // Explicit cycle-intelligence fields for the next dashboard layer.
    cycle_day_recorded:cycle.recordedDay,
    cycle_day_actual:cycle.actualDay,
    cycle_day_difference:cycle.difference,
    cycle_day_match_status:cycle.matchStatus,
    cycle_accuracy_message:cycle.message,
    previous_cycle_length_days:cycle.previousCycleLengthDays,
    cycle_reset_type:cycle.resetType,
    cycle_start_date:cycle.cycleStartDate,

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

export async function saveReflection(stayId, reflection, options={}){
  const cleaned=String(reflection||"").trim();
  if(!cleaned) throw new Error("Add a reflection before saving.");

  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const savedAt=new Date().toISOString();
  const shareInPowderRooms=options?.shareInPowderRooms !== false;

  const { data:entry, error:entryError } = await supabase
    .from("flowtel_reflections")
    .insert({
      stay_id: stayId,
      client_id: user.id,
      reflection: cleaned,
      share_in_powder_rooms: shareInPowderRooms,
      created_at: savedAt,
    })
    .select()
    .single();

  if(entryError) throw entryError;

  const {data,error}=await supabase.from("flowtel_stays").update({
    reflection: cleaned,
    reflection_share_in_powder_rooms: shareInPowderRooms,
    stay_status:"settled",
    updated_at:savedAt
  }).eq("id",stayId).select().single();

  if(error) throw error;

  return { ...data, latest_reflection_entry: entry };
}

export async function closeStayPersonally(stayId, checkoutNotes="", options={}){
  const {data:stay,error:stayError}=await supabase.from("flowtel_stays").select("*").eq("id",stayId).single();
  if(stayError) throw stayError;
  const shareInPowderRooms=options?.shareInPowderRooms !== false;
  const {data,error}=await supabase.from("flowtel_stays").update({
    checkout_notes:checkoutNotes,
    checkout_share_in_powder_rooms: shareInPowderRooms,
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


function normalizeCycleDayForRoom(day){
  const value=Number(day);
  if(!Number.isFinite(value)) return 1;
  return value>=28 ? 28 : Math.max(1, Math.min(28, value));
}

export async function getPreviousVisits(clientId, roomNumber=null){
  let q=supabase.from("flowtel_stays").select("*").eq("client_id",clientId)
    .order("checkin_date",{ascending:false}).limit(80);
  const {data,error}=await q;
  if(error) throw error;

  let visits=data||[];
  if(roomNumber){
    const requestedRoom=normalizeCycleDayForRoom(Number(roomNumber));
    visits=visits.filter(visit=>normalizeCycleDayForRoom(visit.cycle_day_actual ?? visit.cycle_day_calculated ?? visit.cycle_day_claimed)===requestedRoom);
  }

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
  const cleanedNote=String(witnessNote||"").trim();

  // Release 0.8.3: use a dedicated Security Definer RPC for Turndown completion.
  // The previous direct browser update could fail under Supabase RLS or schema drift,
  // which made the button flash "Completing..." and then return to "Complete Turndown".
  const rpcResult=await supabase.rpc("flowtel_complete_turndown",{
    p_stay_id: stayId,
    p_witness_note: cleanedNote,
  });

  if(rpcResult.error){
    const message=String(rpcResult.error.message || "");
    const missingFunction=message.toLowerCase().includes("function") && message.toLowerCase().includes("flowtel_complete_turndown");
    if(missingFunction){
      throw new Error("Turndown completion helper is not installed yet. Run database/migration-013-turndown-completion-rpc.sql in Supabase, then redeploy/refresh Flowtel.");
    }
    throw new Error(`Turndown completion could not be saved: ${message || "Supabase rejected the completion update."}`);
  }

  if(!rpcResult.data){
    throw new Error("Turndown completion saved no stay record. Refresh the Concierge Desk and check Supabase logs.");
  }

  return Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
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
