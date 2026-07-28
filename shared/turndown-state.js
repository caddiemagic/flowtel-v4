const COMPLETED_TURNDOWN_STATUSES=new Set(["completed","fulfilled"]);

export function normalizeTurndownStatus(stay){
  return String(stay?.turndown_status || "").trim().toLowerCase();
}

export function hasCompletedTurndown(stay){
  return COMPLETED_TURNDOWN_STATUSES.has(normalizeTurndownStatus(stay)) || !!stay?.turndown_completed_at;
}

export function hasActiveTurndownRequest(stay,{localRequested=false}={}){
  if(hasCompletedTurndown(stay)) return false;
  return normalizeTurndownStatus(stay)==="requested" || !!stay?.turndown_requested_at || localRequested===true;
}

export function isExplicitTurndownSubmitter(submitterId,expectedId="turndownNoteSubmit"){
  return String(submitterId || "")===String(expectedId || "");
}
