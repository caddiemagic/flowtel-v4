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
