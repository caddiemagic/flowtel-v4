// A private doorway, driven only by the authenticated mentorship API.
// Hiding this link supplements (never replaces) server-side authorization.
export function mountMentorshipEntry({supabase,element,fetcher=fetch,events=window}){
 let version=0,disposed=false;
 const hide=()=>{version++;element.hidden=true;element.classList.add('hidden');};
 async function refresh(){
  hide();const current=version;
  try{
   const {data,error}=await supabase.auth.getSession();if(error||disposed||current!==version)return;
   const session=data?.session;if(!session?.user?.id||!session.access_token)return;
   const headers={Authorization:'Bearer '+session.access_token};
   const results=await Promise.allSettled(['','&prepared=1'].map(async query=>{
    const response=await fetcher('/api/caddie-acuity?mentorship=client'+query,{headers,cache:'no-store'});
    if(!response.ok)return false;
    const body=await response.json();if(body.ok!==true)return false;
    const rows=query?body.prepared:body.enrollments;
    return Array.isArray(rows)&&rows.some(row=>typeof row.id==='string'&&row.id&&(query||['invited','active','paused','completed'].includes(row.status)));
   }));
   if(disposed||current!==version)return;
   const allowed=results.some(result=>result.status==='fulfilled'&&result.value===true);
   element.hidden=!allowed;element.classList.toggle('hidden',!allowed);
  }catch{if(current===version)hide();}
 }
 const subscription=supabase.auth.onAuthStateChange(event=>{
  if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event)){hide();if(event!=='SIGNED_OUT')setTimeout(()=>{if(!disposed)void refresh();},0);}
 });
 const onFocus=()=>{void refresh();};events.addEventListener('focus',onFocus);
 void refresh();
 return {refresh,clear:hide,dispose(){disposed=true;hide();subscription?.data?.subscription?.unsubscribe();events.removeEventListener('focus',onFocus);}};
}
