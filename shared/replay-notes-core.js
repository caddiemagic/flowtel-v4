// Flowtel v0.10.64 — pure workshop replay-note validation and labels.

export const WORKSHOP_REPLAY_NOTE_TYPES=Object.freeze([
  {value:'question',label:'Question'},
  {value:'note',label:'Note'},
  {value:'download',label:'Download'},
  {value:'reflection',label:'Reflection'},
  {value:'cycle_data',label:'Track This in Cycle Data'},
]);

export function normalizeWorkshopKey(value=''){
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,120);
}

export function labelForWorkshopReplayNoteType(value=''){
  return WORKSHOP_REPLAY_NOTE_TYPES.find(option=>option.value===value)?.label || 'Note';
}

export function validateWorkshopReplayNote(values={}){
  const workshopKey=normalizeWorkshopKey(values.workshopKey || values.workshop_key);
  const workshopTitle=String(values.workshopTitle || values.workshop_title || '').trim();
  const noteType=String(values.noteType || values.note_type || '').trim().toLowerCase();
  const noteBody=String(values.noteBody || values.note_body || '').trim();
  const sourceUrl=String(values.sourceUrl || values.source_url || '').trim();
  if(!workshopKey) throw new Error('This workshop could not be identified.');
  if(!workshopTitle || workshopTitle.length>240) throw new Error('Add a workshop title.');
  if(!WORKSHOP_REPLAY_NOTE_TYPES.some(option=>option.value===noteType)) throw new Error('Choose what kind of note you are leaving.');
  if(!noteBody) throw new Error('Write the note you would like Flowtel to remember.');
  if(noteBody.length>4000) throw new Error('Keep this replay note under 4,000 characters.');
  if(sourceUrl.length>1000) throw new Error('The replay source link is too long.');
  return {workshopKey,workshopTitle,noteType,noteBody,sourceUrl};
}
