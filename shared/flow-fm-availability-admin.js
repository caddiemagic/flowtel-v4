import { supabase } from './supabase.js';

export async function loadFlowFmAvailabilityOwnerView(){
  const {data,error}=await supabase.rpc('flowtel_admin_list_flow_fm_availability');
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

export async function loadFlowFmAvailabilityMonthOwnerView(){
  const {data,error}=await supabase.rpc('flowtel_admin_list_availability_month_updates');
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

export async function acknowledgeFlowFmAvailabilityMonth(memberId,monthStart){
  const {data,error}=await supabase.rpc('flowtel_admin_acknowledge_availability_month',{
    p_member_id:memberId,
    p_month_start:monthStart,
  });
  if(error) throw error;
  return data||null;
}
