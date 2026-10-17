// Design-preview-only bridge. This is browser-tab session storage, never server storage.
// No real member account data is loaded and the preview can be cleared at any time.
const KEY='flowtel_13_moons_wish_preview_v1';
export function readWishPreview(){
 try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');
 if(!x||!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(x.startMonth)||!Array.isArray(x.wishes)||x.wishes.length!==13)return null;
 return {startMonth:x.startMonth,sealed:x.sealed===true,wishes:x.wishes.map((v,i)=>i===0?'':typeof v==='string'?v.slice(0,4000):'')};
 }catch{return null;}
}
export function writeWishPreview(startMonth,wishes,sealed=false){
 if(!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(startMonth)||!Array.isArray(wishes)||wishes.length!==13)return false;
 try{const existing=readWishPreview();if(existing?.sealed)return false;sessionStorage.setItem(KEY,JSON.stringify({startMonth,sealed,wishes:wishes.map((v,i)=>i===0?'':String(v||'').slice(0,4000))}));return true;}catch{return false;}
}
export function clearWishPreview(){try{sessionStorage.removeItem(KEY);}catch{}}

export function sealWishPreview(startMonth,wishes){const valid=Array.isArray(wishes)&&wishes.length===13&&wishes[0]===''&&wishes.slice(1).every(w=>typeof w==='string'&&w.trim().length>0);return valid&&writeWishPreview(startMonth,wishes,true);}
