import {playerRequired,mySirenTracks,sirenUrl,escapeHtml as h} from '../../shared/kingdom-experience.js';
const $=id=>document.getElementById(id);let tracks=[];
function render(){
 document.querySelectorAll('audio').forEach(a=>a.pause());
 const visible=tracks.filter(t=>t.published&&($('category').value==='all'||t.category===$('category').value));
 $('trackList').innerHTML=visible.length?visible.map(t=>`<article class="kingdom-entry"><p class="kingdom-meta">${h(t.category)}${t.duration_seconds?' · '+Math.floor(t.duration_seconds/60)+':'+String(t.duration_seconds%60).padStart(2,'0'):''}${t.access_tier==='vip'?' · VIP':''}</p><h3>${h(t.title)}</h3><p>${h(t.description)}</p><button class="cm-button" data-listen="${h(t.id)}">Listen</button><audio controls preload="none" class="hidden" id="audio-${h(t.id)}"></audio></article>`).join(''):'<p>The sea is quiet here for now. New recordings will appear as your Golf Priestess publishes them.</p>';
 document.querySelectorAll('[data-listen]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{const t=tracks.find(t=>t.id===button.dataset.listen),audio=$('audio-'+t.id);audio.src=await sirenUrl(t.storage_path);audio.classList.remove('hidden');audio.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();}));button.textContent='Recording Ready';audio.focus();}catch(error){button.disabled=false;$('pageMessage').textContent=error.message;}}));
}
async function boot(){await playerRequired();tracks=await mySirenTracks();$('room').classList.remove('hidden');$('pageMessage').textContent='';render();}
$('category').addEventListener('change',render);boot().catch(error=>$('pageMessage').textContent=error.message);
