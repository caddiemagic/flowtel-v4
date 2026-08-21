import { getCurrentProfile } from "../shared/profiles.js?v=0.10.75";
import { supabase } from "../shared/supabase.js";

const BUCKET="flowtel-personal-cosmology";
const MAX_BYTES=15*1024*1024;
const ALLOWED_TYPES=new Set(["image/png","image/jpeg","image/webp","application/pdf"]);
const form=document.getElementById("cosmologyForm");
const loading=document.getElementById("cosmologyLoading");
const denied=document.getElementById("cosmologyDenied");
const deniedCopy=document.getElementById("cosmologyDeniedCopy");
const status=document.getElementById("cosmologyStatus");
const memberName=document.getElementById("memberName");
const viewModePill=document.getElementById("viewModePill");
const birthDate=document.getElementById("birthDate");
const birthTime=document.getElementById("birthTime");
const birthTimeConfidence=document.getElementById("birthTimeConfidence");
const birthplace=document.getElementById("birthplace");
const notes=document.getElementById("cosmologyNotes");
const share=document.getElementById("shareWithPractitioner");
const consentCard=document.getElementById("sharingConsentCard");
const chartInput=document.getElementById("humanDesignChart");
const chartUploadField=document.getElementById("chartUploadField");
const chartCurrent=document.getElementById("chartCurrent");
const removeChartButton=document.getElementById("removeChartButton");
const saveButton=document.getElementById("saveCosmologyButton");
const memberActions=document.getElementById("memberActions");
const practitionerActions=document.getElementById("practitionerActions");
const returnToClientSnapshot=document.getElementById("returnToClientSnapshot");
let currentProfile=null;
let cosmology=null;
let targetMemberId=null;

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));}
function requestedClient(){return String(new URLSearchParams(location.search).get("client")||"").trim();}
function safeFilename(name){return String(name||"chart").replace(/[^A-Za-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100)||"chart";}
function extensionFor(file){const name=String(file?.name||"");const dot=name.lastIndexOf(".");if(dot>=0)return name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g,"");return file.type==="application/pdf"?".pdf":file.type==="image/png"?".png":file.type==="image/webp"?".webp":".jpg";}
function setStatus(text){status.textContent=text||"";}
function setEditable(editable){for(const field of [birthDate,birthTime,birthTimeConfidence,birthplace,notes,share,chartInput])field.disabled=!editable;consentCard.classList.toggle("hidden",!editable);chartUploadField.classList.toggle("hidden",!editable);memberActions.classList.toggle("hidden",!editable);practitionerActions.classList.toggle("hidden",editable);viewModePill.textContent=editable?"PRIVATE TO YOU":"SHARED WITH YOU FOR ACTIVE CARE";}
function renderChart(){const path=String(cosmology?.human_design_storage_path||"");if(!path){chartCurrent.classList.add("hidden");removeChartButton.classList.add("hidden");chartCurrent.innerHTML="";return;}chartCurrent.classList.remove("hidden");chartCurrent.innerHTML=`<div><strong>${escapeHtml(cosmology?.human_design_original_filename||"Human Design chart")}</strong><small>Private chart file · ${escapeHtml(cosmology?.human_design_mime_type||"file")}</small></div><a href="#" id="openChartLink">OPEN PRIVATE CHART</a>`;removeChartButton.classList.toggle("hidden",cosmology?.editable!==true);document.getElementById("openChartLink")?.addEventListener("click",openChart);}
function populate(data){cosmology=data||{};memberName.textContent=cosmology.member_name?`${cosmology.member_name} · Birth + Design`:`Your Birth + Design details`;birthDate.value=String(cosmology.birth_date||"").slice(0,10);birthTime.value=String(cosmology.birth_time||"").slice(0,5);birthTimeConfidence.value=cosmology.birth_time_confidence||"unknown";birthplace.value=cosmology.birthplace||"";notes.value=cosmology.notes||"";share.checked=cosmology.share_with_active_practitioner===true;setEditable(cosmology.editable===true);renderChart();if(cosmology.editable!==true){returnToClientSnapshot.href=`/cycle-data/?client=${encodeURIComponent(cosmology.member_id||targetMemberId)}`;}}
async function loadCosmology(){const {data,error}=await supabase.rpc("flowtel_get_member_cosmology",{p_member_id:targetMemberId});if(error)throw error;populate(data||{});}
async function openChart(event){event?.preventDefault();const path=String(cosmology?.human_design_storage_path||"");if(!path)return;setStatus("Preparing a private chart link...");const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,900);if(error)throw error;if(!data?.signedUrl)throw new Error("The private chart link could not be prepared.");window.open(data.signedUrl,"_blank","noopener,noreferrer");setStatus("");}
async function uploadChart(file){if(!file)return cosmology;if(!ALLOWED_TYPES.has(file.type))throw new Error("Upload a PNG, JPG, WebP, or PDF Human Design chart.");if(file.size<1||file.size>MAX_BYTES)throw new Error("Human Design charts may be up to 15 MB.");const oldPath=cosmology?.human_design_storage_path||null;const path=`${currentProfile.id}/${crypto.randomUUID()}-${safeFilename(file.name.replace(/\.[^.]+$/,""))}${extensionFor(file)}`;const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(uploadError)throw uploadError;try{const {data,error}=await supabase.rpc("flowtel_set_my_cosmology_chart",{p_storage_path:path,p_original_filename:file.name,p_mime_type:file.type,p_size_bytes:file.size});if(error)throw error;if(oldPath&&oldPath!==path)await supabase.storage.from(BUCKET).remove([oldPath]).catch(()=>{});return data||cosmology;}catch(error){await supabase.storage.from(BUCKET).remove([path]).catch(()=>{});throw error;}}
async function save(event){event.preventDefault();if(cosmology?.editable!==true)return;saveButton.disabled=true;setStatus("Saving your private Birth + Design details...");try{const time=birthTime.value||null;const {data,error}=await supabase.rpc("flowtel_save_my_cosmology",{p_birth_date:birthDate.value||null,p_birth_time:time,p_birth_time_confidence:birthTimeConfidence.value||"unknown",p_birthplace:birthplace.value||null,p_notes:notes.value||null,p_share_with_active_practitioner:share.checked});if(error)throw error;cosmology=data||cosmology;if(chartInput.files?.[0])cosmology=await uploadChart(chartInput.files[0]);chartInput.value="";populate(cosmology);setStatus(share.checked?"Saved. Your active Mentor or appointment-holding Priestess may now open these details while her authorization is active.":"Saved privately. These details are not currently shared with a practitioner.");}catch(error){console.error(error);setStatus(error?.message||"Personal Cosmology could not be saved.");}finally{saveButton.disabled=false;}}
async function removeChart(){if(cosmology?.editable!==true||!cosmology?.human_design_storage_path)return;const path=cosmology.human_design_storage_path;removeChartButton.disabled=true;setStatus("Removing the private chart...");try{const {data,error}=await supabase.rpc("flowtel_clear_my_cosmology_chart",{p_storage_path:path});if(error)throw error;const {error:storageError}=await supabase.storage.from(BUCKET).remove([path]);if(storageError)console.warn("Personal Cosmology chart metadata was cleared, but the private storage object still needs cleanup.",storageError);populate(data||{});setStatus("Your Human Design chart has been removed from Personal Cosmology.");}catch(error){console.error(error);setStatus(error?.message||"The chart could not be removed.");}finally{removeChartButton.disabled=false;}}
async function init(){try{currentProfile=await getCurrentProfile();if(!currentProfile){loading.classList.add("hidden");denied.classList.remove("hidden");deniedCopy.textContent="Enter through your protected Flowtel room key before opening Personal Cosmology.";return;}targetMemberId=requestedClient()||currentProfile.id;await loadCosmology();loading.classList.add("hidden");form.classList.remove("hidden");}catch(error){console.error(error);loading.classList.add("hidden");denied.classList.remove("hidden");deniedCopy.textContent=error?.message||"This private Birth + Design room is not available to this account.";}}

form.addEventListener("submit",save);removeChartButton.addEventListener("click",removeChart);birthTimeConfidence.addEventListener("change",()=>{if(birthTimeConfidence.value==="unknown")birthTime.value="";});
init();
