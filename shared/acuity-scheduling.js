import { supabase } from './supabase.js';

async function api(action,payload={}){
  const {data:{session},error}=await supabase.auth.getSession();
  if(error)throw error;
  if(!session?.access_token)throw new Error('Sign in through Flowtel before scheduling a call.');
  const response=await fetch('/api/acuity',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({action,...payload})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false)throw new Error(data?.error||'Flowtel could not complete this scheduling request.');
  return data;
}
export const loadWombMagicScheduling=()=>api('bootstrap');
export const loadWombMagicDates=(payload)=>api('dates',payload);
export const loadWombMagicTimes=(payload)=>api('times',payload);
export const bookWombMagicCall=(payload)=>api('book',payload);
export const rescheduleWombMagicCall=(payload)=>api('reschedule',payload);
export const cancelWombMagicCall=(appointmentId)=>api('cancel',{appointment_id:appointmentId});
export const loadUpcomingServiceCalls=()=>api('provider-calls');
export const loadAcuityOwnerSetup=()=>api('owner-setup');
export const saveAcuityOwnerSetup=(payload)=>api('owner-save',payload);
export const WOMB_MAGIC_CONSENT_LANGUAGE='By booking this Womb Magic call, you allow the Priestess holding your appointment to view your Flowtel cycle data, check-ins, reflections, Flow Map, and stay history so she can prepare for and hold your call. Her access begins when the call is booked and ends seven days after the appointment. Your Womb Magic call will be recorded and uploaded to the Flow FM Library for training purposes, where it will be shared with care and integrity.';
