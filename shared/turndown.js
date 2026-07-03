import { supabase } from "./supabase.js";

export async function requestTurndownService(stayId){
  if(!stayId) throw new Error("A stay id is required to request Turndown Service.");

  const requestedAt=new Date().toISOString();

  const { data, error } = await supabase
    .from("flowtel_stays")
    .update({
      turndown_requested_at: requestedAt,
      turndown_status: "requested",
      updated_at: requestedAt,
    })
    .eq("id", stayId)
    .select("*")
    .single();

  if(error) throw error;
  return data;
}
