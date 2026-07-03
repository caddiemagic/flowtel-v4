async function getSupabaseClient(){
  const candidates=["./supabase.js","./supabaseClient.js","./client.js"];
  for(const path of candidates){
    try{
      const module=await import(path);
      if(module.supabase) return module.supabase;
      if(module.default) return module.default;
    }catch(error){
      // Try the next known shared Supabase module name.
    }
  }
  throw new Error("Supabase client module not found. Export `supabase` from shared/supabase.js, shared/supabaseClient.js, or shared/client.js.");
}

export async function requestTurndownService(stayId){
  if(!stayId) throw new Error("A stay id is required to request Turndown Service.");

  const supabase=await getSupabaseClient();
  const requestedAt=new Date().toISOString();

  const { data, error } = await supabase
    .from("stays")
    .update({
      turndown_requested_at: requestedAt,
      turndown_status: "requested",
    })
    .eq("id", stayId)
    .select("*")
    .single();

  if(error) throw error;
  return data;
}
