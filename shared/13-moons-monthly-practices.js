// Additional monthly practices approved by the course creator.
export const DAILY_INVOCATION = 'I call all of my energy back to the center of my own universe so i can see and hear myself more clearly. i form a violet flame ring of fire within and around me. any energy that no  longer resonates with the highest timeline is required to exit my field now. i call on the spirits of the four cardinal directions, the north, south, east, and west, to guard the four cardinal gates.';
export const ELEMENTS_INVOCATION_ADDITION = 'I call in the wind in the north to blow my thoughts in the right direction and to blow my haters away. i call in fire in the east to burn away my attachments to past timelines and and lifetimes. i call in the earth in the south to ground me, to connect me to gravity so i can feel a solid foundation under my feet with every step i take towards the unknown. in the west i call in water, to guide my flow and keep me fluid and forgiving.';
export const NEW_MOON_WATER_RITUAL_URL = 'https://www.theidyllcollective.com/queendomlibrary/v/moonmagicwaterritual1';
// Supplements, never replaces, shared/womb-work.js or the longform teachings.
export const MONTHLY_INITIATION_PRACTICES = [
  null,
  {title:'Begin tracking your cycle day',body:'Record your cycle day each day alongside the moon day and your daily observations. If you do not bleed, keep observing your relationship to the moon and your own rhythms.'},
  {title:'Begin your daily invocation',body:'Speak the supplied daily invocation aloud each day, or something of your own.',script:DAILY_INVOCATION},
  {title:'Begin a New Moon ritual',body:'Begin a ritual you return to each New Moon. The New Moon Magic Water Ritual will be offered as one option.',link:NEW_MOON_WATER_RITUAL_URL,linkLabel:'Watch the New Moon Magic Water Ritual'},
  {title:'Plan with your printed moon calendar and make a monthly offering',body:'Use your printed moon calendar to record your cycle and plan your schedule in alignment with the moon and your energy. Leave more open space around your bleed. If you bleed and choose to collect menstrual blood, offer it to the earth. If you do not bleed, make rose water on the Dark Moon and offer some to the earth once a month.'},
  {title:'Bring the four elements into your invocation',body:'Begin working with the four elements as part of your daily invocation.',script:DAILY_INVOCATION+'\n\n'+ELEMENTS_INVOCATION_ADDITION},
  {title:'Meet your Angelic Army at your altar',body:'Set up an altar and begin regularly working with it as part of your relationship with your Angelic Army.'},
  {title:'Share your daily check-ins with sisterhood',body:'Begin sharing your daily cycle check-ins in the sisterhood Telegram chat. Practice using your voice and allowing yourself to be witnessed in your reflection.'},
  {title:'Hold a New Moon ceremony for yourself',body:'Create and hold a New Moon ceremony for yourself.'},
  {title:'Create a four-directional altar',body:'Create a four-directional altar honoring the four divine masculine directions.'},
  {title:'Open ceremony with your daily invocation',body:'Expand the daily invocation you have been practicing into opening ceremony each day.'},
  {title:'Record daily invocations in a private Telegram group',body:'Create an empty Telegram group chat for your own use, and begin recording your daily invocations there. Keep it private unless you intentionally choose otherwise.'},
  {title:'Host a ceremony for others',body:'Prepare and host an in-person ceremony for others.'},
  {title:'Review your thirteen moons and close the spiral',body:'Read back through your Flow Maps and create a new integration Flow Map reflecting on what happened throughout the year and across each inner season. Read the letter you wrote to your future self at the beginning of your initiation.'}
];
export function thirteenMonthsAfter(isoDate){
  if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(isoDate||'')) return '';
  const [y,m,d]=isoDate.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.toISOString().slice(0,10)!==isoDate) return '';
  const targetMonth=(m-1)+13;
  const first=new Date(Date.UTC(y,targetMonth,1));
  const lastDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(d,lastDay))).toISOString().slice(0,10);
}
