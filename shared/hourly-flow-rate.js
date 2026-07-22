// Flowtel v0.10.57 — private Hourly Flow Rate data boundary.

import { supabase } from './supabase.js';
import { requireProductAccess } from './product-access.js';
import {
  calculateHourlyFlowRate,
  normalizeCurrencyCode,
  roundMoney,
} from './hourly-flow-rate-calculations.js';

function asPayload(data){
  if(data === null || data === undefined) return null;
  if(typeof data === 'string'){
    try{return JSON.parse(data);}catch(_error){return data;}
  }
  return data;
}

async function call(name, args = {}){
  await requireProductAccess('flowtel');
  const { data, error } = await supabase.rpc(name, args);
  if(error) throw error;
  return asPayload(data);
}

export async function loadHourlyFlowRatePlan({ createIfMissing = true } = {}){
  return call('flowtel_hfr_load_plan', { p_create_if_missing: Boolean(createIfMissing) });
}

export async function saveHourlyFlowRatePlanState({ planId, lastOpenSection = null, witnessReflection = null }){
  return call('flowtel_hfr_save_plan_state', {
    p_plan_id: planId,
    p_last_open_section: lastOpenSection,
    p_witness_reflection: witnessReflection,
  });
}

export async function setHourlyFlowRateBaseCurrency({ planId, baseCurrency }){
  return call('flowtel_hfr_set_base_currency', {
    p_plan_id: planId,
    p_base_currency: normalizeCurrencyCode(baseCurrency),
  });
}

export async function saveHourlyFlowRateDestination({
  seasonId,
  city = '',
  region = '',
  country = '',
  callingReflection = '',
  inspirationUrl = '',
}){
  return call('flowtel_hfr_save_destination', {
    p_season_id: seasonId,
    p_city: city,
    p_region: region,
    p_country: country,
    p_calling_reflection: callingReflection,
    p_inspiration_url: inspirationUrl,
  });
}

export async function saveHourlyFlowRateWorkshopSeason({
  seasonId,
  city = '',
  region = '',
  country = '',
  lodgingIdea = '',
  callingReflection = '',
}){
  return call('flowtel_hfr_save_workshop_season', {
    p_season_id: seasonId,
    p_city: city,
    p_region: region,
    p_country: country,
    p_lodging_idea: lodgingIdea,
    p_calling_reflection: callingReflection,
  });
}

export async function saveHourlyFlowRateCostEntry({
  planId,
  seasonId,
  layerKey,
  entryMode = 'detailed',
  baseAmount = 0,
  entryId = null,
  label = '',
  sourceUrl = '',
  startsOn = null,
  endsOn = null,
  quantity = null,
  frequencyLabel = '',
  feesStatus = null,
  originalAmount = null,
  originalCurrency = null,
  privateNote = '',
  researchedOn = null,
  details = {},
}){
  return call('flowtel_hfr_save_cost_entry', {
    p_plan_id: planId,
    p_season_id: seasonId,
    p_layer_key: layerKey,
    p_entry_mode: entryMode,
    p_base_amount: roundMoney(baseAmount),
    p_entry_id: entryId,
    p_label: label,
    p_source_url: sourceUrl,
    p_starts_on: startsOn || null,
    p_ends_on: endsOn || null,
    p_quantity: quantity === '' || quantity === null ? null : Number(quantity),
    p_frequency_label: frequencyLabel,
    p_fees_status: feesStatus || null,
    p_original_amount: originalAmount === '' || originalAmount === null ? null : roundMoney(originalAmount),
    p_original_currency: originalCurrency ? normalizeCurrencyCode(originalCurrency) : null,
    p_private_note: privateNote,
    p_researched_on: researchedOn || null,
    p_details: details && typeof details === 'object' ? details : {},
  });
}

export async function deleteHourlyFlowRateCostEntry(entryId){
  return call('flowtel_hfr_delete_cost_entry', { p_entry_id: entryId });
}

export async function saveHourlyFlowRateHomeBase({
  planId,
  monthlyAmount = 0,
  reviewedOn = null,
  privatelyConfirmed = false,
  privateReflection = '',
}){
  return call('flowtel_hfr_save_home_base', {
    p_plan_id: planId,
    p_monthly_amount: roundMoney(monthlyAmount),
    p_reviewed_on: reviewedOn || null,
    p_privately_confirmed: Boolean(privatelyConfirmed),
    p_private_reflection: privateReflection,
  });
}

export function normalizedHourlyFlowRatePayload(payload = {}){
  const plan = payload?.plan || null;
  const seasons = Array.isArray(payload?.seasons) ? payload.seasons : [];
  const costEntries = Array.isArray(payload?.cost_entries) ? payload.cost_entries : [];
  const homeBase = payload?.home_base || null;
  const snapshots = Array.isArray(payload?.snapshots) ? payload.snapshots : [];
  const monthlyHomeBase = Number(homeBase?.monthly_amount || 0);
  const localCalculation = calculateHourlyFlowRate({ monthlyHomeBase, costEntries });
  const calculation = payload?.calculation
    ? { ...localCalculation, ...payload.calculation }
    : localCalculation;

  return { plan, seasons, costEntries, homeBase, snapshots, calculation };
}
