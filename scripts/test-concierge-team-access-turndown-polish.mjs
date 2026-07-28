import assert from 'node:assert/strict';

function oppositeWing(wing=''){
  return {
    'East Wing':'West Wing',
    'West Wing':'East Wing',
    'North Wing':'South Wing',
    'South Wing':'North Wing',
  }[wing] || null;
}
function deskAudience({email='',role='',teamAccess=false}={}){
  const owner=email.toLowerCase()==='mm.johnson@icloud.com' && ['admin','owner'].includes(role.toLowerCase());
  if(owner) return 'owner';
  if(role.toLowerCase()==='practitioner' && teamAccess) return 'team';
  return 'blocked';
}
function visibleAudienceSections(audience){
  return audience==='owner' ? ['team','owner','caddie'] : audience==='team' ? ['team'] : [];
}
function canTend({audience,ownWing,targetWing,requested=true,today=true}={}){
  if(audience==='owner') return true;
  return audience==='team' && requested && today && oppositeWing(ownWing)===targetWing;
}

assert.equal(oppositeWing('East Wing'),'West Wing');
assert.equal(oppositeWing('North Wing'),'South Wing');
assert.equal(deskAudience({email:'mm.johnson@icloud.com',role:'owner'}),'owner');
assert.equal(deskAudience({email:'priestess@example.com',role:'practitioner',teamAccess:true}),'team');
assert.equal(deskAudience({email:'member@example.com',role:'practitioner',teamAccess:false}),'blocked');
assert.deepEqual(visibleAudienceSections('team'),['team']);
assert.deepEqual(visibleAudienceSections('owner'),['team','owner','caddie']);
assert.equal(canTend({audience:'team',ownWing:'East Wing',targetWing:'West Wing'}),true);
assert.equal(canTend({audience:'team',ownWing:'East Wing',targetWing:'East Wing'}),false);
assert.equal(canTend({audience:'team',ownWing:'East Wing',targetWing:'West Wing',requested:false}),false);
assert.equal(canTend({audience:'owner',targetWing:'North Wing'}),true);

console.log('Concierge Team access, audience visibility, and assigned-wing Turndown behavior passed.');
