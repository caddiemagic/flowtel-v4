import { supabase } from './supabase.js';

export async function loadFlowFmAvailabilityOwnerView(){
  const {data,error}=await supabase.rpc('flowtel_admin_list_flow_fm_availability');
  if(error) throw error;
  return Array.isArray(data)?data:[];
}
