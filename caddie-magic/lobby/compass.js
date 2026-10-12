export function normalizeClub(value) {
  const club=String(value ?? '').trim().replace(/\s+/g,' ');
  if (!club || club.length>60) throw new Error('Enter a club name using 1–60 characters.');
  if (/^p$/i.test(club) || /putter|putting/i.test(club)) throw new Error("You can't choose your putter, select another club");
  return club;
}
export function cardinalClubs(selection) {
  if (!Array.isArray(selection) || selection.length!==4) throw new Error('Enter four different clubs.');
  const clubs=selection.map(normalizeClub);
  if(new Set(clubs.map(c=>c.toLowerCase().replace(/[\s-]/g,''))).size!==4) throw new Error('Choose a different club—you already entered that one.');
  return {north:clubs[0],east:clubs[1],west:clubs[2],south:clubs[3],center:'Putter'};
}
