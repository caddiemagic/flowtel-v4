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

export async function getTodaysStay(){
  const user=await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  const {data,error}=await supabase.from("flowtel_stays").select("*")
    .eq("client_id",user.id)
    .eq("checkin_date",todayISO())
    .order("checked_in_at",{ascending:false})
    .limit(1)
    .maybeSingle();
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
  const {data,error}=await supabase.from("flowtel_stays").update({
    reflection, stay_status:"settled", updated_at:new Date().toISOString()
  }).eq("id",stayId).select().single();
  if(error) throw error;
  return data;
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

export async function getPreviousVisits(clientId, roomNumber=null){
  let q=supabase.from("flowtel_stays").select("*").eq("client_id",clientId)
    .order("checkin_date",{ascending:false}).limit(80);
  if(roomNumber) q=q.eq("cycle_day_claimed",Number(roomNumber));
  const {data,error}=await q;
  if(error) throw error;
  return data||[];
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
