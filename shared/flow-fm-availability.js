// Flowtel v0.10.83 — seasonal + cycle-aware monthly client-call availability boundary.
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

export async function loadFlowFmAvailabilityMonth(monthStart){
  return call('flowtel_availability_month_load',{p_month_start:monthStart||null});
}
export async function saveFlowFmAvailabilityMonthDay({calendarDate,isAvailable,windows=[],useSeasonal=false}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(calendarDate||''))) throw new Error('Choose a valid calendar date.');
  const normalized=(Array.isArray(windows)?windows:[]).map(window=>({
    start:String(window?.start||'').slice(0,5),
    end:String(window?.end||'').slice(0,5),
  }));
  return call('flowtel_availability_month_save_day',{
    p_calendar_date:calendarDate,
    p_is_available:Boolean(isAvailable),
    p_windows:normalized,
    p_use_seasonal:Boolean(useSeasonal),
  });
}
export async function submitFlowFmAvailabilityMonth(monthStart){
  return call('flowtel_availability_month_submit',{p_month_start:monthStart});
}
