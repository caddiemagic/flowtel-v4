import { getCurrentProfile } from '/shared/flowtel.js?v=0.10.79';
import { effectiveFlowFmRank } from '/shared/rollout.js?v=0.10.64';
import { renderTopNav, escapeHtml } from '/flow-fm/ui.js?v=0.10.79';
import { loadFlowFmAvailability, saveFlowFmAvailabilitySeason } from '/shared/flow-fm-availability.js?v=0.10.79';
import {
  FLOW_FM_INNER_SEASONS,
  FLOW_FM_WEEKDAYS,
  FLOW_FM_AVAILABILITY_PRESETS,
  normalizeFlowFmAvailabilityWindows,
  flowFmAvailabilityWindowsEqual,
  matchingFlowFmAvailabilityPreset,
  summarizeFlowFmAvailabilityDays,
  formatFlowFmAvailabilityDayList,
  formatFlowFmAvailabilityTime,
} from '/shared/flow-fm-availability-core.js?v=0.10.79';

const topNav=document.getElementById('topNav');
const experience=document.getElementById('availabilityExperience');
const gate=document.getElementById('availabilityGate');
const overview=document.getElementById('availabilityOverview');
const editor=document.getElementById('availabilityEditor');
const anchorCopy=document.getElementById('availabilityAnchorCopy');
const message=document.getElementById('availabilityMessage');
let state=null;
let draft=null;

const SEASON_DETAILS={
  'Inner Winter':{label:'WINTER',invitation:'Protect rest, restoration and quieter connection.'},
  'Inner Spring':{label:'SPRING',invitation:'Make room for new ideas and lighter connection.'},
  'Inner Summer':{label:'SUMMER',invitation:'Choose the rhythm that supports visibility and client care.'},
  'Inner Autumn':{label:'AUTUMN',invitation:'Leave space for completion, review and refinement.'},
};

function savedWindowsFor(season,weekday){
  return (Array.isArray(state?.windows)?state.windows:[])
    .filter(item=>item.inner_season===season&&Number(item.weekday)===Number(weekday))
    .sort((a,b)=>Number(a.window_order)-Number(b.window_order))
    .map(item=>({start:String(item.starts_at||'').slice(0,5),end:String(item.ends_at||'').slice(0,5)}));
}
function savedDayAvailable(season,weekday,windows){
  const day=(Array.isArray(state?.weekly_days)?state.weekly_days:[])
    .find(item=>item.inner_season===season&&Number(item.weekday)===Number(weekday));
  return day?Boolean(day.is_available):windows.length>0;
}
function seasonDays(season){
  return FLOW_FM_WEEKDAYS.map(({weekday})=>{
    const windows=savedWindowsFor(season,weekday);
    return {weekday,available:savedDayAvailable(season,weekday,windows),windows:normalizeFlowFmAvailabilityWindows(windows)};
  });
}
function buildDraft(season){
  const days=seasonDays(season);
  const selected=days.filter(day=>day.available);
  const firstWindows=selected[0]?.windows||[{start:'09:00',end:'12:00'}];
  const allShared=selected.length>0&&selected.every(day=>flowFmAvailabilityWindowsEqual(day.windows,firstWindows));
  const sharedWindows=normalizeFlowFmAvailabilityWindows(firstWindows);
  const customizedDays=new Set();
  if(selected.length&&!allShared){
    selected.forEach(day=>{if(!flowFmAvailabilityWindowsEqual(day.windows,sharedWindows))customizedDays.add(day.weekday);});
  }
  return {
    season,
    accepting:selected.length>0,
    selectedDays:new Set(selected.map(day=>day.weekday)),
    sharedWindows,
    preset:matchingFlowFmAvailabilityPreset(sharedWindows),
    sourceDays:days,
    customWindows:new Map(days.map(day=>[day.weekday,normalizeFlowFmAvailabilityWindows(day.windows)])),
    customizedDays,
    advancedOpen:customizedDays.size>0,
    copyTargets:new Set(),
  };
}
function seasonCard(season){
  const summary=summarizeFlowFmAvailabilityDays(seasonDays(season));
  const details=SEASON_DETAILS[season];
  return `<article class="availability-season-card" data-season-card="${escapeHtml(season)}">
    <div class="season-card-heading"><p class="eyebrow">INNER ${details.label}</p><span class="season-state">${summary.status==='Resting this season'?'RESTING':'AVAILABLE'}</span></div>
    <h3>${escapeHtml(summary.status)}</h3>
    <p class="season-summary">${escapeHtml(summary.detail)}</p>
    <p class="season-invitation">${escapeHtml(details.invitation)}</p>
    <button type="button" class="edit-rhythm" data-edit-season="${escapeHtml(season)}">Edit rhythm</button>
  </article>`;
}
function renderOverview(){
  overview.innerHTML=FLOW_FM_INNER_SEASONS.map(seasonCard).join('');
  overview.querySelectorAll('[data-edit-season]').forEach(button=>button.addEventListener('click',()=>openEditor(button.dataset.editSeason)));
}
function openEditor(season){
  draft=buildDraft(season);
  message.textContent='';
  renderEditor();
  editor.hidden=false;
  editor.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeEditor(){
  editor.hidden=true;
  editor.innerHTML='';
  draft=null;
}
function timeWindowRow(window,index,scope,weekday=null){
  const dayAttribute=weekday===null?'':` data-weekday="${weekday}"`;
  return `<div class="rhythm-window" data-window-index="${index}" data-window-scope="${scope}"${dayAttribute}>
    <label><span>From</span><input type="time" name="start" value="${escapeHtml(window.start)}" /></label>
    <label><span>To</span><input type="time" name="end" value="${escapeHtml(window.end)}" /></label>
    <button type="button" class="remove-rhythm-window" aria-label="Remove this time window" ${index===0?'hidden':''}>Remove</button>
  </div>`;
}
function reviewText(){
  if(!draft.accepting) return 'No client calls during this Inner Season.';
  const weekdays=[...draft.selectedDays].sort((a,b)=>a-b);
  if(!weekdays.length) return 'Choose at least one available day.';
  const dayText=formatFlowFmAvailabilityDayList(weekdays);
  const hasCustom=[...draft.customizedDays].some(day=>draft.selectedDays.has(day));
  if(hasCustom) return `${dayText} · Individual day hours`;
  if(draft.sharedWindows.length===1){
    return `${dayText} · ${formatFlowFmAvailabilityTime(draft.sharedWindows[0].start)}–${formatFlowFmAvailabilityTime(draft.sharedWindows[0].end)}`;
  }
  return `${dayText} · ${draft.sharedWindows.length} time windows`;
}
function renderEditor(){
  const details=SEASON_DETAILS[draft.season];
  const selectedDays=[...draft.selectedDays].sort((a,b)=>a-b);
  const otherSeasons=FLOW_FM_INNER_SEASONS.filter(season=>season!==draft.season);
  editor.innerHTML=`
    <header class="rhythm-editor-header">
      <div><p class="eyebrow">INNER ${details.label}</p><h2 id="availabilityEditorTitle">Set your ${escapeHtml(details.label.toLowerCase())} rhythm</h2></div>
      <button type="button" class="close-rhythm-editor" aria-label="Close seasonal rhythm editor">Close</button>
    </header>

    <div class="rhythm-step">
      <div class="rhythm-step-number">1</div>
      <div class="rhythm-step-body">
        <h3>Are you accepting client calls during ${escapeHtml(draft.season)}?</h3>
        <div class="choice-row" role="group" aria-label="Choose whether you are accepting calls">
          <button type="button" class="choice-button ${draft.accepting?'is-selected':''}" data-accepting="true">Yes, I’m available</button>
          <button type="button" class="choice-button ${!draft.accepting?'is-selected':''}" data-accepting="false">No calls this season</button>
        </div>
      </div>
    </div>

    <div class="rhythm-guided-flow" ${draft.accepting?'':'hidden'}>
      <div class="rhythm-step">
        <div class="rhythm-step-number">2</div>
        <div class="rhythm-step-body">
          <h3>Which days feel available?</h3>
          <p>Choose only the days you want clients to see as part of your preferred rhythm.</p>
          <div class="weekday-chips" role="group" aria-label="Available weekdays">
            ${FLOW_FM_WEEKDAYS.map(day=>`<button type="button" class="weekday-chip ${draft.selectedDays.has(day.weekday)?'is-selected':''}" data-weekday-chip="${day.weekday}" aria-pressed="${draft.selectedDays.has(day.weekday)}"><span>${escapeHtml(day.shortLabel)}</span><small>${escapeHtml(day.label)}</small></button>`).join('')}
          </div>
        </div>
      </div>

      <div class="rhythm-step">
        <div class="rhythm-step-number">3</div>
        <div class="rhythm-step-body">
          <h3>What time window works for those days?</h3>
          <p>Start with one simple rhythm. You can customize individual days only when you need to.</p>
          <div class="preset-grid" role="group" aria-label="Time rhythm choices">
            ${FLOW_FM_AVAILABILITY_PRESETS.map(preset=>`<button type="button" class="preset-button ${draft.preset===preset.key?'is-selected':''}" data-preset="${preset.key}"><strong>${escapeHtml(preset.label)}</strong><span>${escapeHtml(formatFlowFmAvailabilityTime(preset.start))}–${escapeHtml(formatFlowFmAvailabilityTime(preset.end))}</span></button>`).join('')}
            <button type="button" class="preset-button ${draft.preset==='exact'?'is-selected':''}" data-preset="exact"><strong>Choose exact times</strong><span>Create your own window</span></button>
          </div>
          <div class="shared-window-editor" ${draft.preset==='exact'?'':'hidden'}>
            <div class="shared-window-list">${draft.sharedWindows.map((window,index)=>timeWindowRow(window,index,'shared')).join('')}</div>
            <button type="button" class="add-rhythm-window" data-add-window="shared">Add another time window</button>
          </div>
        </div>
      </div>

      <div class="rhythm-step rhythm-step-optional">
        <div class="rhythm-step-number">4</div>
        <div class="rhythm-step-body">
          <div class="optional-heading"><div><p class="eyebrow">OPTIONAL</p><h3>Do any selected days need different hours?</h3></div><button type="button" class="toggle-custom-days" aria-expanded="${draft.advancedOpen}">${draft.advancedOpen?'Hide custom days':'Customize a day'}</button></div>
          <div class="custom-day-editor" ${draft.advancedOpen?'':'hidden'}>
            ${selectedDays.length?selectedDays.map(weekday=>{
              const info=FLOW_FM_WEEKDAYS.find(day=>day.weekday===weekday);
              const customized=draft.customizedDays.has(weekday);
              const windows=draft.customWindows.get(weekday)||draft.sharedWindows;
              return `<article class="custom-day-card ${customized?'is-customized':''}" data-custom-day="${weekday}">
                <div class="custom-day-heading"><label><input type="checkbox" data-customize-day="${weekday}" ${customized?'checked':''}/><span>Customize ${escapeHtml(info.label)}</span></label><small>${customized?'Different hours':'Using shared rhythm'}</small></div>
                <div class="custom-day-windows" ${customized?'':'hidden'}><div class="custom-window-list">${windows.map((window,index)=>timeWindowRow(window,index,'custom',weekday)).join('')}</div><button type="button" class="add-rhythm-window" data-add-window="custom" data-weekday="${weekday}">Add another time window</button></div>
              </article>`;
            }).join(''):'<p class="quiet-note">Choose at least one available day before customizing hours.</p>'}
          </div>
        </div>
      </div>
    </div>

    <section class="rhythm-review">
      <div><p class="eyebrow">YOUR ${details.label} RHYTHM</p><h3>${escapeHtml(reviewText())}</h3><p>Times are shown in ${escapeHtml(state?.timezone||'your saved profile timezone')}.</p></div>
      <div class="copy-rhythm">
        <p>Use this rhythm in another season</p>
        <div class="copy-season-options">${otherSeasons.map(season=>`<label><input type="checkbox" data-copy-season="${escapeHtml(season)}" ${draft.copyTargets.has(season)?'checked':''}/><span>${escapeHtml(season.replace('Inner ',''))}</span></label>`).join('')}</div>
        <button type="button" class="copy-all-seasons">Use this rhythm all year</button>
      </div>
      <div class="rhythm-actions"><button type="button" class="cancel-rhythm">Cancel</button><button type="button" class="save-rhythm">Save My Rhythm</button></div>
      <p class="editor-message" role="status"></p>
    </section>`;
  bindEditor();
}
function syncDraftFromInputs(){
  if(!draft||editor.hidden) return;
  const sharedRows=[...editor.querySelectorAll('[data-window-scope="shared"]')];
  if(sharedRows.length){
    draft.sharedWindows=sharedRows.map(row=>({start:row.querySelector('[name="start"]').value,end:row.querySelector('[name="end"]').value}));
  }
  editor.querySelectorAll('[data-custom-day]').forEach(card=>{
    const weekday=Number(card.dataset.customDay);
    const rows=[...card.querySelectorAll('[data-window-scope="custom"]')];
    if(rows.length){draft.customWindows.set(weekday,rows.map(row=>({start:row.querySelector('[name="start"]').value,end:row.querySelector('[name="end"]').value})));}
  });
}
function bindEditor(){
  editor.querySelector('.close-rhythm-editor')?.addEventListener('click',closeEditor);
  editor.querySelector('.cancel-rhythm')?.addEventListener('click',closeEditor);
  editor.querySelectorAll('[data-accepting]').forEach(button=>button.addEventListener('click',()=>{
    syncDraftFromInputs();
    draft.accepting=button.dataset.accepting==='true';
    if(draft.accepting&&draft.selectedDays.size===0) draft.selectedDays=new Set([2,3,4]);
    renderEditor();
  }));
  editor.querySelectorAll('[data-weekday-chip]').forEach(button=>button.addEventListener('click',()=>{
    syncDraftFromInputs();
    const weekday=Number(button.dataset.weekdayChip);
    if(draft.selectedDays.has(weekday)){draft.selectedDays.delete(weekday);draft.customizedDays.delete(weekday);}else{draft.selectedDays.add(weekday);if(!draft.customWindows.has(weekday))draft.customWindows.set(weekday,draft.sharedWindows.map(window=>({...window})));}
    renderEditor();
  }));
  editor.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
    syncDraftFromInputs();
    draft.preset=button.dataset.preset;
    const preset=FLOW_FM_AVAILABILITY_PRESETS.find(item=>item.key===draft.preset);
    if(preset) draft.sharedWindows=[{start:preset.start,end:preset.end}];
    renderEditor();
  }));
  editor.querySelector('.toggle-custom-days')?.addEventListener('click',()=>{syncDraftFromInputs();draft.advancedOpen=!draft.advancedOpen;renderEditor();});
  editor.querySelectorAll('[data-customize-day]').forEach(input=>input.addEventListener('change',()=>{
    syncDraftFromInputs();
    const weekday=Number(input.dataset.customizeDay);
    if(input.checked){draft.customizedDays.add(weekday);if(!draft.customWindows.has(weekday))draft.customWindows.set(weekday,draft.sharedWindows.map(window=>({...window})));}else{draft.customizedDays.delete(weekday);}
    renderEditor();
  }));
  editor.querySelectorAll('[data-add-window]').forEach(button=>button.addEventListener('click',()=>{
    syncDraftFromInputs();
    if(button.dataset.addWindow==='shared'){
      if(draft.sharedWindows.length<8) draft.sharedWindows.push({start:'13:00',end:'14:00'});
      draft.preset='exact';
    }else{
      const weekday=Number(button.dataset.weekday);
      const windows=draft.customWindows.get(weekday)||[];
      if(windows.length<8) windows.push({start:'13:00',end:'14:00'});
      draft.customWindows.set(weekday,windows);
    }
    renderEditor();
  }));
  editor.querySelectorAll('.remove-rhythm-window').forEach(button=>button.addEventListener('click',()=>{
    syncDraftFromInputs();
    const row=button.closest('[data-window-index]');
    const index=Number(row.dataset.windowIndex);
    if(row.dataset.windowScope==='shared'&&draft.sharedWindows.length>1){draft.sharedWindows.splice(index,1);draft.preset='exact';}
    if(row.dataset.windowScope==='custom'){
      const weekday=Number(row.dataset.weekday);
      const windows=draft.customWindows.get(weekday)||[];
      if(windows.length>1)windows.splice(index,1);
      draft.customWindows.set(weekday,windows);
    }
    renderEditor();
  }));
  editor.querySelectorAll('[data-copy-season]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)draft.copyTargets.add(input.dataset.copySeason);else draft.copyTargets.delete(input.dataset.copySeason);}));
  editor.querySelector('.copy-all-seasons')?.addEventListener('click',()=>{
    FLOW_FM_INNER_SEASONS.filter(season=>season!==draft.season).forEach(season=>draft.copyTargets.add(season));
    renderEditor();
  });
  editor.querySelector('.save-rhythm')?.addEventListener('click',saveRhythm);
  editor.querySelectorAll('input[type="time"]').forEach(input=>input.addEventListener('change',()=>{
    syncDraftFromInputs();
    const review=editor.querySelector('.rhythm-review h3');
    if(review) review.textContent=reviewText();
  }));
}
function collectDraftDays(){
  return FLOW_FM_WEEKDAYS.map(({weekday})=>{
    const source=draft.sourceDays.find(day=>day.weekday===weekday);
    const selected=draft.accepting&&draft.selectedDays.has(weekday);
    let windows=source?.windows||[];
    if(selected){
      windows=draft.customizedDays.has(weekday)?draft.customWindows.get(weekday):draft.sharedWindows;
    }
    return {weekday,available:selected,windows:normalizeFlowFmAvailabilityWindows(windows,selected?[{start:'09:00',end:'12:00'}]:[])};
  });
}
async function saveRhythm(){
  syncDraftFromInputs();
  const button=editor.querySelector('.save-rhythm');
  const output=editor.querySelector('.editor-message');
  const days=collectDraftDays();
  if(draft.accepting&&!draft.selectedDays.size){output.textContent='Choose at least one available day.';return;}
  button.disabled=true;button.textContent='SAVING…';output.textContent='';
  try{
    state=await saveFlowFmAvailabilitySeason({innerSeason:draft.season,days});
    for(const season of draft.copyTargets){state=await saveFlowFmAvailabilitySeason({innerSeason:season,days});}
    renderOverview();
    message.textContent=draft.copyTargets.size?`Your rhythm was saved to ${draft.season} and ${draft.copyTargets.size} other ${draft.copyTargets.size===1?'season':'seasons'}.`:`Your ${draft.season} rhythm was saved.`;
    closeEditor();
    overview.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){
    button.disabled=false;button.textContent='SAVE MY RHYTHM';
    output.textContent=error?.message||'This rhythm could not be saved.';
  }
}
async function init(){
  topNav.innerHTML=renderTopNav('availability');
  try{
    const profile=await getCurrentProfile();
    if(!profile||effectiveFlowFmRank(profile)<2){
      gate.hidden=false;
      gate.innerHTML='<p class="eyebrow">PRIVATE FLOW FM ROOM</p><h1>Availability is available inside Flow FM.</h1><a class="availability-link" href="/client/">Enter through the Flowtel</a>';
      return;
    }
    state=await loadFlowFmAvailability();
    anchorCopy.textContent=`Times are shown in ${state?.timezone||'your saved profile timezone'}. You can change one season at a time or copy a rhythm across seasons.`;
    experience.hidden=false;
    renderOverview();
  }catch(error){
    gate.hidden=false;
    gate.innerHTML=`<p class="eyebrow">AVAILABILITY</p><h1>This room could not open yet.</h1><p>${escapeHtml(error?.message||'Please return through the Flowtel and try again.')}</p>`;
  }
}
init();
