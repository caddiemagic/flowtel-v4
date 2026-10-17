import {BOUNDARY_SLOTS,ALTAR_DIRECTIONS,findAltarDirection} from '/shared/13-moons-boundaries-altar.js';
import {CREATIVE_FLOW_CORNERS,INNER_SEASON_PLANNING} from '/shared/13-moons-ceremony-choices.js';
import {INNER_SEASONS,seasonForWheelDay} from '/shared/13-moons-inner-seasons.js';

const make=(tag,text,parent,cls)=>{
 const element=document.createElement(tag);
 if(text!==undefined)element.textContent=text;
 if(cls)element.className=cls;
 if(parent)parent.append(element);
 return element;
};
let explorerCounter=0;
export function createCycleDayExplorer(mode='track'){
 const scopeId='moon-explorer-scope-'+(++explorerCounter);
 const host=make('div',undefined,null,'moon-explorer');
 const intro=make('p',mode==='track'
  ? 'Explore the 28-day teaching wheel, then use your existing Flowtel Cycle Data to record your real observations.'
  : 'Select a season or a day on the wheel. Notice how the four phases connect, without needing to fit your body to a perfect 28-day pattern.',host);
 const dayLabel=make('label','A day on the medicine wheel',host,'moon-explorer-label');
 const slider=make('input',undefined,host);
 slider.type='range';slider.min='1';slider.max='28';slider.step='1';slider.value='1';
 slider.setAttribute('aria-label','Explore a day on the 28-day medicine wheel');
 slider.setAttribute('aria-describedby',scopeId);
 const bounds=make('div',undefined,host,'moon-explorer-bounds');
 make('small','DAY 1',bounds);make('small','DAY 28',bounds);
 const choices=make('div',undefined,host,'moon-explorer-choices');
 const buttons=INNER_SEASONS.map((season,i)=>{
  const btn=make('button',season.name,choices,'moon-explorer-choice');
  btn.type='button';btn.setAttribute('aria-pressed','false');
  btn.onclick=()=>select([1,6,12,20][i]);
  return btn;
 });
 const result=make('section',undefined,host,'moon-explorer-result');
 result.setAttribute('aria-live','polite');
 const note=make('p','This is the symbolic 28-day Medicine Wheel used in the teaching. Individual menstrual cycles vary; these day numbers do not predict ovulation or the astronomical moon phase.',host,'moon-explorer-scope');
 note.id=scopeId;
 const actions=make('div',undefined,host,'moon-explorer-actions');
 const link=make('a','Record my actual cycle observations →',actions);
 link.href='/cycle-data/';link.target='_blank';link.rel='noopener noreferrer';
 const map=make('a','Visit my existing Flow Map →',actions);
 map.href='/flow-map/?cycle=previous&return=%2F13-moons%2F';map.target='_blank';map.rel='noopener noreferrer';
 make('p','Selections here are for exploring the lesson. Nothing is written to Flowtel until you use its existing tools.',host,'moon-explorer-scope');
 function select(day){
  const season=seasonForWheelDay(day);
  if(!season)return;
  slider.value=String(day);
  result.replaceChildren();
  make('p','DAY '+day+' · '+season.name.toUpperCase(),result,'moon-explorer-kicker');
  make('h5',season.phase+' · '+season.cycle,result);
  make('p','Wheel days '+season.days+'. '+season.description,result);
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(INNER_SEASONS[i].key===season.key)));
 }
 slider.addEventListener('input',()=>select(Number(slider.value)));
 const ready=make('p','Choose a wheel day or one of the four inner seasons to begin.',result);
 ready.className='moon-explorer-invitation';
 return host;
}

export function createFourCornersExplorer(){
 const host=make('div',undefined,null,'moon-explorer');
 make('p','The Four Corners of Creative Flow: Time, Space, Purpose, and Energy. Touch one corner at a time and explore what your Big Vision is asking for.',host);
 const grid=make('div',undefined,host,'moon-explorer-choices');
 const panel=make('section',undefined,host,'moon-explorer-result');
 panel.setAttribute('aria-live','polite');
 const responses=new Map();
 const buttons=[];
 function reveal(corner){
  panel.replaceChildren();
  make('p','THE '+corner.label.toUpperCase()+' CORNER',panel,'moon-explorer-kicker');
  make('h5',corner.question,panel);
  const prompt=make('label','A thought I want to hold…',panel,'moon-explorer-label');
  const field=make('textarea',undefined,panel);field.maxLength=4000;field.rows=4;
  field.placeholder='Let your thoughts arrive…';field.value=responses.get(corner.key)||'';
  field.setAttribute('aria-label','My '+corner.label+' reflection');
  field.addEventListener('input',()=>responses.set(corner.key,field.value));
  buttons.forEach(([button,key])=>button.setAttribute('aria-pressed',String(key===corner.key)));
 }
 for(const corner of CREATIVE_FLOW_CORNERS){
  const button=make('button',corner.label,grid,'moon-explorer-choice');
  button.type='button';button.setAttribute('aria-pressed','false');
  button.onclick=()=>reveal(corner);buttons.push([button,corner.key]);
 }
 make('p','This is a temporary exploration within your lesson. It does not create another saved journal. Your private future-self letter remains the Womb Work writing practice for this initiation.',host,'moon-explorer-scope');
 reveal(CREATIVE_FLOW_CORNERS[0]);
 return host;
}

export function createSeasonPlanningExplorer(){
 const host=make('div',undefined,null,'moon-explorer');
 make('p','Explore four kinds of space you might make in your printed moon calendar. The seasons are invitations to notice your real rhythm, not scheduling rules.',host);
 const options=make('div',undefined,host,'moon-explorer-choices');
 const panel=make('section',undefined,host,'moon-explorer-result');
 const responses=new Map(),buttons=[];
 panel.setAttribute('aria-live','polite');
 function reveal(season){
  panel.replaceChildren();
  make('p',season.label.toUpperCase(),panel,'moon-explorer-kicker');
  make('h5',season.question,panel);
  const field=make('textarea',undefined,panel);field.maxLength=4000;field.rows=4;
  field.placeholder='My intention for this season…';field.value=responses.get(season.key)||'';
  field.setAttribute('aria-label','Planning intention for '+season.label);
  field.addEventListener('input',()=>responses.set(season.key,field.value));
  buttons.forEach(([button,key])=>button.setAttribute('aria-pressed',String(key===season.key)));
 }
 for(const season of INNER_SEASON_PLANNING){
  const button=make('button',season.label,options,'moon-explorer-choice');
  button.type='button';button.setAttribute('aria-pressed','false');
  button.onclick=()=>reveal(season);buttons.push([button,season.key]);
 }
 const actions=make('div',undefined,host,'moon-explorer-actions');
 const calendar=make('a','Open my existing Cycle Data →',actions);
 calendar.href='/cycle-data/';calendar.target='_blank';calendar.rel='noopener noreferrer';
 const map=make('a','Review my Flow Map →',actions);
 map.href='/flow-map/?cycle=previous&return=%2F13-moons%2F';map.target='_blank';map.rel='noopener noreferrer';
 make('p','These ideas are temporary while you explore. Put your plan on your printed moon calendar or use your existing Flowtel records; nothing here changes your calendar.',host,'moon-explorer-scope');
 reveal(INNER_SEASON_PLANNING[0]);
 return host;
}

export function createBoundaryRitual(){
 const host=make('div',undefined,null,'moon-explorer moon-boundary-ritual');
 make('p','Begin with one boundary. Move gently through three places where your life force deserves a clearer container.',host);
 const tabs=make('div',undefined,host,'moon-boundary-tabs');
 const panel=make('section',undefined,host,'moon-explorer-result');
 panel.setAttribute('aria-live','polite');
 const values=BOUNDARY_SLOTS.map(()=>({boundary:'',protects:''}));
 const buttons=[];
 let active=0;
 function show(index){
  active=index;
  panel.replaceChildren();
  const slot=BOUNDARY_SLOTS[index];
  make('p','BOUNDARY '+slot.number+' OF 3',panel,'moon-explorer-kicker');
  make('h5','What boundary would support you?',panel);
  const statement=make('label','The boundary I want to set',panel,'moon-explorer-label');
  const field=make('textarea',undefined,panel);
  field.rows=3;field.maxLength=4000;
  field.value=values[index].boundary;
  field.placeholder='I am choosing to…';
  field.setAttribute('aria-label','Boundary '+slot.number+' statement');
  const protection=make('label','What will this protect?',panel,'moon-explorer-label');
  const second=make('textarea',undefined,panel);
  second.rows=2;second.maxLength=4000;
  second.value=values[index].protects;
  second.placeholder='My time, energy, creative space…';
  second.setAttribute('aria-label','What boundary '+slot.number+' protects');
  const marker=make('p','An intention for this boundary will appear here as you write.',panel,'moon-boundary-preview');
  const reflect=()=>{
   values[index].boundary=field.value;
   values[index].protects=second.value;
   marker.textContent=field.value.trim()?
     'I choose: '+field.value.trim()+(second.value.trim()?' · Protecting: '+second.value.trim():''):
     'An intention for this boundary will appear here as you write.';
   updateTabs();
  };
  field.addEventListener('input',reflect);second.addEventListener('input',reflect);
  reflect();
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===active)));
 }
 function updateTabs(){
  buttons.forEach((button,i)=>{
   button.textContent='Boundary '+(i+1)+(values[i].boundary.trim()?' ✓':'');
  });
 }
 BOUNDARY_SLOTS.forEach((slot,index)=>{
  const button=make('button','Boundary '+slot.number,tabs,'moon-explorer-choice');
  button.type='button';button.setAttribute('aria-pressed','false');
  button.onclick=()=>{show(index);drawButtons();};buttons.push(button);
 });
 const nav=make('div',undefined,host,'moon-explorer-actions');
 const previous=make('button','← Previous boundary',nav,'moon-quiet-button');
 const next=make('button','Next boundary →',nav,'moon-quiet-button');
 function drawButtons(){previous.disabled=active===0;next.disabled=active===2;}
 previous.onclick=()=>{show(active-1);drawButtons();};
 next.onclick=()=>{show(active+1);drawButtons();};
 show(0);drawButtons();
 // Keep the preview gentle: a ritual exercise, not a second member journal.
 make('p','These are temporary notes for exploration. Your original Womb Work remains to name three boundaries that protect your practice; this screen does not save them to Flowtel.',host,'moon-explorer-scope');
 return host;
}

export function createAngelicAltarExplorer(){
 const host=make('div',undefined,null,'moon-explorer moon-altar-explorer');
 make('p','Imagine a simple altar for your Angelic Army. Choose a direction to consider what support you would invite there and a symbol that could represent it.',host);
 const compass=make('div',undefined,host,'moon-altar-compass');
 const values=Object.fromEntries(ALTAR_DIRECTIONS.map(direction=>[direction.key,{support:'',symbol:''}]));
 const buttons=new Map();
 let active='north';
 const display=make('section',undefined,host,'moon-explorer-result');
 display.setAttribute('aria-live','polite');
 const center=make('div','✧ YOUR ALTAR ✧',compass,'moon-altar-center');
 function show(key){
  const direction=findAltarDirection(key);
  if(!direction)return;
  active=key;
  display.replaceChildren();
  make('p',direction.label.toUpperCase()+' · '+direction.element.toUpperCase(),display,'moon-explorer-kicker');
  make('h5',direction.invitation,display);
  const first=make('label','Who or what are you inviting into this direction?',display,'moon-explorer-label');
  const support=make('textarea',undefined,display);
  support.rows=3;support.maxLength=4000;support.value=values[key].support;
  support.placeholder='An ally, ancestor, angel, quality, or source of support…';
  support.setAttribute('aria-label','Support invited in the '+direction.label);
  const second=make('label','What symbol or object might honor that support?',display,'moon-explorer-label');
  const symbol=make('textarea',undefined,display);
  symbol.rows=2;symbol.maxLength=4000;symbol.value=values[key].symbol;
  symbol.placeholder='A flower, stone, candle, written intention…';
  symbol.setAttribute('aria-label','Symbol for the '+direction.label);
  function update(){
   values[key].support=support.value;
   values[key].symbol=symbol.value;
   buttons.get(key).querySelector('small').textContent=direction.element+(support.value.trim()||symbol.value.trim()?' · ✧':'');
  }
  support.addEventListener('input',update);symbol.addEventListener('input',update);
  for(const [directionKey,button] of buttons){button.setAttribute('aria-pressed',String(directionKey===active));}
 }
 ALTAR_DIRECTIONS.forEach(direction=>{
  const button=make('button',undefined,compass,'moon-altar-point moon-altar-'+direction.key);
  button.type='button';button.setAttribute('aria-pressed','false');
  make('strong',direction.label,button);
  make('small',direction.element,button);
  button.onclick=()=>show(direction.key);
  buttons.set(direction.key,button);
 });
 show('north');
 make('p','Your altar can be as simple as a note or a symbolic arrangement. This design exercise is temporary and does not record spiritual information or change your existing Flowtel profile.',host,'moon-explorer-scope');
 return host;
}
