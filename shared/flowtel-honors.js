// Flowtel v0.10.56 — owner-managed Flowtel Honors ledger helpers.

import { supabase } from './supabase.js';

export const FLOWTEL_PRACTITIONER_SHARE = 0.77;
export const FLOWTEL_PLATFORM_SHARE = 0.23;

export function honorsCalculation(grossAmount = 0){
  const gross = Math.max(0, Number(grossAmount) || 0);
  const practitionerPayout = Math.round((gross * FLOWTEL_PRACTITIONER_SHARE + Number.EPSILON) * 100) / 100;
  const flowtelShare = Math.round((gross * FLOWTEL_PLATFORM_SHARE + Number.EPSILON) * 100) / 100;
  return {
    grossAmount: Math.round((gross + Number.EPSILON) * 100) / 100,
    practitionerPayout,
    flowtelShare,
    honorsPoints: flowtelShare,
  };
}

export async function listHonorsPractitioners(){
  const { data, error } = await supabase.rpc('flowtel_honors_admin_list_practitioners');
  if(error) throw error;
  return data || [];
}

export async function getHonorsDashboard(){
  const { data, error } = await supabase.rpc('flowtel_honors_admin_get_dashboard');
  if(error) throw error;
  return data || [];
}

export async function getHonorsLedger(limit = 100){
  const { data, error } = await supabase.rpc('flowtel_honors_admin_get_ledger', {
    p_limit: Math.max(1, Math.min(Number(limit) || 100, 500)),
  });
  if(error) throw error;
  return data || [];
}

export async function recordHonorsEntry({
  practitionerId,
  transactionType,
  grossAmount = 0,
  manualPoints = null,
  sourceMemberId = null,
  sourceTransaction = '',
  reason = '',
  directLineRelationship = '',
} = {}){
  if(!practitionerId) throw new Error('Choose the Priestess receiving Flowtel Honors.');
  const { data, error } = await supabase.rpc('flowtel_honors_admin_record_entry', {
    p_practitioner_id: practitionerId,
    p_transaction_type: transactionType || null,
    p_gross_amount: Number(grossAmount) || 0,
    p_manual_points: manualPoints === null || manualPoints === '' ? null : Number(manualPoints),
    p_source_member_id: sourceMemberId || null,
    p_source_transaction: sourceTransaction || null,
    p_reason: reason || null,
    p_direct_line_relationship: directLineRelationship || null,
  });
  if(error) throw error;
  return data;
}
