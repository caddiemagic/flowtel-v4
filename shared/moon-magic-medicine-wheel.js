// Lesson 2 medicine wheel: source-aligned orientation, labels, day numbering.
// Deliberately a teaching diagram, separate from the interactive Flow Map.
const SVG_NS='http://www.w3.org/2000/svg';
function node(parent,tag,attributes={},text=''){
 const el=document.createElementNS(SVG_NS,tag);
 for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));
 if(text)el.textContent=text;
 parent.append(el);
 return el;
}
function point(angle,radius){const rad=angle*Math.PI/180;return [320+radius*Math.cos(rad),320+radius*Math.sin(rad)];}
function segmentPath(day){
 const a=180-(day-1)*360/28, b=180-day*360/28;
 const [x1,y1]=point(a,234),[x2,y2]=point(b,234),[x3,y3]=point(b,191),[x4,y4]=point(a,191);
 return 'M '+x1+' '+y1+' A 234 234 0 0 0 '+x2+' '+y2+' L '+x3+' '+y3+' A 191 191 0 0 1 '+x4+' '+y4+' Z';
}
export function createMoonMagicMedicineWheel(){
 const section=document.createElement('section');
 section.setAttribute('aria-label','Moon Magic Medicine Wheel with days 1 to 28, compass directions, inner seasons, moon phases and cycle phases');
 const heading=document.createElement('h3');heading.textContent='Moon Magic Medicine Wheel';section.append(heading);
 const svg=node(section,'svg',{viewBox:'0 0 640 640',role:'img','aria-label':'28-day medicine wheel. Northwest: Autumn, Half New Moon, Luteal, days 20 to 26. Northeast: Summer, Full Moon, Ovulation, days 12 to 19. Southeast: Spring, Half Full Moon, Follicular, days 6 to 11. Southwest: Winter, New Moon, Menstruation, days 27 to 5. Directions: north 270 degrees, east 180 degrees, south 90 degrees, west 0 and 360 degrees.','preserveAspectRatio':'xMidYMid meet'});
 svg.style.cssText='display:block;width:100%;max-width:660px;margin:1rem auto;background:#d7c8df;border-radius:10px';
 node(svg,'circle',{cx:320,cy:320,r:234,fill:'none',stroke:'#fff','stroke-width':5});
 for(let day=1;day<=28;day++){
  const tone=(day>=20&&day<=26)?'#b58a72':(day>=12&&day<=19)?'#fff2a0':(day>=6&&day<=11)?'#fa7195':'#765a4e';
  node(svg,'path',{d:segmentPath(day),fill:'none',stroke:'#fff','stroke-width':2});
  const angle=180-(day-.5)*360/28,[x,y]=point(angle,211);
  node(svg,'text',{x,y,fill:tone,'font-family':'Arial, sans-serif','font-size':19,'font-weight':700,'text-anchor':'middle','dominant-baseline':'middle'},String(day));
 }
 node(svg,'circle',{cx:320,cy:320,r:190,fill:'none',stroke:'#fff','stroke-width':5});
 node(svg,'line',{x1:320,y1:69,x2:320,y2:571,stroke:'#fff','stroke-width':5});
 node(svg,'line',{x1:69,y1:320,x2:571,y2:320,stroke:'#fff','stroke-width':5});
 node(svg,'circle',{cx:320,cy:320,r:15,fill:'none',stroke:'#fff','stroke-width':2});
 const quadrants=[
  {x:233,y:260,color:'#b58a72',title:'AUTUMN',phase:'HALF NEW MOON',cycle:'LUTEAL',days:'DAYS 20–26',other:'WANING'},
  {x:407,y:260,color:'#fff3aa',title:'SUMMER',phase:'FULL MOON',cycle:'OVULATION',days:'DAYS 12–19'},
  {x:407,y:376,color:'#fa6e8d',title:'SPRING',phase:'HALF FULL MOON',cycle:'FOLLICULAR',days:'DAYS 6–11',other:'WAXING'},
  {x:233,y:376,color:'#715751',title:'WINTER',phase:'NEW MOON',cycle:'MENSTRUATION',days:'DAYS 27–5'}
 ];
 for(const q of quadrants){
  const lines=[q.title,q.phase,...(q.other?[q.other]:[]),q.cycle,q.days];
  lines.forEach((label,i)=>node(svg,'text',{x:q.x,y:q.y+(i-(lines.length-1)/2)*17,fill:q.color,'font-family':'Arial, sans-serif','font-weight':i===0?800:700,'font-size':i===0?20:12,'text-anchor':'middle','dominant-baseline':'middle'},label));
 }
 const directions=[
  ['N','270°',320,39],['NE','',517,120],['E','180°',593,321],['SE','',515,523],
  ['S','90°',320,592],['SW','',122,523],['W','0° / 360°',47,321],['NW','',122,120]
 ];
 for(const [label,degrees,x,y] of directions){
  node(svg,'text',{x,y,fill:'#fff','font-family':'Arial, sans-serif','font-weight':800,'font-size':15,'text-anchor':'middle'},label);
  if(degrees)node(svg,'text',{x,y:y+20,fill:'#fff','font-family':'Arial, sans-serif','font-weight':700,'font-size':12,'text-anchor':'middle'},degrees);
 }
 const note=document.createElement('p');
 note.textContent='The moon-phase and cycle-phase correspondences are a symbolic teaching framework. Menstrual cycles vary, and your lived rhythm does not need to synchronize with the sky.';
 section.append(note);
 return section;
}
