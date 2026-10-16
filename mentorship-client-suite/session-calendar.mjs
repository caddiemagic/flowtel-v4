// UTC iCalendar exports. No attendees or invitation delivery; no private playback links.
import {kindLabel} from './dashboard-model.mjs';
function escapeText(value){return String(value??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function timestamp(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))throw Error('A valid session time is required');return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');}
function fold(line){const encoder=new TextEncoder();let result='',part='',bytes=0;for(const character of line){const length=encoder.encode(character).length;if(bytes+length>75){result+=part+'\r\n';part=' ';bytes=1;}part+=character;bytes+=length;}return result+part;}
export function sessionCalendar(session,programTitle,now=new Date()){
 if(session?.status!=='confirmed')throw Error('Only confirmed sessions can be added to your calendar');
 if(!/^[a-z0-9-]{1,100}$/i.test(String(session.id||'')))throw Error('A valid session identifier is required');
 if(!Number.isInteger(session.duration_minutes)||session.duration_minutes<1||session.duration_minutes>1440)throw Error('A valid session duration is required');
 if(typeof session.scheduled_at!=='string'||!session.scheduled_at)throw Error('A valid session time is required');
 const start=new Date(session.scheduled_at);if(!Number.isFinite(start.getTime()))throw Error('A valid session time is required');
 const end=new Date(start.getTime()+session.duration_minutes*60000);
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Flowtel//Private Mentorship//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+session.id+'@mentorship.theflowtel.com','DTSTAMP:'+timestamp(now),'DTSTART:'+timestamp(start),'DTEND:'+timestamp(end),'SUMMARY:'+escapeText((programTitle||'Private mentorship')+' · '+kindLabel(session.session_kind)),'DESCRIPTION:'+escapeText('Your private mentorship session. Return to your Flowtel suite for the latest schedule and meeting link. Flowtel Time is America/Los_Angeles.'),'CLASS:PRIVATE','STATUS:CONFIRMED','TRANSP:OPAQUE','END:VEVENT','END:VCALENDAR'];
 return lines.map(fold).join('\r\n')+'\r\n';
}
