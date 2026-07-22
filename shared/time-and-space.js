// Flowtel v0.10.72 — privacy-safe Time + Space team data boundary.

import { supabase } from './supabase.js';
export {
  TIME_SPACE_HEMISPHERE_LABELS,
  localDateParts,
  normalizeTimeZone,
  outerSeasonForHemisphere,
  timeAndSpacePresentation,
} from './time-and-space-core.js';

export async function listTimeAndSpaceTeam(){
  const { data, error } = await supabase.rpc('flowtel_get_time_and_space_team');
  if(error) throw error;
  return Array.isArray(data) ? data : [];
}
