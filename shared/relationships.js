// shared/relationships.js
import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

const BASE_MENTOR_SELECT = "id, first_name, last_name, email, role, membership_type, practitioner_level, flowfm_started_at, is_initiated";
const EXTENDED_MENTOR_SELECT = `${BASE_MENTOR_SELECT}, mentor_title, mentor_bio, mentor_photo_url, mentor_specialties, mentor_accepting_clients, mentor_sort_order, serving_wing`;
export const MENTOR_DATA_CONSENT_LANGUAGE = "By inviting this mentor, you consent to share your Flowtel cycle data, check-ins, reflections, and stay history with them while you are connected.";

const SELECT_RELATIONSHIP = `
  *,
  practitioner:practitioner_id (${EXTENDED_MENTOR_SELECT}),
  client:client_id (id, first_name, last_name, email, role, membership_type)
`;

const FALLBACK_SELECT_RELATIONSHIP = `
  *,
  practitioner:practitioner_id (${BASE_MENTOR_SELECT}),
  client:client_id (id, first_name, last_name, email, role, membership_type)
`;

function isMissingColumnError(error){
  const message=String(error?.message || "").toLowerCase();
  return error?.code==="42703" || message.includes("column") && message.includes("does not exist");
}

function isMissingFunctionError(error){
  const message=String(error?.message || "").toLowerCase();
  return error?.code==="42883" || message.includes("function") && message.includes("does not exist");
}

async function safeSelectRelationshipById(id){
  try{
    return await selectRelationshipById(id);
  }catch(error){
    console.warn("Relationship connected, but the enriched relationship row could not be reloaded yet.", error);
    return { id, status:"connected" };
  }
}

async function selectRelationshipById(id){
  if(!id) return null;

  let result=await supabase
    .from("flowtel_practitioner_relationships")
    .select(SELECT_RELATIONSHIP)
    .eq("id", id)
    .maybeSingle();

  if(result.error && isMissingColumnError(result.error)){
    result=await supabase
      .from("flowtel_practitioner_relationships")
      .select(FALLBACK_SELECT_RELATIONSHIP)
      .eq("id", id)
      .maybeSingle();
  }

  if(result.error) throw result.error;
  return result.data || null;
}

export async function listMentors(){
  let query=supabase
    .from("profiles")
    .select(EXTENDED_MENTOR_SELECT)
    .in("role", ["practitioner", "owner", "admin"])
    .order("mentor_sort_order", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true });

  let { data, error } = await query;

  if(error && isMissingColumnError(error)){
    const fallback=await supabase
      .from("profiles")
      .select(BASE_MENTOR_SELECT)
      .in("role", ["practitioner", "owner", "admin"])
      .order("first_name", { ascending: true });
    data=fallback.data;
    error=fallback.error;
  }

  if(error) throw error;

  return (data || []).filter(profile=>profile.mentor_accepting_clients !== false);
}

export async function listPractitioners(){
  return listMentors();
}

export async function getMyPractitionerRelationship(){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  let result=await supabase
    .from("flowtel_practitioner_relationships")
    .select(SELECT_RELATIONSHIP)
    .eq("client_id", user.id)
    .in("status", ["requested", "connected"])
    .order("connected_at", { ascending: false, nullsFirst: false })
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if(result.error && isMissingColumnError(result.error)){
    result=await supabase
      .from("flowtel_practitioner_relationships")
      .select(FALLBACK_SELECT_RELATIONSHIP)
      .eq("client_id", user.id)
      .in("status", ["requested", "connected"])
      .order("connected_at", { ascending: false, nullsFirst: false })
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  if(result.error) throw result.error;
  return result.data || null;
}

export async function chooseMentor(mentorId){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  if(!mentorId) throw new Error("Choose a mentor to connect with.");

  // Preferred path: database-owned choice logic keeps one active Mentor to the Moon per guest
  // and records the consent language shown at the time of invitation.
  let rpc=await supabase.rpc("flowtel_choose_mentor_with_consent", {
    p_mentor_id: mentorId,
    p_consent_language: MENTOR_DATA_CONSENT_LANGUAGE,
  });

  if(rpc.error && isMissingFunctionError(rpc.error)){
    rpc=await supabase.rpc("flowtel_choose_mentor", { p_mentor_id: mentorId });
  }

  if(!rpc.error){
    return selectRelationshipById(rpc.data);
  }

  const missingFunction=isMissingFunctionError(rpc.error);
  if(!missingFunction) throw rpc.error;

  // Fallback for environments before migration-014 is installed.
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("flowtel_practitioner_relationships")
    .upsert({
      client_id: user.id,
      practitioner_id: mentorId,
      status: "requested",
      consent_granted: true,
      requested_at: now,
      updated_at: now,
    }, { onConflict: "client_id,practitioner_id" })
    .select(FALLBACK_SELECT_RELATIONSHIP)
    .single();

  if(error) throw error;
  return data;
}

export async function requestPractitionerConnection(practitionerId){
  return chooseMentor(practitionerId);
}

export async function listConnectionRequestsForPractitioner(){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  let result=await supabase
    .from("flowtel_practitioner_relationships")
    .select(SELECT_RELATIONSHIP)
    .eq("practitioner_id", user.id)
    .eq("status", "requested")
    .order("requested_at", { ascending: true });

  if(result.error && isMissingColumnError(result.error)){
    result=await supabase
      .from("flowtel_practitioner_relationships")
      .select(FALLBACK_SELECT_RELATIONSHIP)
      .eq("practitioner_id", user.id)
      .eq("status", "requested")
      .order("requested_at", { ascending: true });
  }

  if(result.error) throw result.error;
  return result.data || [];
}

export async function listMyClients(){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");

  let result=await supabase
    .from("flowtel_practitioner_relationships")
    .select(SELECT_RELATIONSHIP)
    .eq("practitioner_id", user.id)
    .eq("status", "connected")
    .order("connected_at", { ascending: false });

  if(result.error && isMissingColumnError(result.error)){
    result=await supabase
      .from("flowtel_practitioner_relationships")
      .select(FALLBACK_SELECT_RELATIONSHIP)
      .eq("practitioner_id", user.id)
      .eq("status", "connected")
      .order("connected_at", { ascending: false });
  }

  if(result.error) throw result.error;
  return result.data || [];
}

export async function connectWithGuest(relationshipId){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  if(!relationshipId) throw new Error("No connection request selected.");

  // Preferred path: database-owned Connect action enforces Mentor permissions under RLS.
  const rpc=await supabase.rpc("flowtel_connect_mentor_relationship", { p_relationship_id: relationshipId });
  if(!rpc.error){
    return safeSelectRelationshipById(rpc.data || relationshipId);
  }

  if(!isMissingFunctionError(rpc.error)) throw rpc.error;

  // Fallback for environments before the relationship RPC is installed.
  // RLS still controls whether the signed-in mentor may perform this update.
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("flowtel_practitioner_relationships")
    .update({
      status: "connected",
      connected_at: now,
      connected_by: user.id,
      updated_at: now,
    })
    .eq("id", relationshipId)
    .select("id")
    .single();

  if(error) throw error;
  return safeSelectRelationshipById(data?.id || relationshipId);
}


export async function cancelMentorRequest(relationshipId){
  const user = await getCurrentUser();
  if(!user) throw new Error("No signed-in user.");
  if(!relationshipId) throw new Error("No mentor request selected.");

  const rpc=await supabase.rpc("flowtel_cancel_mentor_request", { p_relationship_id: relationshipId });
  if(!rpc.error){
    return true;
  }

  if(!isMissingFunctionError(rpc.error)) throw rpc.error;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("flowtel_practitioner_relationships")
    .update({
      status: "cancelled",
      disconnected_at: now,
      disconnected_reason: "guest cancelled pending mentor request",
      updated_at: now,
    })
    .eq("id", relationshipId)
    .eq("client_id", user.id)
    .eq("status", "requested");

  if(error) throw error;
  return true;
}
