// Visual learning aid for the four inner seasons. Not a replacement for a user's Flow Map.
export function createMoonMagicMedicineWheel(){
 const section=document.createElement('section');
 section.setAttribute('aria-label','Moon Magic medicine wheel: inner seasons, moon phases and cycle days');
 const title=document.createElement('h3');
 title.textContent='Moon Magic Medicine Wheel';
 section.append(title);
 const grid=document.createElement('div');
 grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;max-width:540px;margin:1rem auto;aspect-ratio:1;border:2px solid currentColor;border-radius:50%;overflow:hidden;background:#faf7f2;';
 const quadrants=[
  ['Inner Winter','New Moon','Days 27–5'],
  ['Inner Spring','First Quarter','Days 6–11'],
  ['Inner Autumn','Third Quarter','Days 20–26'],
  ['Inner Summer','Full Moon','Days 12–19']
 ];
 quadrants.forEach(([season,phase,days],i)=>{
  const quadrant=document.createElement('div');
  quadrant.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3rem;padding:12px 5px;text-align:center;min-width:0;'+(i%2===0?'border-right:1px solid #b5aa97;':'')+(i<2?'border-bottom:1px solid #b5aa97;':'');
  const heading=document.createElement('strong');
  heading.textContent=season;
  const moon=document.createElement('span');
  moon.textContent=phase;
  const dates=document.createElement('small');
  dates.textContent=days;
  quadrant.append(heading,moon,dates);
  grid.append(quadrant);
 });
 section.append(grid);
 const note=document.createElement('p');
 note.textContent='This is the framework’s symbolic mapping of seasons to phases and cycle days, not a claim that menstrual and lunar phases always coincide. Use your actual cycle observations.';
 section.append(note);
 return section;
}
