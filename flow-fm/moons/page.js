import { getCurrentProfile, getPersonalizedMoonPath } from '/shared/flowtel.js';
import { renderTopNav, escapeHtml, setMessage } from '/flow-fm/ui.js';

const topNav=document.getElementById('topNav');
const moonDoorList=document.getElementById('moonDoorList');
const message=document.getElementById('message');

function renderMoonDoors(path=[]){
  moonDoorList.innerHTML=path.map(portal=>{
    const action=portal.isOuroboros ? `Return through ${portal.returnMoon?.name || 'entry moon'}` : `${portal.wombWorkModule?.title || 'Womb Work'} · ${portal.businessAssignment?.title || 'Assignment'}`;
    return `<a class="moon-door-row ${portal.isCurrent ? 'current' : ''}" href="/flow-fm/portal/?portal=${portal.portalIndex}">
      <span class="moon-door-number">${escapeHtml(portal.portalIndex)}</span>
      <div>
        <p class="eyebrow">${portal.isCurrent ? 'CURRENT MOON' : (portal.isOuroboros ? 'OUROBOROS' : 'OPEN TO EXPLORE')}</p>
        <h3>${escapeHtml(portal.name)}</h3>
        <p>${escapeHtml(action)}</p>
      </div>
      <strong>Open</strong>
    </a>`;
  }).join('');
}
async function init(){
  topNav.innerHTML=renderTopNav('moons');
  try{
    const profile=await getCurrentProfile();
    renderMoonDoors(getPersonalizedMoonPath(profile || {}));
  }catch(error){
    console.error(error);
    renderMoonDoors(getPersonalizedMoonPath({}));
    setMessage(message,'The moon doors are open in preview mode.');
  }
}
init();
