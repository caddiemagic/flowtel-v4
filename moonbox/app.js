import { displayNameForProfile, getCurrentProfile } from "../shared/profiles.js?v=0.4.1";
import { supabase } from "../shared/supabase.js";

const messageInput=document.getElementById("moonboxMessage");
const recipientArchetype=document.getElementById("recipientArchetype");
const characterCount=document.getElementById("characterCount");
const sendCollectiveButton=document.getElementById("sendCollectiveButton");
const sendPrivateButton=document.getElementById("sendPrivateButton");
const messageStatus=document.getElementById("messageStatus");
const memberGreeting=document.getElementById("memberGreeting");
const collectiveTab=document.getElementById("collectiveTab");
const myMessagesTab=document.getElementById("myMessagesTab");
const collectiveView=document.getElementById("collectiveView");
const myMessagesView=document.getElementById("myMessagesView");
const collectiveMessages=document.getElementById("collectiveMessages");
const myMessages=document.getElementById("myMessages");
const libraryStatus=document.getElementById("libraryStatus");

const ARCHETYPE_LABELS={
  lover:"A lover",
  partner:"A partner",
  husband:"A husband",
  ex:"An ex",
  father:"A father",
  brother:"A brother",
  friend:"A friend",
  colleague:"A colleague",
  unknown_masculine:"An unknown masculine",
  the_masculine:"The collective masculine",
};

let currentProfile=null;
let currentView="collective";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
}

function formatDate(value){
  if(!value) return "Date held by the Moon";
  const raw=String(value).slice(0,10);
  const [year,month,day]=raw.split("-").map(Number);
  if(!year||!month||!day) return raw;
  return new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric"}).format(new Date(Date.UTC(year,month-1,day)));
}

function moonPhaseLabel(value){
  const phase=String(value||"").trim();
  if(!phase) return "Beneath the Moon";
  return /moon/i.test(phase) ? phase : `${phase} Moon`;
}

function seasonLabel(value){
  return String(value||"").trim() || "Season held privately";
}

function archetypeLabel(value){
  return ARCHETYPE_LABELS[String(value||"").trim()] || "The masculine";
}

function setStatus(text,{error=false,success=false}={}){
  messageStatus.textContent=text || "";
  messageStatus.classList.toggle("error",error);
  messageStatus.classList.toggle("success",success);
}

function setLibraryStatus(text,{error=false}={}){
  libraryStatus.textContent=text || "";
  libraryStatus.classList.toggle("error",error);
}

function setSending(sending){
  sendCollectiveButton.disabled=sending;
  sendPrivateButton.disabled=sending;
  messageInput.disabled=sending;
  recipientArchetype.disabled=sending;
}

function updateCharacterCount(){
  const length=messageInput.value.length;
  characterCount.textContent=`${length} / 4000`;
  characterCount.classList.toggle("near-limit",length>=3600);
}

function identifyingDetails(text){
  const findings=[];
  if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) findings.push("an email address");
  if(/(?:https?:\/\/|www\.)\S+/i.test(text)) findings.push("a link");
  if(/(^|\s)@[A-Za-z0-9_.]{2,}/.test(text)) findings.push("a social handle");
  if(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/.test(text)) findings.push("a phone number");
  return findings;
}

function tagMarkup(label){
  if(!label) return "";
  return `<span>${escapeHtml(label)}</span>`;
}

function collectiveCard(row){
  const count=Number(row.witness_count)||0;
  const mine=row.is_mine===true;
  const witnessed=row.has_witnessed===true;
  const actionLabel=mine ? "SENT BY YOU" : witnessed ? "WITNESSED" : "I WITNESS YOU";
  const disabled=mine || witnessed;
  const witnessCopy=count===0 ? "Waiting to be witnessed" : count===1 ? "Witnessed by 1 woman" : `Witnessed by ${count} women`;
  return `
    <article class="moon-message-card" data-message-id="${escapeHtml(row.id)}">
      <div class="message-card-topline">
        <p class="eyebrow">SENT TO THE MOON</p>
        <span>${escapeHtml(archetypeLabel(row.recipient_archetype))}</span>
      </div>
      <p class="moon-letter">${escapeHtml(row.message_text)}</p>
      <div class="moon-tags">
        ${tagMarkup(moonPhaseLabel(row.moon_phase))}
        ${tagMarkup(seasonLabel(row.inner_season))}
        ${tagMarkup(formatDate(row.sent_on))}
      </div>
      <div class="witness-row">
        <button type="button" class="witness-button ${witnessed?"witnessed":""}" ${disabled?"disabled":""}>${actionLabel}</button>
        <small>${escapeHtml(witnessCopy)}</small>
      </div>
    </article>
  `;
}

function myCard(row){
  const shared=row.share_collectively===true;
  const count=Number(row.witness_count)||0;
  const cycleDay=Number(row.cycle_day_actual);
  return `
    <article class="moon-message-card moon-message-card--mine">
      <div class="message-card-topline">
        <p class="eyebrow">${shared?"IN THE COLLECTIVE MOONBOX":"BETWEEN ME & THE MOON"}</p>
        <span>${escapeHtml(archetypeLabel(row.recipient_archetype))}</span>
      </div>
      <p class="moon-letter">${escapeHtml(row.message_text)}</p>
      <div class="moon-tags">
        ${tagMarkup(moonPhaseLabel(row.moon_phase))}
        ${tagMarkup(seasonLabel(row.inner_season))}
        ${Number.isFinite(cycleDay)?tagMarkup(`Cycle Day ${cycleDay}`):""}
        ${tagMarkup(formatDate(row.flowtel_date || row.created_at))}
      </div>
      <p class="my-message-footer">${shared ? (count===0?"Released anonymously. Waiting to be witnessed.":count===1?"Witnessed anonymously by 1 woman.":`Witnessed anonymously by ${count} women.`) : "Held privately inside your Moonbox archive."}</p>
    </article>
  `;
}

function bindWitnessButtons(){
  collectiveMessages.querySelectorAll(".moon-message-card[data-message-id]").forEach(card=>{
    const button=card.querySelector(".witness-button");
    if(!button || button.disabled) return;
    button.addEventListener("click",async()=>{
      const id=card.dataset.messageId;
      button.disabled=true;
      button.textContent="WITNESSING...";
      try{
        const {error}=await supabase.rpc("flowtel_witness_moonbox_message",{p_message_id:id});
        if(error) throw error;
        await loadCollectiveMessages();
      }catch(error){
        console.error(error);
        button.disabled=false;
        button.textContent="I WITNESS YOU";
        setLibraryStatus(error?.message || "This message could not be witnessed yet.",{error:true});
      }
    });
  });
}

async function loadCollectiveMessages(){
  collectiveMessages.innerHTML=`<div class="empty-moonbox"><p>Opening the Collective Moonbox...</p></div>`;
  const {data,error}=await supabase.rpc("flowtel_get_collective_moonbox_messages",{p_limit:100});
  if(error) throw error;
  const rows=data || [];
  collectiveMessages.innerHTML=rows.length
    ? rows.map(collectiveCard).join("")
    : `<div class="empty-moonbox"><p>The Collective Moonbox is quiet. The first letter is waiting to be sent.</p></div>`;
  bindWitnessButtons();
}

async function loadMyMessages(){
  myMessages.innerHTML=`<div class="empty-moonbox"><p>Opening your private archive...</p></div>`;
  const {data,error}=await supabase.rpc("flowtel_get_my_moonbox_messages");
  if(error) throw error;
  const rows=data || [];
  myMessages.innerHTML=rows.length
    ? rows.map(myCard).join("")
    : `<div class="empty-moonbox"><p>Your Moonbox is waiting for the first message you choose not to send away.</p></div>`;
}

async function refreshLibrary(){
  setLibraryStatus("");
  try{
    await Promise.all([loadCollectiveMessages(),loadMyMessages()]);
  }catch(error){
    console.error(error);
    collectiveMessages.innerHTML=`<div class="empty-moonbox"><p>The Collective Moonbox could not open.</p></div>`;
    myMessages.innerHTML=`<div class="empty-moonbox"><p>Your private archive could not open.</p></div>`;
    const missingMigration=error?.code==="PGRST202" || error?.code==="42883" || /moonbox/i.test(error?.message||"");
    setLibraryStatus(missingMigration
      ? "The Moonbox database room is not open yet. Run migration 042, then refresh this page."
      : (error?.message || "The Moonbox could not open."),{error:true});
  }
}

function switchView(view){
  currentView=view;
  const collective=view==="collective";
  collectiveView.classList.toggle("hidden",!collective);
  myMessagesView.classList.toggle("hidden",collective);
  collectiveTab.classList.toggle("active",collective);
  myMessagesTab.classList.toggle("active",!collective);
  collectiveTab.setAttribute("aria-selected",String(collective));
  myMessagesTab.setAttribute("aria-selected",String(!collective));
}

async function sendMessage(shareCollectively){
  const text=messageInput.value.trim();
  if(!text){
    setStatus("Write the message before sending it to the Moon.",{error:true});
    messageInput.focus();
    return;
  }

  if(shareCollectively){
    const findings=identifyingDetails(text);
    if(findings.length){
      setStatus(`Before releasing this letter anonymously, remove ${findings.join(", ")}. You may still keep the unedited version privately between you and the Moon.`,{error:true});
      return;
    }
  }

  setSending(true);
  setStatus(shareCollectively ? "Sending your message to the Moon..." : "Placing your letter inside your private Moonbox...");
  try{
    const {error}=await supabase.rpc("flowtel_create_moonbox_message",{
      p_message_text:text,
      p_recipient_archetype:recipientArchetype.value || null,
      p_share_collectively:shareCollectively,
    });
    if(error) throw error;
    messageInput.value="";
    recipientArchetype.value="";
    updateCharacterCount();
    await refreshLibrary();
    if(shareCollectively){
      switchView("collective");
      setStatus("Your message has been received. The energy you were about to send away is returning to your Queendom.",{success:true});
    }else{
      switchView("mine");
      setStatus("Your letter is safe between you and the Moon.",{success:true});
    }
  }catch(error){
    console.error(error);
    const missingMigration=error?.code==="PGRST202" || error?.code==="42883" || /flowtel_create_moonbox_message/i.test(error?.message||"");
    setStatus(missingMigration
      ? "The Moonbox database room is not open yet. Run migration 042, then try again."
      : (error?.message || "The Moon could not receive this message yet."),{error:true});
  }finally{
    setSending(false);
  }
}

async function init(){
  updateCharacterCount();
  try{
    currentProfile=await getCurrentProfile();
    if(!currentProfile){
      memberGreeting.textContent="No active Flowtel room key";
      setStatus("Please enter through your Flowtel Suite before opening the Moonbox.",{error:true});
      setLibraryStatus("The Moonbox is available to signed-in Flowtel members.",{error:true});
      collectiveMessages.innerHTML=`<div class="empty-moonbox"><p>Enter through your Flowtel Suite to open the Collective Moonbox.</p></div>`;
      myMessages.innerHTML=`<div class="empty-moonbox"><p>Your private Moonbox archive will appear after you enter Flowtel.</p></div>`;
      sendCollectiveButton.disabled=true;
      sendPrivateButton.disabled=true;
      messageInput.disabled=true;
      recipientArchetype.disabled=true;
      return;
    }
    const name=displayNameForProfile(currentProfile,"Flowtel Guest");
    memberGreeting.textContent=`The Moon is listening, ${name}.`;
    await refreshLibrary();
  }catch(error){
    console.error(error);
    memberGreeting.textContent="The Moonbox could not open";
    setStatus(error?.message || "Please return to your Suite and try again.",{error:true});
  }
}

messageInput.addEventListener("input",updateCharacterCount);
sendCollectiveButton.addEventListener("click",()=>sendMessage(true));
sendPrivateButton.addEventListener("click",()=>sendMessage(false));
collectiveTab.addEventListener("click",()=>switchView("collective"));
myMessagesTab.addEventListener("click",()=>switchView("mine"));

init();
