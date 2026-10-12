export const CLUBS = ['Driver','2 Wood','3 Wood','4 Wood','5 Wood','7 Wood','9 Wood','2 Hybrid','3 Hybrid','4 Hybrid','5 Hybrid','6 Hybrid','1 Iron','2 Iron','3 Iron','4 Iron','5 Iron','6 Iron','7 Iron','8 Iron','9 Iron','Pitching Wedge','Gap Wedge','Sand Wedge','Lob Wedge'];
export function cardinalClubs(selection) {
  if (!Array.isArray(selection) || selection.length !== 4 || selection.some(c => !CLUBS.includes(c)) || new Set(selection).size !== 4) throw new Error('Choose four different clubs. Your putter belongs in the center.');
  return {north:selection[0],east:selection[1],west:selection[2],south:selection[3],center:'Putter'};
}
