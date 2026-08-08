import { getCurrentProfile } from '/shared/flowtel.js?v=0.10.83';
import { effectiveFlowFmRank } from '/shared/rollout.js?v=0.10.83';
import { renderTopNav, escapeHtml } from '/flow-fm/ui.js?v=0.10.83';
import { loadFlowFmAvailability, saveFlowFmAvailabilitySeason, loadFlowFmAvailabilityMonth, saveFlowFmAvailabilityMonthDay, submitFlowFmAvailabilityMonth } from '/shared/flow-fm-availability.js?v=0.10.83';
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
} from '/shared/flow-fm-availability-core.js?v=0.10.83';

const topNav=document.getElementById('topNav');
const experience=document.getElementById('availabilityExperience');
const gate=document.getElementById('availabilityGate');
const overview=document.getElementById('availabilityOverview');
const editor=document.getElementById('availabilityEditor');
const anchorCopy=document.getElementById('availabilityAnchorCopy');
const message=document.getElementById('availabilityMessage');
const calendarSection=document.getElementById('availabilityCalendarSection');
const calendarStatus=document.getElementById('availabilityCalendarStatus');
const calendarMonth=document.getElementById('availabilityCalendarMonth');
const calendarGrid=document.getElementById('availabilityCalendarGrid');
const calendarMessage=document.getElementById('availabilityCalendarMessage');
const dayEditor=document.getElementById('availabilityDayEditor');
const monthPrevious=document.getElementById('availabilityMonthPrevious');
const monthNext=document.getElementById('availabilityMonthNext');
const submitMonthButton=document.getElementById('submitAvailabilityMonth');
const calendarFooterTitle=document.getElementById('availabilityCalendarFooterTitle');
const calendarFooterCopy=document.getElementById('availabilityCalendarFooterCopy');
let state=null;
let draft=null;
let monthState=null;
let monthCursor='';
let minimumMonthStart='';
let selectedCalendarDate='';
let dayDraft=null;

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
    if(monthCursor){
      try{monthState=await loadFlowFmAvailabilityMonth(monthCursor);renderCalendar();}catch(error){console.warn('Monthly Availability could not refresh after the seasonal rhythm changed.',error);}
    }
    closeEditor();
    overview.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){
    button.disabled=false;button.textContent='SAVE MY RHYTHM';
    output.textContent=error?.message||'This rhythm could not be saved.';
  }
}
function isoDate(value){
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):'';
}
function isoDateObject(value){
  const iso=isoDate(value);
  return iso?new Date(`${iso}T12:00:00Z`):null;
}
function monthLabel(value){
  const date=isoDateObject(value);
  return date?new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(date):'Calendar';
}
function dateLabel(value){
  const date=isoDateObject(value);
  return date?new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date):String(value||'');
}
function shiftMonth(value,amount){
  const date=isoDateObject(value);
  if(!date)return '';
  date.setUTCMonth(date.getUTCMonth()+amount,1);
  return date.toISOString().slice(0,10);
}
function calendarWindowLabel(window){
  return `${formatFlowFmAvailabilityTime(window.start)}–${formatFlowFmAvailabilityTime(window.end)}`;
}
function calendarDayFor(date){
  return (Array.isArray(monthState?.days)?monthState.days:[]).find(day=>day.calendar_date===date)||null;
}
function renderCalendarFooter(){
  const submitted=monthState?.status==='submitted';
  const acknowledged=Boolean(monthState?.owner_acknowledged_at);
  calendarStatus.textContent=submitted?'SUBMITTED':'DRAFT';
  calendarStatus.classList.toggle('is-submitted',submitted);
  if(submitted){
    calendarFooterTitle.textContent=acknowledged?'This month has been updated in Acuity.':'Your availability has been sent to the Flowtel owner.';
    calendarFooterCopy.textContent=acknowledged?'Any new date change will automatically reopen an Acuity update alert.':'Changes you save now automatically alert the owner so Acuity can stay aligned.';
    submitMonthButton.textContent='Submitted';
    submitMonthButton.disabled=true;
  }else{
    calendarFooterTitle.textContent='Prepare this month before submitting it.';
    calendarFooterCopy.textContent='Your draft stays private until you submit it to the Flowtel owner for Acuity.';
    submitMonthButton.textContent=`Submit ${monthLabel(monthState?.month_start||monthCursor)} Availability`;
    submitMonthButton.disabled=false;
  }
}
function renderCalendar(){
  if(!monthState)return;
  monthCursor=monthState.month_start||monthCursor;
  calendarMonth.textContent=monthLabel(monthCursor);
  const first=isoDateObject(monthCursor);
  const blanks=first?(first.getUTCDay()+6)%7:0;
  const today=isoDate(monthState.flowtel_date);
  const blankCells=Array.from({length:blanks},()=>'<div class="availability-calendar-blank" aria-hidden="true"></div>').join('');
  const days=monthState.days||[];
  const dayCells=days.map(day=>{
    const date=isoDateObject(day.calendar_date);
    const number=date?date.getUTCDate():'—';
    const past=Boolean(today&&day.calendar_date<today);
    const windows=Array.isArray(day.windows)?day.windows:[];
    const available=day.is_available===true&&windows.length>0;
    const timeMarkup=available?windows.map(window=>`<span>${escapeHtml(calendarWindowLabel(window))}</span>`).join(''):'';
    const season=String(day.projected_inner_season||'').replace('Inner ','');
    const classes=['availability-calendar-day',available?'has-availability':'',day.is_override?'is-override':'',selectedCalendarDate===day.calendar_date?'is-selected':''].filter(Boolean).join(' ');
    const aria=`${dateLabel(day.calendar_date)}. ${day.projected_inner_season||''}, cycle day ${day.projected_cycle_day||''}. ${available?windows.map(calendarWindowLabel).join(', '):'Unavailable'}${day.is_override?'. Edited for this date':''}`;
    return `<button type="button" class="${classes}" data-calendar-date="${escapeHtml(day.calendar_date)}" aria-label="${escapeHtml(aria)}" ${past?'disabled':''}><span class="availability-calendar-date">${escapeHtml(number)}</span><span class="availability-calendar-times">${timeMarkup}</span><span class="availability-calendar-season">${escapeHtml(season)}</span></button>`;
  }).join('');
  const trailing=(7-((blanks+days.length)%7))%7;
  const trailingCells=Array.from({length:trailing},()=>'<div class="availability-calendar-blank" aria-hidden="true"></div>').join('');
  calendarGrid.innerHTML=blankCells+dayCells+trailingCells;
  calendarGrid.querySelectorAll('[data-calendar-date]:not(:disabled)').forEach(button=>button.addEventListener('click',()=>openDayEditor(button.dataset.calendarDate)));
  monthPrevious.disabled=!minimumMonthStart||monthCursor<=minimumMonthStart;
  monthNext.disabled=Boolean(minimumMonthStart&&monthCursor>=shiftMonth(minimumMonthStart,12));
  renderCalendarFooter();
}
async function loadCalendarMonth(monthStart=null,{focus=false}={}){
  calendarMessage.textContent='Mapping your Inner Season rhythm onto the calendar…';
  dayEditor.hidden=true;dayEditor.innerHTML='';selectedCalendarDate='';dayDraft=null;
  try{
    monthState=await loadFlowFmAvailabilityMonth(monthStart);
    monthCursor=monthState?.month_start||monthStart||'';
    if(!minimumMonthStart)minimumMonthStart=monthCursor;
    calendarSection.hidden=false;
    calendarMessage.textContent='';
    renderCalendar();
    if(focus)calendarSection.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){
    calendarSection.hidden=false;
    calendarGrid.innerHTML='';
    calendarMessage.textContent=error?.message||'This monthly calendar could not be opened yet.';
    throw error;
  }
}
function calendarEditorWindow(window,index){
  return `<div class="availability-day-window" data-calendar-window="${index}"><label><span>From</span><input type="time" name="start" value="${escapeHtml(window.start||'')}" /></label><label><span>To</span><input type="time" name="end" value="${escapeHtml(window.end||'')}" /></label><button type="button" data-remove-calendar-window="${index}" ${dayDraft.windows.length===1?'hidden':''}>Remove</button></div>`;
}
function syncDayDraftFromInputs(){
  if(!dayDraft||dayEditor.hidden)return;
  const checkbox=dayEditor.querySelector('[data-calendar-day-available]');
  if(checkbox)dayDraft.available=checkbox.checked;
  const rows=[...dayEditor.querySelectorAll('[data-calendar-window]')];
  if(rows.length)dayDraft.windows=rows.map(row=>({start:row.querySelector('[name="start"]').value,end:row.querySelector('[name="end"]').value}));
}
function renderDayEditor(){
  const day=calendarDayFor(selectedCalendarDate);
  if(!day||!dayDraft){dayEditor.hidden=true;return;}
  const submitted=monthState?.status==='submitted';
  const sourceCopy=day.is_override?'This date is using a one-day edit.':'This date is following your saved Inner Season rhythm.';
  dayEditor.innerHTML=`<header class="availability-day-editor-header"><div><p class="eyebrow">${escapeHtml(day.projected_inner_season||'INNER SEASON')} · DAY ${escapeHtml(day.projected_cycle_day||'')}</p><h3 id="availabilityDayEditorTitle">${escapeHtml(dateLabel(day.calendar_date))}</h3><p>${escapeHtml(sourceCopy)}</p></div><button type="button" class="availability-day-editor-close">Close</button></header><div class="availability-day-editor-controls"><label class="availability-day-toggle"><input type="checkbox" data-calendar-day-available ${dayDraft.available?'checked':''}><span>Available for client calls</span></label><div class="availability-day-window-list" ${dayDraft.available?'':'hidden'}>${dayDraft.windows.map(calendarEditorWindow).join('')}</div><button type="button" class="availability-day-add-window" data-add-calendar-window ${dayDraft.available?'':'hidden'}>Add another time window</button></div><div class="availability-day-editor-actions"><button type="button" class="use-seasonal-day">Use ${escapeHtml(day.projected_inner_season||'Seasonal')} Rhythm</button><div><button type="button" class="save-calendar-day">Save Day</button></div></div><p class="availability-day-editor-message" role="status">${submitted?'Saving a change after submission will alert the Flowtel owner to update Acuity.':''}</p>`;
  dayEditor.hidden=false;
  dayEditor.querySelector('.availability-day-editor-close')?.addEventListener('click',()=>{dayEditor.hidden=true;selectedCalendarDate='';dayDraft=null;renderCalendar();});
  dayEditor.querySelector('[data-calendar-day-available]')?.addEventListener('change',event=>{
    syncDayDraftFromInputs();dayDraft.available=event.target.checked;
    if(dayDraft.available&&dayDraft.windows.length===0)dayDraft.windows=[{start:'09:00',end:'12:00'}];
    renderDayEditor();
  });
  dayEditor.querySelector('[data-add-calendar-window]')?.addEventListener('click',()=>{
    syncDayDraftFromInputs();if(dayDraft.windows.length<8)dayDraft.windows.push({start:'13:00',end:'14:00'});renderDayEditor();
  });
  dayEditor.querySelectorAll('[data-remove-calendar-window]').forEach(button=>button.addEventListener('click',()=>{
    syncDayDraftFromInputs();if(dayDraft.windows.length>1)dayDraft.windows.splice(Number(button.dataset.removeCalendarWindow),1);renderDayEditor();
  }));
  dayEditor.querySelector('.save-calendar-day')?.addEventListener('click',saveCalendarDay);
  dayEditor.querySelector('.use-seasonal-day')?.addEventListener('click',resetCalendarDay);
}
function openDayEditor(date){
  const day=calendarDayFor(date);if(!day)return;
  selectedCalendarDate=date;
  const windows=(Array.isArray(day.windows)?day.windows:[]).map(window=>({start:String(window.start||'').slice(0,5),end:String(window.end||'').slice(0,5)}));
  dayDraft={available:day.is_available===true,windows:windows.length?windows:[{start:'09:00',end:'12:00'}]};
  renderCalendar();renderDayEditor();dayEditor.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function saveCalendarDay(){
  syncDayDraftFromInputs();
  const output=dayEditor.querySelector('.availability-day-editor-message');
  const button=dayEditor.querySelector('.save-calendar-day');
  if(dayDraft.available&&!dayDraft.windows.length){output.textContent='Add at least one time window.';return;}
  for(const window of dayDraft.windows){if(!window.start||!window.end||window.start>=window.end){output.textContent='Each time window must end after it begins.';return;}}
  button.disabled=true;button.textContent='SAVING…';
  try{
    const wasSubmitted=monthState?.status==='submitted';
    monthState=await saveFlowFmAvailabilityMonthDay({calendarDate:selectedCalendarDate,isAvailable:dayDraft.available,windows:dayDraft.windows});
    calendarMessage.textContent=wasSubmitted?'Saved. The Flowtel owner has been alerted to update Acuity.':'Saved to your monthly draft.';
    renderCalendar();openDayEditor(selectedCalendarDate);
  }catch(error){button.disabled=false;button.textContent='SAVE DAY';output.textContent=error?.message||'This date could not be saved.';}
}
async function resetCalendarDay(){
  const button=dayEditor.querySelector('.use-seasonal-day');
  const output=dayEditor.querySelector('.availability-day-editor-message');
  button.disabled=true;
  try{
    const wasSubmitted=monthState?.status==='submitted';
    monthState=await saveFlowFmAvailabilityMonthDay({calendarDate:selectedCalendarDate,isAvailable:false,windows:[],useSeasonal:true});
    calendarMessage.textContent=wasSubmitted?'Seasonal rhythm restored. The Flowtel owner has been alerted to update Acuity.':'This date is following your Inner Season rhythm again.';
    renderCalendar();openDayEditor(selectedCalendarDate);
  }catch(error){button.disabled=false;output.textContent=error?.message||'This date could not be restored.';}
}
async function submitCalendarMonth(){
  if(!monthCursor||monthState?.status==='submitted')return;
  submitMonthButton.disabled=true;submitMonthButton.textContent='SUBMITTING…';calendarMessage.textContent='Sending your calendar to the Flowtel owner…';
  try{
    monthState=await submitFlowFmAvailabilityMonth(monthCursor);
    calendarMessage.textContent='Submitted. The Flowtel owner has been alerted to update Acuity.';
    renderCalendar();
  }catch(error){submitMonthButton.disabled=false;submitMonthButton.textContent='SUBMIT AVAILABILITY';calendarMessage.textContent=error?.message||'This calendar could not be submitted.';}
}
monthPrevious?.addEventListener('click',()=>{if(monthCursor&&!monthPrevious.disabled)loadCalendarMonth(shiftMonth(monthCursor,-1),{focus:true}).catch(()=>{});});
monthNext?.addEventListener('click',()=>{if(monthCursor&&!monthNext.disabled)loadCalendarMonth(shiftMonth(monthCursor,1),{focus:true}).catch(()=>{});});
submitMonthButton?.addEventListener('click',submitCalendarMonth);

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
    anchorCopy.textContent=`Times are shown in ${state?.timezone||'your saved profile timezone'}. Set the rhythm for each Inner Season, then use the monthly calendar below to make real-date exceptions.`;
    experience.hidden=false;
    renderOverview();
    try{await loadCalendarMonth(null);}catch(error){console.warn('Cycle-aware Availability calendar is not available yet.',error);}
  }catch(error){
    gate.hidden=false;
    gate.innerHTML=`<p class="eyebrow">AVAILABILITY</p><h1>This room could not open yet.</h1><p>${escapeHtml(error?.message||'Please return through the Flowtel and try again.')}</p>`;
  }
}
init();
