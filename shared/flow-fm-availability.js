// Flowtel v0.10.73 — private seasonal client-call availability boundary.
import { supabase } from './supabase.js';
import { requireProductAccess } from './product-access.js';
import { validateFlowFmAvailabilitySeason } from './flow-fm-availability-core.js';

async function call(name,args={}){
  await requireProductAccess('flowtel');
  const {data,error}=await supabase.rpc(name,args);
  if(error) throw error;
  return data;
}
export async function loadFlowFmAvailability(){return call('flowtel_availability_load');}
export async function saveFlowFmAvailabilitySeason({innerSeason,days}){
  const normalized=validateFlowFmAvailabilitySeason(innerSeason,days);
  return call('flowtel_availability_save_season',{p_inner_season:innerSeason,p_days:normalized});
}
// Retained for older cached Availability pages during the transition.
export async function saveFlowFmAvailabilityDay({cycleDay,isAvailable,note=''}){
  return call('flowtel_availability_save_day',{p_cycle_day:Number(cycleDay),p_is_available:Boolean(isAvailable),p_availability_note:note});
}
