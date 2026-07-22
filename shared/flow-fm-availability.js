// Flowtel v0.10.67 — private Flow FM availability map boundary.
import { supabase } from './supabase.js';
import { requireProductAccess } from './product-access.js';

async function call(name,args={}){
  await requireProductAccess('flowtel');
  const {data,error}=await supabase.rpc(name,args);
  if(error) throw error;
  return data;
}
export async function loadFlowFmAvailability(){return call('flowtel_availability_load');}
export async function saveFlowFmAvailabilityDay({cycleDay,isAvailable,note=''}){
  return call('flowtel_availability_save_day',{
    p_cycle_day:Number(cycleDay),
    p_is_available:Boolean(isAvailable),
    p_availability_note:note,
  });
}
