// Flowtel v0.10.64 — Queendom workshop replay notes.

import { supabase } from './supabase.js';

import {
  WORKSHOP_REPLAY_NOTE_TYPES,
  labelForWorkshopReplayNoteType,
  normalizeWorkshopKey,
  validateWorkshopReplayNote,
} from './replay-notes-core.js?v=0.10.64';

export {
  WORKSHOP_REPLAY_NOTE_TYPES,
  labelForWorkshopReplayNoteType,
  normalizeWorkshopKey,
  validateWorkshopReplayNote,
};

export async function saveWorkshopReplayNote(values={}){
  const note=validateWorkshopReplayNote(values);
  const moon=values.moon || {};
  const {data,error}=await supabase.rpc('flowtel_save_workshop_replay_note',{
    p_workshop_key:note.workshopKey,
    p_workshop_title:note.workshopTitle,
    p_note_type:note.noteType,
    p_note_body:note.noteBody,
    p_source_url:note.sourceUrl || null,
    p_moon_day:Number.isFinite(Number(moon.moonDay)) ? Number(moon.moonDay) : null,
    p_moon_phase:moon.phase || null,
    p_moon_inner_season:moon.innerSeason || null,
    p_moon_theme:moon.theme || null,
  });
  if(error) throw error;
  return data;
}

export async function listMyWorkshopReplayNotes(workshopKey=null){
  const {data,error}=await supabase.rpc('flowtel_get_my_workshop_replay_notes',{
    p_workshop_key:workshopKey ? normalizeWorkshopKey(workshopKey) : null,
  });
  if(error) throw error;
  return data || [];
}

export async function listAdminWorkshopReplayNotes(workshopKey=null){
  const {data,error}=await supabase.rpc('flowtel_admin_get_workshop_replay_notes',{
    p_workshop_key:workshopKey ? normalizeWorkshopKey(workshopKey) : null,
  });
  if(error) throw error;
  return data || [];
}
