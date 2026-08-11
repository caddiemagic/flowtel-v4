import assert from 'node:assert/strict';

function localStamp(dateValue,timeValue){
  const date=String(dateValue||'').replace(/-/g,'');
  const match=/^(\d{2}):(\d{2})/.exec(String(timeValue||''));
  return date&&match?`${date}T${match[1]}${match[2]}00`:'';
}
function defaultEnd(dateValue,startTime){
  const [year,month,day]=dateValue.split('-').map(Number);
  const match=/^(\d{2}):(\d{2})/.exec(startTime);
  const value=new Date(Date.UTC(year,month-1,day,Number(match[1]),Number(match[2])+60));
  return {date:value.toISOString().slice(0,10),time:value.toISOString().slice(11,16)};
}

assert.equal(localStamp('2026-08-12','19:15'),'20260812T191500');
assert.deepEqual(defaultEnd('2026-08-12','19:15'),{date:'2026-08-12',time:'20:15'});
assert.deepEqual(defaultEnd('2026-08-12','23:30'),{date:'2026-08-13',time:'00:30'});

const canRegister=(rank,audience)=>rank>=(audience==='flowfm'?2:1);
assert.equal(canRegister(1,'queendom'),true);
assert.equal(canRegister(1,'flowfm'),false);
assert.equal(canRegister(2,'flowfm'),true);

const doorway=(origin,eventId)=>{
  const target=new URL('/client/',origin);
  target.searchParams.set('membership','queendom');
  target.searchParams.set('lounge','1');
  target.searchParams.set('saveEvent',eventId);
  target.searchParams.set('eventReturn','1');
  target.hash='my-upcoming-events';
  return target;
};
const url=doorway('https://flowtel.example','11111111-1111-1111-1111-111111111111');
assert.equal(url.pathname,'/client/');
assert.equal(url.searchParams.get('saveEvent'),'11111111-1111-1111-1111-111111111111');
assert.equal(url.hash,'#my-upcoming-events');
assert.equal(url.searchParams.has('token'),false);
assert.equal(url.searchParams.has('zoom'),false);

console.log('Flowtel v0.10.84 My Upcoming Events behavior checks passed.');
