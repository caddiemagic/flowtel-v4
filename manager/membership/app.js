import { supabase } from "../../shared/supabase.js";

const scanButton=document.getElementById("scanButton");
const provisionButton=document.getElementById("provisionButton");
const status=document.getElementById("status");
const summary=document.getElementById("summary");
const resultsSection=document.getElementById("resultsSection");
const memberRows=document.getElementById("memberRows");
let reconciliationRows=[];

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
function statusLabel(value){return({already_linked:"Already linked",ready_to_invite:"Needs Flowtel invite",ready_to_upgrade:"Existing identity · upgrade",manual_review:"Manual review"})[value]||value;}
function badgeClass(value){return value==="already_linked"?"linked":value==="ready_to_invite"?"invite":value==="ready_to_upgrade"?"upgrade":"review";}

async function ownerToken(){
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  const token=data?.session?.access_token;
  if(!token)throw new Error("Enter through the Flowtel Owner Concierge Desk first.");
  return token;
}

async function bridge(intent,payload={}){
  const token=await ownerToken();
  const response=await fetch("/api/squarespace-bridge",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({intent,...payload})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data?.ok)throw new Error(data?.error||"Membership reconciliation could not be completed.");
  return data;
}

function updateProvisionButton(){
  const checked=[...document.querySelectorAll('input[data-member-email]:checked')];
  provisionButton.disabled=!checked.length;
  provisionButton.textContent=checked.length?`Provision Selected (${checked.length})`:"Provision Selected";
}

function renderReport(data){
  reconciliationRows=Array.isArray(data.rows)?data.rows:[];
  const counts=data.counts||{};
  document.getElementById("linkedCount").textContent=counts.already_linked||0;
  document.getElementById("inviteCount").textContent=counts.ready_to_invite||0;
  document.getElementById("upgradeCount").textContent=counts.ready_to_upgrade||0;
  document.getElementById("reviewCount").textContent=counts.manual_review||0;
  summary.classList.remove("hidden");resultsSection.classList.remove("hidden");
  memberRows.innerHTML=reconciliationRows.map(row=>{
    const selectable=["ready_to_invite","ready_to_upgrade"].includes(row.status);
    return `<tr>
      <td>${selectable?`<input type="checkbox" data-member-email="${escapeHtml(row.email)}" aria-label="Select ${escapeHtml(row.email)}">`:""}</td>
      <td><span class="member-email">${escapeHtml(row.email)}</span><span class="sub">${escapeHtml(row.membershipLabel||row.membershipType||"")}</span></td>
      <td><span>${escapeHtml(row.membershipLabel||row.membershipType||"")}</span><span class="sub">Order ${escapeHtml(row.orderId||"—")}</span></td>
      <td><span>${escapeHtml(row.flowtelMembershipType||"No Flowtel membership")}</span><span class="sub">${row.authUserId?"Auth identity exists":"No Auth identity"}</span></td>
      <td><span class="badge ${badgeClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span></td>
    </tr>`;
  }).join("")||'<tr><td colspan="5">No mapped paid Squarespace membership orders were found.</td></tr>';
  document.querySelectorAll('input[data-member-email]').forEach(box=>box.addEventListener("change",updateProvisionButton));
  updateProvisionButton();
}

async function scan(){
  try{
    scanButton.disabled=true;provisionButton.disabled=true;status.textContent="Scanning paid Squarespace memberships and Flowtel identities…";
    const data=await bridge("admin-membership-reconciliation");
    renderReport(data);status.textContent=`Scan complete · ${data.rows?.length||0} verified paid member${data.rows?.length===1?"":"s"}.`;
  }catch(error){console.error(error);status.textContent=error?.message||"The reconciliation scan could not be completed.";}
  finally{scanButton.disabled=false;updateProvisionButton();}
}

async function provision(){
  const emails=[...document.querySelectorAll('input[data-member-email]:checked')].map(box=>box.dataset.memberEmail).filter(Boolean);
  if(!emails.length)return;
  if(!window.confirm(`Provision ${emails.length} verified Queendom/Flow FM member${emails.length===1?"":"s"}? New Flowtel identities will receive an invitation email.`))return;
  try{
    provisionButton.disabled=true;scanButton.disabled=true;status.textContent="Re-verifying purchases and preparing Flowtel room keys…";
    const data=await bridge("admin-provision-memberships",{emails});
    const successes=(data.results||[]).filter(row=>row.ok).length;
    const failures=(data.results||[]).filter(row=>!row.ok);
    status.textContent=failures.length?`${successes} provisioned; ${failures.length} need review: ${failures.map(row=>`${row.email}: ${row.error}`).join(" · ")}`:`${successes} member${successes===1?"":"s"} provisioned successfully.`;
    await scan();
  }catch(error){console.error(error);status.textContent=error?.message||"Selected members could not be provisioned.";}
  finally{scanButton.disabled=false;updateProvisionButton();}
}

scanButton.addEventListener("click",scan);
provisionButton.addEventListener("click",provision);

(async()=>{
  try{
    const {data}=await supabase.auth.getSession();
    if(!data?.session){window.location.replace("/client/?returnTo=/manager/membership/");return;}
    const {data:profile,error}=await supabase.from("profiles").select("role").eq("id",data.session.user.id).maybeSingle();
    if(error)throw error;
    if(!["owner","admin"].includes(String(profile?.role||"").toLowerCase()))throw new Error("Membership reconciliation is reserved for the Flowtel Owner/Admin.");
    status.textContent="Ready to compare Squarespace membership purchases with Flowtel identities.";
  }catch(error){status.textContent=error?.message||"The Owner session could not be verified.";scanButton.disabled=true;}
})();
