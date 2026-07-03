// shared/stays.js
import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { calculateCycleStartDate, getCourt, getInnerSeason, getWing } from "./seasons.js";
import { getMoonMagic } from "./moon.js";

function todayISO(){ return new Date().toISOString().slice(0,10); }

function daysBetween(startDate,endDate){
  const a=new Date(startDate), b=new Date(endDate);
  a.setHours(0,0,0,0); b.setHours(0,0,0,0);
  return Math.max(1, Math.round((b-a)/86400000)+1);
}

export async function getOpenStayForClient(clientId){
  const {data,error}=await supabase.from("flowtel_stays").select("*")
    .eq("client_id",clientId).is("checked_out_at",null)
    .order("checked_in_at",{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  return data;
}


export async function getTodayStayForClient(clientId){
  const {data,error}=await supabase.from("flowtel_stays").select("*")
    .eq("client_id",clientId).eq("checkin_date",todayISO())
    .order("checked_in_at",{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  return data;
}

export async function autoCloseOpenStayIfNeeded(clientId){
  const openStay=await getOpenStayForClient(clientId);
  if(!openStay) return null;
  const today=todayISO();
  if(openStay.checkin_date===today) return openStay;
  const {data,error}=await supabase.from("flowtel_stays").update({
    checked_out_at:new Date().toISOString(),
    stay_status:"checked_out",
    stay_end_type:"automatic",
    stay_length_days:daysBetween(openStay.checkin_date,today),
    updated_at:new Date().toISOString(),
  }).eq("id",openStay.id).select().single();
  if(error) throw error;
  return data;
}

export async function createStay({cycleDay,feelsLike}){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  await autoCloseOpenStayIfNeeded(user.id);
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
    .upsert(stay,{onConflict:"client_id,checkin_date"}).select().single();
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

export async function getFrontDeskStays(){
  const {data,error}=await supabase.from("flowtel_stays").select(`
    *,
    profiles:client_id (first_name,last_name,email,role)
  `).order("checked_in_at",{ascending:false}).limit(100);
  if(error) throw error;
  return data||[];
}

export async function witnessStay(stayId,witnessNote=""){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  const {data,error}=await supabase.from("flowtel_stays").update({
    witnessed_by:user.id,
    witnessed_at:new Date().toISOString(),
    witness_note:witnessNote,
    stay_status:"witnessed",
    updated_at:new Date().toISOString(),
  }).eq("id",stayId).select().single();
  if(error) throw error;
  return data;
}


export async function cleanCheckedOutRoom(stayId, note=""){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  const now=new Date().toISOString();
  const {data,error}=await supabase.from("flowtel_stays").update({
    witnessed_by:user.id,
    witnessed_at:now,
    witness_note:note,
    updated_at:now,
  }).eq("id",stayId).select().single();
  if(error) throw error;
  return data;
}
