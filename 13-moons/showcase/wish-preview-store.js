// Design-preview-only bridge. This is browser-tab session storage, never server storage.
// No real member account data is loaded and the preview can be cleared at any time.
const KEY='flowtel_13_moons_wish_preview_v1';
export function readWishPreview(){
 try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');
 if(!x||!/^\\d{4}-(0[1-9]|1[0-2])$/.test(x.startMonth)||!Array.isArray(x.wishes)||x.wishes.length!==13)return null;
 return {startMonth:x.startMonth,wishes:x.wishes.map((v,i)=>i===0?'':typeof v==='string'?v.slice(0,4000):'')};
 }catch{return null;}
}
export function writeWishPreview(startMonth,wishes){
 if(!/^\\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)||!Array.isArray(wishes)||wishes.length!==13)return false;
 try{sessionStorage.setItem(KEY,JSON.stringify({startMonth,wishes:wishes.map((v,i)=>i===0?'':String(v||'').slice(0,4000))}));return true;}catch{return false;}
}
export function clearWishPreview(){try{sessionStorage.removeItem(KEY);}catch{}}
