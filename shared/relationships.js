// shared/relationships.js
import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

const SELECT_RELATIONSHIP = `
  *,
  practitioner:practitioner_id (id, first_name, last_name, email, role, membership_type, practitioner_level, flowfm_started_at),
  client:client_id (id, first_name, last_name, email, role, membership_type)
`;

export async function listPractitioners(){
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role, membership_type, practitioner_level, flowfm_started_at")
    .in("role", ["practitioner", "owner", "admin"])
    .order("first_name", { ascending: true });

  if(error) throw error;
  return data || [];
}

export async function getMyPractitionerRelationship(){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const { data, error } = await supabase
    .from("flowtel_practitioner_relationships")
    .select(SELECT_RELATIONSHIP)
    .eq("client_id", user.id)
    .in("status", ["requested", "connected"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if(error) throw error;
  return data || null;
}

export async function requestPractitionerConnection(practitionerId){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  if(!practitionerId) throw new Error("Choose a practitioner to connect with.");

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("flowtel_practitioner_relationships")
    .upsert({
      client_id: user.id,
      practitioner_id: practitionerId,
      status: "requested",
      consent_granted: true,
      requested_at: now,
      updated_at: now,
    }, { onConflict: "client_id,practitioner_id" })
    .select(SELECT_RELATIONSHIP)
    .single();

  if(error) throw error;
  return data;
}

export async function listConnectionRequestsForPractitioner(){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const { data, error } = await supabase
    .from("flowtel_practitioner_relationships")
    .select(SELECT_RELATIONSHIP)
    .eq("practitioner_id", user.id)
    .eq("status", "requested")
    .order("requested_at", { ascending: true });

  if(error) throw error;
  return data || [];
}

export async function listMyClients(){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  const { data, error } = await supabase
    .from("flowtel_practitioner_relationships")
    .select(SELECT_RELATIONSHIP)
    .eq("practitioner_id", user.id)
    .eq("status", "connected")
    .order("connected_at", { ascending: false });

  if(error) throw error;
  return data || [];
}

export async function connectWithGuest(relationshipId){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  if(!relationshipId) throw new Error("No connection request selected.");

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("flowtel_practitioner_relationships")
    .update({
      status: "connected",
      connected_at: now,
      updated_at: now,
    })
    .eq("id", relationshipId)
    .eq("practitioner_id", user.id)
    .select(SELECT_RELATIONSHIP)
    .single();

  if(error) throw error;
  return data;
}
