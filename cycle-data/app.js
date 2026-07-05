import { getCurrentProfile } from "../shared/profiles.js";
import { listMyClients } from "../shared/flowtel.js";

const intro=document.getElementById("dashboardIntro");
const viewingName=document.getElementById("viewingName");
const viewerToggle=document.getElementById("viewerToggle");
const snapshotTitle=document.getElementById("snapshotTitle");
const snapshotCopy=document.getElementById("snapshotCopy");
const message=document.getElementById("dashboardMessage");

function params(){ return new URLSearchParams(window.location.search); }
function requestedClientId(){ return params().get("client"); }
function fullName(profile){
  return [profile?.first_name,profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Flowtel Guest";
}
function link(label,href,active=false){
  const a=document.createElement("a");
  a.href=href;
  a.textContent=label;
  if(active) a.classList.add("active");
  return a;
}
function renderToggle(profile,clients,targetId){
  viewerToggle.innerHTML="";
  viewerToggle.appendChild(link("My Data","/cycle-data/",!targetId));
  clients.forEach(row=>{
    const client=row.client || {};
    viewerToggle.appendChild(link(fullName(client),`/cycle-data/?client=${encodeURIComponent(row.client_id)}`,targetId===row.client_id));
  });

  if(["admin","owner"].includes(profile?.role)){
    viewerToggle.appendChild(link("All Clients","/cycle-data/?scope=all",params().get("scope")==="all"));
  }
}
async function init(){
  try{
    const profile=await getCurrentProfile();
    if(!profile){
      intro.textContent="Please sign in through your Suite or Concierge Desk to view cycle data.";
      viewingName.textContent="No active session";
      return;
    }

    const clients=await listMyClients().catch(()=>[]);
    const targetId=requestedClientId();
    renderToggle(profile,clients,targetId);

    if(params().get("scope")==="all"){
      if(!["admin","owner"].includes(profile.role)){
        throw new Error("Only Flowtel admins can open the all-clients dashboard.");
      }
      intro.textContent="Founder view is open.";
      viewingName.textContent="All Flowtel clients";
      snapshotTitle.textContent="Collective Flow Map foundation";
      snapshotCopy.textContent="This will become the global admin view for all guest cycle patterns, seasonal reflections, and collective trends.";
      return;
    }

    if(targetId){
      const relationship=clients.find(row=>row.client_id===targetId);
      if(!relationship && !["admin","owner"].includes(profile.role)){
        throw new Error("This cycle dashboard is only available for connected clients.");
      }
      const client=relationship?.client || { id:targetId };
      intro.textContent="Consent-aware client view is open.";
      viewingName.textContent=fullName(client);
      snapshotTitle.textContent="Client Flow Map foundation";
      snapshotCopy.textContent="This client has invited mentor access. The next release will populate this view with their Flowtel cycle data, check-ins, reflections, and stay history.";
      return;
    }

    intro.textContent="Your own Flowtel cycle data lives here first.";
    viewingName.textContent=fullName(profile);
    snapshotTitle.textContent="My Flow Map foundation";
    snapshotCopy.textContent="Practitioners are guests first and mentors second. Your own stays and cycle patterns will populate this dashboard before you tend anyone else’s data.";
  }catch(error){
    console.error(error);
    intro.textContent="This dashboard could not open.";
    viewingName.textContent="Access unavailable";
    if(message) message.textContent=error?.message || "Please return to the Concierge Desk and try again.";
  }
}

init();
