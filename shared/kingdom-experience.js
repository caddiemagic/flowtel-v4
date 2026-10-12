import { supabase } from './supabase.js';
export const SIREN_BUCKET='caddie-sea-of-sirens';
export const CATEGORIES=['Meditations','Hypnosis','Breathwork','Siren Calls'];
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function rpc(name,args={}){const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;}
export async function myAssignments(){const {data:session}=await supabase.auth.getUser();const {data,error}=await supabase.from('caddie_magic_assignment_recipients').select('*,caddie_magic_assignment_batches(*)').eq('user_id',session.user?.id).order('updated_at',{ascending:false});if(error)throw error;
 const profile=await supabase.from('caddie_magic_player_profiles').select('id').eq('user_id',session.user?.id).maybeSingle();if(profile.error)throw profile.error;
 let legacy=[];if(profile.data?.id){const loaded=await supabase.from('caddie_magic_compass_assignments').select('*').eq('player_profile_id',profile.data.id).order('created_at',{ascending:false});if(loaded.error)throw loaded.error;legacy=(loaded.data||[]).map(a=>({batch_id:'legacy:'+a.id,legacy_id:a.id,status:a.status,reflection:a.player_response||'',reviewed_at:a.caddie_noted_at||null,caddie_magic_assignment_batches:{title:a.title,instructions:a.instructions,due_date:a.due_date}}));}
 return [...(data||[]),...legacy];}
export async function mySirenTracks(){const {data,error}=await supabase.from('caddie_magic_siren_tracks').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[];}
export async function sirenUrl(path){const {data,error}=await supabase.storage.from(SIREN_BUCKET).createSignedUrl(path,3600);if(error)throw error;return data.signedUrl;}
export async function ownerRequired(){if(await rpc('flowtel_current_user_is_admin_or_owner')!==true)throw Error('Only the Caddie Master may open this desk.');}
export async function playerRequired(){const {requireCaddieMagicAccess}=await import('./caddie-magic-access.js');await requireCaddieMagicAccess();const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw Error('Sign in to the Kingdom first.');return data.user;}
