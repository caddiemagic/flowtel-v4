import { getCurrentProfile, displayNameForProfile } from '/shared/flowtel.js?v=0.10.73';
import { canAccessHourlyFlowRate } from '/shared/rollout.js?v=0.10.73';
import { isProductAccessError, redirectForDeniedProduct } from '/shared/product-access.js?v=0.10.73';
import { renderTopNav, escapeHtml, safeHref } from '/flow-fm/ui.js?v=0.10.73';
import {
  CURRENCY_OPTIONS,
  LAYER_LABELS,
  SEASONAL_MONEY_LAYERS,
  analyzeLodgingCoverage,
  calculateNourishmentTotal,
  calculateSelfCareServiceTotal,
  countFlowingLayers,
  currencySymbol,
  flowtelDateISO,
  formatSeasonDateRange,
  inclusiveDayCount,
  layerTotals,
  seasonDisplayName,
  seasonStatus,
} from '/shared/hourly-flow-rate-calculations.js?v=0.10.73';
import {
  deleteHourlyFlowRateCostEntry,
  hourlyFlowRateSeasonLocation,
  loadHourlyFlowRatePlan,
  normalizedHourlyFlowRatePayload,
  saveHourlyFlowRateCostEntry,
  saveHourlyFlowRateSeasonLocation,
  saveHourlyFlowRateHomeBase,
  saveHourlyFlowRatePlanState,
  setHourlyFlowRateBaseCurrency,
} from '/shared/hourly-flow-rate.js?v=0.10.73';

const topNav = document.getElementById('topNav');
const accessGate = document.getElementById('accessGate');
const experience = document.getElementById('experience');
const rateHero = document.getElementById('rateHero');
const currencyRoom = document.getElementById('currencyRoom');
const seasonMap = document.getElementById('seasonMap');
const seasonStudio = document.getElementById('seasonStudio');
const homeBaseRoom = document.getElementById('homeBaseRoom');
const lifestyleLayersRoom = document.getElementById('lifestyleLayersRoom');
const timelineRoom = document.getElementById('timelineRoom');
const witnessRoom = document.getElementById('witnessRoom');
const pageMessage = document.getElementById('pageMessage');

let profile = null;
let state = normalizedHourlyFlowRatePayload();
let activeSeasonId = null;
let busy = false;

const OPTIONAL_LAYERS = [
  { key: 'nourishment', eyebrow: 'SEASONAL NOURISHMENT', invitation: 'Resource the meals, groceries, dining, and nourishment that help this season feel held.', labelPlaceholder: 'Private chef, groceries, favorite restaurant…' },
  { key: 'self_care', eyebrow: 'SOVEREIGN SELF-CARE', invitation: 'Add the care that supports your body, beauty, healing, medicine, and nervous system.', labelPlaceholder: 'Massage, therapy, beauty ritual, practitioner…' },
  { key: 'transitions', eyebrow: 'SEASONAL TRANSITIONS', invitation: 'Welcome the travel, ground transport, moving support, and transitions between homes.', labelPlaceholder: 'Flight, train, car, shipping, transition support…' },
  { key: 'pleasure_support', eyebrow: 'PLEASURE & SUPPORT', invitation: 'Make room for delight, celebration, creative help, personal support, and the unexpected.', labelPlaceholder: 'Celebration, assistant, art supplies, special experience…' },
];

function setMessage(text = '', tone = ''){
  pageMessage.textContent = text;
  pageMessage.dataset.tone = tone;
}

function money(value, { exact = true } = {}){
  const currency = state.plan?.base_currency || 'USD';
  const amount = Number(value || 0);
  try{
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: exact ? 2 : 0,
      maximumFractionDigits: exact ? 2 : 0,
    }).format(amount);
  }catch(_error){
    return `${currencySymbol(currency)}${amount.toFixed(exact ? 2 : 0)}`;
  }
}

function dateInputValue(value){
  return String(value || '').slice(0, 10);
}

function cleanNumber(value){
  if(value === '' || value === null || value === undefined) return 0;
  const number = Number(value);
  if(!Number.isFinite(number) || number < 0) throw new Error('Enter a valid cost that is zero or greater.');
  return number;
}

function activeSeason(){
  return state.seasons.find((season) => season.id === activeSeasonId) || state.seasons[0] || null;
}

function entriesFor(seasonId, layerKey){
  return state.costEntries.filter((entry) => entry.season_id === seasonId && entry.layer_key === layerKey);
}

function applyPayload(payload, { preserveSeason = true } = {}){
  const previousSeason = preserveSeason ? activeSeasonId : null;
  state = normalizedHourlyFlowRatePayload(payload || {});
  activeSeasonId = state.seasons.some((season) => season.id === previousSeason)
    ? previousSeason
    : resolveRestoredSeasonId();
  render();
}

function resolveRestoredSeasonId(){
  const last = String(state.plan?.last_open_section || '');
  const match = last.match(/^season-(.+)$/);
  if(match && state.seasons.some((season) => season.id === match[1])) return match[1];
  return state.seasons.find((season) => Number(season.sort_order) === 1)?.id || state.seasons[0]?.id || null;
}

function renderGate(title, copy, link = '/client/', linkLabel = 'Return to the Flowtel Doorway'){
  experience.hidden = true;
  accessGate.hidden = false;
  accessGate.innerHTML = `<article class="hfr-gate-card">
    <p class="eyebrow">PRIVATE FLOW FM ROOM</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(copy)}</p>
    <a class="hfr-button" href="${escapeHtml(link)}">${escapeHtml(linkLabel)}</a>
  </article>`;
}

function renderHero(){
  const calculation = state.calculation || {};
  const hasMoney = Boolean(calculation.has_monetary_value ?? calculation.hasMonetaryValue);
  const fullyEnvisioned = state.seasons.length === 4 && state.seasons.every((season) =>
    Boolean(hourlyFlowRateSeasonLocation(season))
    && entriesFor(season.id, 'lodging').some((entry) => Number(entry.base_amount || 0) > 0)
  );
  const flowingLayers = Number(calculation.flowing_layers ?? countFlowingLayers({
    seasons: state.seasons,
    costEntries: state.costEntries,
    monthlyHomeBase: Number(state.homeBase?.monthly_amount || 0),
  }));

  if(!hasMoney){
    rateHero.innerHTML = `<div class="hfr-hero-copy">
      <p class="eyebrow">YOUR SEASONAL SOVEREIGNTY MAP</p>
      <h1>Choose your locations and price your lodging.</h1>
      <p>Begin with the four places you want to live, then enter the lodging amount required for each season.</p>
      <a class="hfr-button hfr-button--soft" href="#seasonMap">Choose your locations</a>
    </div>
    <div class="hfr-hero-seal" aria-hidden="true"><span>12</span><small>Inner Summer weeks</small></div>`;
    return;
  }

  const label = fullyEnvisioned ? 'YOUR HOURLY FLOW RATE' : 'YOUR EMERGING HOURLY FLOW RATE';
  const heroRate = Math.round(Number((calculation.hourly_flow_rate ?? calculation.hourlyFlowRate) || 0));
  rateHero.innerHTML = `<div class="hfr-hero-copy">
    <p class="eyebrow">${label}</p>
    <h1>${money(heroRate, { exact: false })}<span>/ HOUR</span></h1>
    <p>Based on the layers you have welcomed so far. ${flowingLayers} ${flowingLayers === 1 ? 'layer of your vision is' : 'layers of your vision are'} currently flowing.</p>
    <p class="hfr-worth-note">This is the revenue capacity required to resource your vision—not a statement of your human worth and not a requirement to sell one-hour appointments.</p>
  </div>
  <div class="hfr-rate-breakdown">
    <div><span>Annual Current Expenses</span><strong>${money(calculation.annual_home_base ?? calculation.annualHomeBase)}</strong></div>
    <div><span>Seasonal Freedom</span><strong>${money(calculation.seasonal_freedom ?? calculation.seasonalFreedom)}</strong></div>
    <div><span>Annual Vision Total</span><strong>${money(calculation.annual_vision_total ?? calculation.annualVisionTotal)}</strong></div>
    <div><span>Base Rate ÷ 480</span><strong>${money(calculation.base_hourly_rate ?? calculation.baseHourlyRate)} / hour</strong></div>
    <div><span>Fixed Flow Multiplier</span><strong>2.00×</strong></div>
    <div class="final"><span>Hourly Flow Rate</span><strong>${money(calculation.hourly_flow_rate ?? calculation.hourlyFlowRate)} / hour</strong></div>
  </div>`;
}

function renderCurrencyRoom(){
  const hasMoney = Boolean(state.calculation?.has_monetary_value ?? state.calculation?.hasMonetaryValue);
  currencyRoom.innerHTML = `<div>
    <p class="eyebrow">BASE CURRENCY</p>
    <h2>One currency holds the calculation.</h2>
    <p>Enter every calculated amount in this base currency. When a listing uses another currency, preserve its original amount alongside your manual base-currency amount.</p>
  </div>
  <label class="hfr-currency-control"><span>Base currency</span>
    <select id="baseCurrency" ${hasMoney ? 'disabled' : ''}>
      ${CURRENCY_OPTIONS.map((item) => `<option value="${item.code}" ${item.code === state.plan?.base_currency ? 'selected' : ''}>${escapeHtml(item.code)} — ${escapeHtml(item.label)}</option>`).join('')}
    </select>
    <small>${hasMoney ? 'Held steady now that money is flowing.' : 'Choose this before adding costs.'}</small>
  </label>`;
}

function renderSeasonMap(){
  seasonMap.innerHTML = state.seasons.map((season) => {
    const status = seasonStatus({ season, costEntries: state.costEntries });
    const selected = season.id === activeSeasonId;
    const destination = hourlyFlowRateSeasonLocation(season);
    return `<button type="button" class="hfr-season-card ${selected ? 'active' : ''}" data-season-id="${escapeHtml(season.id)}" aria-pressed="${selected}">
      <span class="hfr-season-number">${String(season.sort_order).padStart(2, '0')}</span>
      <p class="eyebrow">${Number(season.sort_order) === 1 ? 'SUGGESTED FIRST' : 'OPEN SEASON'}</p>
      <h3>${escapeHtml(seasonDisplayName(season))}</h3>
      <p class="hfr-date-range">${escapeHtml(formatSeasonDateRange(season))}</p>
      <strong>${escapeHtml(destination || 'Choose a place')}</strong>
      <span class="hfr-status">${escapeHtml(status)}</span>
    </button>`;
  }).join('');
}

function destinationForm(season){
  const locationLabel = hourlyFlowRateSeasonLocation(season);
  return `<form id="destinationForm" class="hfr-form hfr-destination-form">
    <div class="hfr-form-heading"><div><p class="eyebrow">MOMENT 1 — CHOOSE A LOCATION</p><h3>${escapeHtml(seasonDisplayName(season))} Location</h3></div><p>Start with the place. The financial details come next.</p></div>
    <label><span>${escapeHtml(String(season.season_key || 'season').replace(/^./, (letter) => letter.toUpperCase()))} Location</span><input name="location_label" value="${escapeHtml(locationLabel)}" placeholder="Carmel-by-the-Sea, California" maxlength="220" /></label>
    <div class="hfr-form-actions"><button class="hfr-button" type="submit">Save Location</button><span id="destinationMessage" class="hfr-inline-message"></span></div>
  </form>`;
}

function savedEntryCard(entry){
  const original = entry.original_amount && entry.original_currency
    ? `<small>Original: ${escapeHtml(entry.original_currency)} ${Number(entry.original_amount).toFixed(2)}</small>`
    : '';
  const source = safeHref(entry.source_url);
  const dates = entry.starts_on || entry.ends_on
    ? `<small>${escapeHtml(dateInputValue(entry.starts_on) || 'Open')} – ${escapeHtml(dateInputValue(entry.ends_on) || 'Open')}</small>`
    : '';
  const researched = entry.researched_on ? `<small>Researched ${escapeHtml(dateInputValue(entry.researched_on))}</small>` : '';
  return `<article class="hfr-saved-entry">
    <div><strong>${escapeHtml(entry.label || LAYER_LABELS[entry.layer_key] || 'Saved layer')}</strong>${dates}${researched}${original}${entry.frequency_label ? `<small>${escapeHtml(entry.frequency_label)}</small>` : ''}</div>
    <div class="hfr-saved-entry-value"><strong>${money(entry.base_amount)}</strong>${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Open source</a>` : ''}</div>
    <div class="hfr-saved-entry-actions"><button type="button" data-edit-entry="${escapeHtml(entry.id)}">Edit</button><button type="button" data-delete-entry="${escapeHtml(entry.id)}">Remove</button></div>
  </article>`;
}

function currencyOptions(selected = ''){
  const known = new Set(CURRENCY_OPTIONS.map((item) => item.code));
  const extra = selected && !known.has(selected) ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : '';
  return `${extra}<option value="">No original currency</option>${CURRENCY_OPTIONS.map((item) => `<option value="${item.code}" ${item.code === selected ? 'selected' : ''}>${item.code}</option>`).join('')}`;
}

function lodgingRoom(season){
  const entries = entriesFor(season.id, 'lodging');
  const primary = entries[0] || null;
  const total = entries.reduce((sum, entry) => sum + Number(entry.base_amount || 0), 0);
  return `<section class="hfr-layer-room hfr-layer-room--lodging">
    <div class="hfr-layer-heading"><div><p class="eyebrow">MOMENT 2 — LODGING COST</p><h3>Enter the cost of your seasonal lodging.</h3></div><p>Use the total amount needed to cover lodging during the dates of this season. Save the listing link if you want to return to it.</p></div>
    <form id="lodgingForm" class="hfr-form hfr-cost-form hfr-simple-lodging-form" data-layer-key="lodging" data-entry-mode="detailed">
      <input type="hidden" name="entry_id" value="${escapeHtml(primary?.id || '')}" />
      <input type="hidden" name="label" value="Seasonal lodging" />
      <input type="hidden" name="starts_on" value="${escapeHtml(dateInputValue(season.starts_on))}" />
      <input type="hidden" name="ends_on" value="${escapeHtml(dateInputValue(season.ends_on))}" />
      <input type="hidden" name="fees_status" value="unsure" />
      <input type="hidden" name="researched_on" value="${escapeHtml(dateInputValue(primary?.researched_on) || flowtelDateISO())}" />
      <div class="hfr-grid hfr-grid--two">
        <label><span>Seasonal lodging cost in ${escapeHtml(state.plan.base_currency)}</span><input name="base_amount" type="number" min="0" step="0.01" inputmode="decimal" required value="${primary && Number(primary.base_amount)>0 ? Number(primary.base_amount).toFixed(2) : ''}" placeholder="0.00" /></label>
        <label><span>Listing link <small>optional</small></span><input name="source_url" type="url" value="${escapeHtml(primary?.source_url || '')}" placeholder="https://…" /></label>
      </div>
      <div class="hfr-form-actions"><button class="hfr-button" type="submit">Save Lodging Cost</button><span class="hfr-inline-message"></span></div>
    </form>
    ${total > 0 ? `<p class="hfr-simple-lodging-summary">Current lodging total for this season: <strong>${money(total)}</strong>${entries.length > 1 ? ` · ${entries.length} preserved lodging records` : ''}</p>` : '<p class="hfr-empty-invitation">No lodging amount has been entered yet.</p>'}
  </section>`;
}

function layerEffectiveTotal(seasonId, layerKey){
  return Number(layerTotals(state.costEntries).get(`${seasonId}:${layerKey}`) || 0);
}

function detailedBuilderMarkup(season, config){
  const researchedOn = flowtelDateISO();
  const originalFields = `<div class="hfr-grid hfr-grid--two">
    <label><span>Original amount <small>optional</small></span><input name="original_amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" /></label>
    <label><span>Original currency</span><select name="original_currency">${currencyOptions('')}</select></label>
  </div>`;
  const researchFields = `<div class="hfr-grid hfr-grid--two">
    <label><span>Source link <small>optional</small></span><input name="source_url" type="url" placeholder="https://…" /></label>
    <label><span>Price researched on</span><input name="researched_on" type="date" value="${researchedOn}" /></label>
  </div>`;

  if(config.key === 'nourishment'){
    const days = inclusiveDayCount(season.starts_on, season.ends_on);
    return `<form class="hfr-form hfr-cost-form hfr-detailed-form" data-layer-key="nourishment" data-entry-mode="detailed" data-calculation="nourishment">
      <input type="hidden" name="entry_id" /><input type="hidden" name="label" value="Detailed seasonal nourishment" /><input type="hidden" name="base_amount" value="0" />
      <p class="eyebrow">BUILD THE FULL VISION</p>
      <p class="hfr-builder-note">Price breakfast, lunch, and dinner across the actual ${days}-day season. The service allowance is editable and begins at 25%.</p>
      <div class="hfr-grid hfr-grid--three">
        <label><span>Average breakfast</span><input name="average_breakfast" type="number" min="0" step="0.01" inputmode="decimal" required placeholder="0.00" /></label>
        <label><span>Average lunch</span><input name="average_lunch" type="number" min="0" step="0.01" inputmode="decimal" required placeholder="0.00" /></label>
        <label><span>Average dinner</span><input name="average_dinner" type="number" min="0" step="0.01" inputmode="decimal" required placeholder="0.00" /></label>
      </div>
      <div class="hfr-grid hfr-grid--two">
        <label><span>Tax & gratuity allowance</span><div class="hfr-suffix-input"><input name="service_allowance_percent" type="number" min="0" step="0.1" inputmode="decimal" value="25" /><span>%</span></div></label>
        <div class="hfr-calculated-total"><span>Detailed season total</span><strong data-calculated-total>${money(0)}</strong><small>${days} actual days</small></div>
      </div>
      ${originalFields}${researchFields}
      <label><span>Private note <small>optional</small></span><input name="private_note" placeholder="What would abundant nourishment make possible?" /></label>
      <div class="hfr-form-actions"><button class="hfr-button" type="submit">Save detailed nourishment</button><button class="hfr-text-button" type="button" data-clear-nearest hidden>Cancel edit</button><span class="hfr-inline-message"></span></div>
    </form>`;
  }

  if(config.key === 'self_care'){
    return `<form class="hfr-form hfr-cost-form hfr-detailed-form" data-layer-key="self_care" data-entry-mode="detailed" data-calculation="self-care">
      <input type="hidden" name="entry_id" /><input type="hidden" name="base_amount" value="0" />
      <p class="eyebrow">BUILD THE FULL VISION</p>
      <label><span>Service or support</span><input name="label" required placeholder="Massage, therapy, beauty ritual, practitioner…" /></label>
      <div class="hfr-grid hfr-grid--three">
        <label><span>Cost per appointment</span><input name="cost_per_appointment" type="number" min="0" step="0.01" inputmode="decimal" required placeholder="0.00" /></label>
        <label><span>Appointments this season</span><input name="appointments" type="number" min="0" step="0.25" inputmode="decimal" required placeholder="0" /></label>
        <label><span>Frequency / context</span><select name="frequency_label"><option value="custom">Custom</option><option value="Weekly">Weekly</option><option value="Every two weeks">Every two weeks</option><option value="Monthly">Monthly</option><option value="Once per season">Once per season</option></select></label>
      </div>
      <div class="hfr-calculated-total hfr-calculated-total--wide"><span>Service total</span><strong data-calculated-total>${money(0)}</strong><small>Cost per appointment × appointments</small></div>
      ${originalFields}${researchFields}
      <label><span>Private note <small>optional</small></span><input name="private_note" placeholder="How does this care support your body and medicine?" /></label>
      <div class="hfr-form-actions"><button class="hfr-button" type="submit">Add detailed care</button><button class="hfr-text-button" type="button" data-clear-nearest hidden>Cancel edit</button><span class="hfr-inline-message"></span></div>
    </form>`;
  }

  return `<form class="hfr-form hfr-cost-form hfr-detailed-form" data-layer-key="${config.key}" data-entry-mode="detailed">
    <input type="hidden" name="entry_id" />
    <p class="eyebrow">BUILD THE FULL VISION</p>
    <label><span>Item or support</span><input name="label" required placeholder="${escapeHtml(config.labelPlaceholder)}" /></label>
    <div class="hfr-grid hfr-grid--two">
      <label><span>Amount in ${escapeHtml(state.plan.base_currency)}</span><input name="base_amount" type="number" min="0" step="0.01" inputmode="decimal" required placeholder="0.00" /></label>
      <label><span>Frequency / context</span><input name="frequency_label" placeholder="Once, weekly, throughout the season…" /></label>
    </div>
    ${originalFields}${researchFields}
    <label><span>Private note <small>optional</small></span><input name="private_note" placeholder="What makes this support meaningful?" /></label>
    <div class="hfr-form-actions"><button class="hfr-button" type="submit">Add detailed item</button><button class="hfr-text-button" type="button" data-clear-nearest hidden>Cancel edit</button><span class="hfr-inline-message"></span></div>
  </form>`;
}

function optionalLayerRoom(season, config){
  const entries = entriesFor(season.id, config.key);
  const estimate = entries.find((entry) => entry.entry_mode === 'estimate') || null;
  const detailed = entries.filter((entry) => entry.entry_mode === 'detailed');
  const hasDetailedMoney = detailed.some((entry) => Number(entry.base_amount) > 0);
  const total = layerEffectiveTotal(season.id, config.key);
  return `<details class="hfr-layer-room hfr-layer-room--optional" ${total > 0 ? 'open' : ''}>
    <summary><span><small>${escapeHtml(config.eyebrow)}</small><strong>${escapeHtml(LAYER_LABELS[config.key])}</strong></span><span>${total > 0 ? money(total) : 'Add when called'}</span></summary>
    <div class="hfr-optional-body">
      <p>${escapeHtml(config.invitation)}</p>
      <div class="hfr-depth-grid">
        <form class="hfr-form hfr-cost-form hfr-estimate-form" data-layer-key="${config.key}" data-entry-mode="estimate">
          <input type="hidden" name="entry_id" value="${escapeHtml(estimate?.id || '')}" />
          <p class="eyebrow">ADD A SIMPLE ESTIMATE</p>
          <label><span>Season total in ${escapeHtml(state.plan.base_currency)}</span><input name="base_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${estimate ? Number(estimate.base_amount).toFixed(2) : ''}" placeholder="0.00" /></label>
          <div class="hfr-grid hfr-grid--two">
            <label><span>Original amount <small>optional</small></span><input name="original_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${estimate?.original_amount ?? ''}" placeholder="0.00" /></label>
            <label><span>Original currency</span><select name="original_currency">${currencyOptions(estimate?.original_currency || '')}</select></label>
          </div>
          <label><span>Price researched on</span><input name="researched_on" type="date" value="${dateInputValue(estimate?.researched_on) || flowtelDateISO()}" /></label>
          <label><span>Private note <small>optional</small></span><input name="private_note" value="${escapeHtml(estimate?.private_note || '')}" placeholder="What does this estimate hold?" /></label>
          <div class="hfr-form-actions"><button class="hfr-button hfr-button--soft" type="submit">Save estimate</button><span class="hfr-inline-message"></span></div>
          ${hasDetailedMoney && estimate && Number(estimate.base_amount) > 0 ? '<p class="hfr-gentle-note">Your estimate is preserved, while the detailed build now carries this layer in the calculation.</p>' : ''}
        </form>
        ${detailedBuilderMarkup(season, config)}
      </div>
      ${detailed.length ? `<div class="hfr-saved-list">${detailed.map(savedEntryCard).join('')}</div>` : ''}
    </div>
  </details>`;
}
function renderSeasonStudio(){
  const season = activeSeason();
  if(!season){ seasonStudio.innerHTML = ''; return; }
  seasonStudio.innerHTML = `<section class="hfr-card hfr-season-heading-card">
    <div><p class="eyebrow">OPEN SEASONAL ROOM</p><h2>${escapeHtml(seasonDisplayName(season))}</h2><p>${escapeHtml(formatSeasonDateRange(season))}</p></div>
    <span class="hfr-status hfr-status--large">${escapeHtml(seasonStatus({ season, costEntries: state.costEntries }))}</span>
  </section>
  <section class="hfr-card">${destinationForm(season)}</section>
  <section class="hfr-card">${lodgingRoom(season)}</section>`;
}

function renderLifestyleLayers(){
  lifestyleLayersRoom.innerHTML = `<div class="hfr-section-heading"><p class="eyebrow">MOMENT 4 — LIFESTYLE LAYERS</p><h2>Lifestyle Layers are coming soon.</h2><p>For now, focus only on your seasonal locations, lodging totals, and current expenses. These future rooms remain visible so you know what is being prepared, but they are sealed and non-interactive.</p></div><div class="hfr-locked-layer-grid">${OPTIONAL_LAYERS.map((config)=>`<article class="hfr-locked-layer" aria-disabled="true"><span>COMING SOON</span><p class="eyebrow">${escapeHtml(config.eyebrow)}</p><h3>${escapeHtml(LAYER_LABELS[config.key])}</h3><p>${escapeHtml(config.invitation)}</p></article>`).join('')}</div>`;
}

function renderHomeBase(){
  const home = state.homeBase || {};
  homeBaseRoom.innerHTML = `<div class="hfr-section-heading">
    <p class="eyebrow">MOMENT 3 — CURRENT EXPENSES</p>
    <h2>Include your current expenses.</h2>
    <p>Review your current monthly expenses privately, then enter the total monthly amount below. Flowtel stores only the final total—not an itemized expense ledger. This amount is added to your seasonal lodging costs when calculating your Hourly Flow Rate.</p>
  </div>
  <form id="homeBaseForm" class="hfr-form">
    <div class="hfr-grid hfr-grid--two">
      <label><span>Monthly Current Expenses in ${escapeHtml(state.plan.base_currency)}</span><input name="monthly_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(home.monthly_amount || 0) > 0 ? Number(home.monthly_amount).toFixed(2) : ''}" placeholder="0.00" /></label>
      <label><span>Date Reviewed</span><input name="reviewed_on" type="date" value="${dateInputValue(home.reviewed_on)}" /></label>
    </div>
    <label class="hfr-check"><input name="privately_confirmed" type="checkbox" ${home.privately_confirmed ? 'checked' : ''} /><span>I reviewed my current expenses privately and am saving only the final monthly total.</span></label>
    <label><span>Notes <small>optional</small></span><textarea name="private_reflection" rows="3" placeholder="Anything you want to remember about this total?">${escapeHtml(home.private_reflection || '')}</textarea></label>
    <div class="hfr-form-actions"><button class="hfr-button" type="submit">Save Current Expenses</button><span class="hfr-inline-message"></span></div>
  </form>`;
}

function snapshotLabel(snapshot){
  const reason = String(snapshot.reason || 'The vision expanded').replace(/Home Base/gi, 'Current Expenses');
  const date = new Date(snapshot.created_at);
  const dateLabel = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  return `<article class="hfr-timeline-entry"><span aria-hidden="true"></span><div><p class="eyebrow">${escapeHtml(dateLabel)}</p><h3>${escapeHtml(reason)}</h3><p>${Number(snapshot.flowing_layers || 0)} layers flowing · Annual vision ${money(snapshot.annual_vision_total)}</p></div><strong>${money(snapshot.hourly_flow_rate)} / hour</strong></article>`;
}

function renderTimeline(){
  timelineRoom.innerHTML = `<div class="hfr-section-heading"><p class="eyebrow">YOUR RECEIVING TIMELINE</p><h2>Your Receiving Timeline.</h2><p>Flowtel remembers meaningful saved movements—not every keystroke.</p></div>
    <div class="hfr-timeline">${state.snapshots.length ? state.snapshots.map(snapshotLabel).join('') : '<p class="hfr-empty-invitation">Your first timeline moment will arrive after a valid monetary layer is saved.</p>'}</div>`;
}

function renderWitness(){
  witnessRoom.innerHTML = `<div class="hfr-section-heading"><p class="eyebrow">PRIVATE WITNESSING</p><h2>What happens in your body when you see this vision?</h2><p>Reflection is invited, never required.</p></div>
  <form id="witnessForm" class="hfr-form">
    <textarea name="witness_reflection" rows="4" placeholder="A private note to your future self…">${escapeHtml(state.plan?.witness_reflection || '')}</textarea>
    <div class="hfr-form-actions"><button class="hfr-button hfr-button--soft" type="submit">Save reflection</button><span class="hfr-inline-message"></span></div>
  </form>
  <aside class="hfr-teaching-note"><strong>12 Inner Summer weeks × 40 Self-Care Hours = 480 annual hours.</strong><p>These are not assumed to be 480 client-facing or billable hours. They hold body care, restoration, medicine, creativity, visibility, service, integration, celebration, and receiving.</p><p class="hfr-disclaimer">This private tool is a visioning and educational exercise, not financial, tax, legal, or investment advice.</p></aside>`;
}

function render(){
  renderHero();
  renderCurrencyRoom();
  renderSeasonMap();
  renderSeasonStudio();
  renderHomeBase();
  renderLifestyleLayers();
  renderTimeline();
  renderWitness();
  bindEvents();
}

async function runAction(action, successMessage, inlineNode = null){
  if(busy) return;
  busy = true;
  setMessage('Flowtel is tending to this room…');
  if(inlineNode) inlineNode.textContent = 'Saving…';
  try{
    const payload = await action();
    applyPayload(payload);
    setMessage(successMessage, 'success');
  }catch(error){
    console.error(error);
    const message = error?.message || 'This room could not be saved yet.';
    setMessage(message, 'error');
    if(inlineNode) inlineNode.textContent = message;
  }finally{
    busy = false;
  }
}

function costFormPayload(form, season, layerKey, entryMode){
  const data = new FormData(form);
  const originalAmountRaw = data.get('original_amount');
  const originalCurrency = data.get('original_currency') || null;
  if(originalAmountRaw !== '' && originalAmountRaw !== null && !originalCurrency){
    throw new Error('Choose the original currency for the original amount.');
  }
  if(originalCurrency && (originalAmountRaw === '' || originalAmountRaw === null)){
    throw new Error('Add the original amount or clear the original currency.');
  }

  let baseAmount = cleanNumber(data.get('base_amount'));
  let quantity = data.get('quantity') || null;
  let frequencyLabel = data.get('frequency_label') || '';
  let details = {};

  if(form.dataset.calculation === 'nourishment'){
    const result = calculateNourishmentTotal({
      averageBreakfast: cleanNumber(data.get('average_breakfast')),
      averageLunch: cleanNumber(data.get('average_lunch')),
      averageDinner: cleanNumber(data.get('average_dinner')),
      dayCount: inclusiveDayCount(season.starts_on, season.ends_on),
      serviceAllowancePercent: cleanNumber(data.get('service_allowance_percent')),
    });
    baseAmount = result.total;
    quantity = result.dayCount;
    frequencyLabel = `${result.dayCount} actual days · ${result.serviceAllowancePercent}% allowance`;
    details = {
      calculation: 'nourishment',
      average_breakfast: cleanNumber(data.get('average_breakfast')),
      average_lunch: cleanNumber(data.get('average_lunch')),
      average_dinner: cleanNumber(data.get('average_dinner')),
      day_count: result.dayCount,
      service_allowance_percent: result.serviceAllowancePercent,
      meals_total: result.mealsTotal,
      service_allowance_total: result.serviceAllowanceTotal,
    };
  }

  if(form.dataset.calculation === 'self-care'){
    const costPerAppointment = cleanNumber(data.get('cost_per_appointment'));
    const appointments = cleanNumber(data.get('appointments'));
    baseAmount = calculateSelfCareServiceTotal({ costPerAppointment, appointments });
    quantity = appointments;
    details = {
      calculation: 'self_care_service',
      cost_per_appointment: costPerAppointment,
      appointments,
    };
  }

  return {
    planId: state.plan.id,
    seasonId: season.id,
    layerKey,
    entryMode,
    entryId: data.get('entry_id') || null,
    baseAmount,
    label: data.get('label') || '',
    sourceUrl: data.get('source_url') || '',
    startsOn: data.get('starts_on') || null,
    endsOn: data.get('ends_on') || null,
    quantity,
    frequencyLabel,
    feesStatus: data.get('fees_status') || null,
    originalAmount: originalAmountRaw === '' || originalAmountRaw === null ? null : cleanNumber(originalAmountRaw),
    originalCurrency,
    privateNote: data.get('private_note') || '',
    researchedOn: data.get('researched_on') || flowtelDateISO(),
    details,
  };
}

function updateCalculatedPreview(form, season){
  const output = form.querySelector('[data-calculated-total]');
  const hidden = form.querySelector('[name="base_amount"]');
  if(!output || !hidden) return;
  try{
    let total = 0;
    if(form.dataset.calculation === 'nourishment'){
      total = calculateNourishmentTotal({
        averageBreakfast: cleanNumber(form.elements.average_breakfast?.value),
        averageLunch: cleanNumber(form.elements.average_lunch?.value),
        averageDinner: cleanNumber(form.elements.average_dinner?.value),
        dayCount: inclusiveDayCount(season.starts_on, season.ends_on),
        serviceAllowancePercent: cleanNumber(form.elements.service_allowance_percent?.value),
      }).total;
    }
    if(form.dataset.calculation === 'self-care'){
      total = calculateSelfCareServiceTotal({
        costPerAppointment: cleanNumber(form.elements.cost_per_appointment?.value),
        appointments: cleanNumber(form.elements.appointments?.value),
      });
    }
    hidden.value = total.toFixed(2);
    output.textContent = money(total);
  }catch(_error){
    hidden.value = '0';
    output.textContent = money(0);
  }
}

function resetCostForm(form, season){
  form.reset();
  const entryId = form.querySelector('[name="entry_id"]');
  if(entryId) entryId.value = '';
  const researchedOn = form.querySelector('[name="researched_on"]');
  if(researchedOn) researchedOn.value = flowtelDateISO();
  if(form.id === 'lodgingForm'){
    const starts=form.querySelector('[name="starts_on"]'); if(starts) starts.value=dateInputValue(season.starts_on);
    const ends=form.querySelector('[name="ends_on"]'); if(ends) ends.value=dateInputValue(season.ends_on);
    const fees=form.querySelector('[name="fees_status"]'); if(fees) fees.value='unsure';
  }
  if(form.dataset.calculation === 'nourishment') form.elements.service_allowance_percent.value = '25';
  updateCalculatedPreview(form, season);
  const cancel = form.querySelector('[data-clear-form], [data-clear-nearest]');
  if(cancel) cancel.hidden = true;
}

function fillCostForm(form, entry, season){
  const fields = ['entry_id','label','source_url','starts_on','ends_on','quantity','frequency_label','fees_status','base_amount','original_amount','original_currency','private_note','researched_on'];
  for(const field of fields){
    const input = form.querySelector(`[name="${field}"]`);
    if(!input) continue;
    const value = field === 'entry_id' ? entry.id : entry[field];
    input.value = value ?? '';
  }
  const details = entry.details && typeof entry.details === 'object' ? entry.details : {};
  for(const [key, value] of Object.entries(details)){
    const input = form.querySelector(`[name="${key}"]`);
    if(input) input.value = value ?? '';
  }
  if(form.dataset.calculation === 'self-care'){
    if(form.elements.cost_per_appointment) form.elements.cost_per_appointment.value = details.cost_per_appointment ?? '';
    if(form.elements.appointments) form.elements.appointments.value = details.appointments ?? entry.quantity ?? '';
  }
  updateCalculatedPreview(form, season);
  const cancel = form.querySelector('[data-clear-form], [data-clear-nearest]');
  if(cancel) cancel.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function bindEvents(){
  const season = activeSeason();
  document.getElementById('baseCurrency')?.addEventListener('change', (event) => {
    runAction(
      () => setHourlyFlowRateBaseCurrency({ planId: state.plan.id, baseCurrency: event.target.value }),
      `Your base currency is now ${event.target.value}.`,
    );
  });

  seasonMap.querySelectorAll('[data-season-id]').forEach((button) => button.addEventListener('click', async () => {
    activeSeasonId = button.dataset.seasonId;
    render();
    seasonStudio.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try{
      const payload = await saveHourlyFlowRatePlanState({ planId: state.plan.id, lastOpenSection: `season-${activeSeasonId}`, witnessReflection: state.plan.witness_reflection || null });
      applyPayload(payload);
    }catch(error){ console.warn('The selected room could not be remembered yet.', error); }
  }));

  document.getElementById('destinationForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const inline = event.currentTarget.querySelector('.hfr-inline-message');
    runAction(() => saveHourlyFlowRateSeasonLocation({
      seasonId: season.id,
      locationLabel: data.get('location_label'),
      lastOpenSection: `season-${season.id}`,
      callingReflection: season.calling_reflection || '',
      inspirationUrl: season.inspiration_url || '',
    }), 'This seasonal destination is resting safely in your map.', inline);
  });

  seasonStudio.querySelectorAll('.hfr-cost-form').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    const inline = form.querySelector('.hfr-inline-message');
    let payload;
    try{ payload = costFormPayload(form, season, form.dataset.layerKey, form.dataset.entryMode); }
    catch(error){ inline.textContent = error.message; return; }
    runAction(() => saveHourlyFlowRateCostEntry(payload), `${LAYER_LABELS[form.dataset.layerKey]} has been welcomed into the vision.`, inline);
  }));

  seasonStudio.querySelectorAll('[data-edit-entry]').forEach((button) => button.addEventListener('click', () => {
    const entry = state.costEntries.find((item) => item.id === button.dataset.editEntry);
    if(!entry) return;
    const selector = entry.layer_key === 'lodging'
      ? '#lodgingForm'
      : `.hfr-cost-form[data-layer-key="${entry.layer_key}"][data-entry-mode="${entry.entry_mode}"]`;
    const form = seasonStudio.querySelector(selector);
    if(form) fillCostForm(form, entry, season);
  }));

  seasonStudio.querySelectorAll('[data-delete-entry]').forEach((button) => button.addEventListener('click', () => {
    if(!window.confirm('Remove this saved amount from the living vision? Its earlier Receiving Timeline moments remain preserved.')) return;
    runAction(() => deleteHourlyFlowRateCostEntry(button.dataset.deleteEntry), 'The living vision has been gently revised.');
  }));

  seasonStudio.querySelectorAll('[data-clear-form]').forEach((button) => button.addEventListener('click', () => {
    const form = document.getElementById(button.dataset.clearForm);
    if(form) resetCostForm(form, season);
  }));
  seasonStudio.querySelectorAll('[data-clear-nearest]').forEach((button) => button.addEventListener('click', () => resetCostForm(button.closest('form'), season)));

  seasonStudio.querySelectorAll('[data-calculation]').forEach((form) => {
    updateCalculatedPreview(form, season);
    form.addEventListener('input', () => updateCalculatedPreview(form, season));
    form.addEventListener('change', () => updateCalculatedPreview(form, season));
  });

  document.getElementById('homeBaseForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const inline = event.currentTarget.querySelector('.hfr-inline-message');
    let amount;
    try{ amount = cleanNumber(data.get('monthly_amount')); }
    catch(error){ inline.textContent = error.message; return; }
    runAction(() => saveHourlyFlowRateHomeBase({
      planId: state.plan.id,
      monthlyAmount: amount,
      reviewedOn: data.get('reviewed_on') || null,
      privatelyConfirmed: data.get('privately_confirmed') === 'on',
      privateReflection: data.get('private_reflection') || '',
    }), 'Your current expenses are held privately in this vision.', inline);
  });

  document.getElementById('witnessForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const inline = event.currentTarget.querySelector('.hfr-inline-message');
    runAction(() => saveHourlyFlowRatePlanState({
      planId: state.plan.id,
      lastOpenSection: 'witness',
      witnessReflection: data.get('witness_reflection') || '',
    }), 'Your private reflection has been remembered.', inline);
  });
}

function restoreLastRoom(){
  const last = String(state.plan?.last_open_section || '');
  let target = null;
  if(last === 'home-base') target = homeBaseRoom;
  if(last === 'witness') target = witnessRoom;
  if(last.startsWith('season-')) target = seasonStudio;
  if(target) window.setTimeout(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }), 0);
}

async function init(){
  topNav.innerHTML = renderTopNav('hourly-flow-rate');
  setMessage('Opening your private receiving room…');
  try{
    profile = await getCurrentProfile();
    if(!profile){
      renderGate('Your room key is needed.', 'Sign in through the Flowtel doorway to create or restore your private Hourly Flow Rate plan.');
      setMessage('');
      return;
    }
    if(!canAccessHourlyFlowRate(profile)){
      renderGate('This room belongs to Flow FM.', 'The Hourly Flow Rate MVP is opening first for Flow FM and Council members cultivating the BIG VISION.', '/flow-fm/', 'Return to Initiation Hall');
      setMessage('');
      return;
    }
    const payload = await loadHourlyFlowRatePlan({ createIfMissing: true });
    state = normalizedHourlyFlowRatePayload(payload);
    activeSeasonId = resolveRestoredSeasonId();
    accessGate.hidden = true;
    experience.hidden = false;
    render();
    restoreLastRoom();
    const name = displayNameForProfile(profile, 'Priestess');
    setMessage(`Welcome, ${name}. Your seasonal vision has been restored.`, 'success');
  }catch(error){
    console.error(error);
    if(isProductAccessError(error)){
      redirectForDeniedProduct('flowtel');
      return;
    }
    renderGate('This room is still being prepared.', error?.message || 'Flowtel could not open the Hourly Flow Rate room yet.', '/flow-fm/', 'Return to Initiation Hall');
    setMessage('');
  }
}

init();
