// Flowtel v0.10.56 — member/public Team Map helpers plus owner-only 28-day view.

import { supabase } from './supabase.js';

function firstRow(data){
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

export async function getTeamMapViewerState(){
  const { data, error } = await supabase.rpc('flow_fm_get_team_map_viewer_state');
  if(error) throw error;
  return firstRow(data) || {
    flowtel_date:null,
    can_view:false,
    can_appear:false,
    is_visible:false,
    checked_in_today:false,
    appears_today:false,
    actual_inner_season:null,
    feels_like_inner_season:null,
    cycle_day:null,
    profile_photo_url:null,
    presence_status:'The Living Map could not confirm your presence yet.',
  };
}

export async function listTeamMapPresences(){
  const { data, error } = await supabase.rpc('flow_fm_get_team_map');
  if(error) throw error;
  return data || [];
}

export async function listAdminTeamMapPresences(){
  const { data, error } = await supabase.rpc('flowtel_admin_get_28_day_team_map');
  if(error) throw error;
  return data || [];
}

export async function setTeamMapVisibility(visible=true){
  const { data, error } = await supabase.rpc('flow_fm_set_team_map_visibility', {
    p_visible:!!visible,
  });
  if(error) throw error;
  return !!data;
}

export async function getTeamMapProfile(memberId){
  const { data, error } = await supabase.rpc('flow_fm_get_team_map_profile', {
    p_member_id:memberId || null,
  });
  if(error) throw error;
  return firstRow(data);
}


export async function listPublicTeamMapPresences(){
  const { data, error } = await supabase.rpc('flow_fm_get_public_team_map');
  if(error) throw error;
  return data || [];
}

export async function ownerRecognizeTeamMember(memberId){
  if(!memberId) throw new Error('Choose a Flowtel guest to add to the Concierge Team.');
  const { data, error } = await supabase.rpc('flow_fm_owner_recognize_team_member', {
    p_member_id: memberId,
  });
  if(error) throw error;
  return firstRow(data);
}
