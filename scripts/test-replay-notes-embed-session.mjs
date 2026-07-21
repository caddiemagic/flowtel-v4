import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const replayHtml=await readFile('replay-notes/index.html','utf8');
const replayJs=await readFile('replay-notes/app.js','utf8');
const replayCss=await readFile('replay-notes/styles.css','utf8');
const connectHtml=await readFile('replay-notes/connect/index.html','utf8');
const connectJs=await readFile('replay-notes/connect/app.js','utf8');
const vercel=JSON.parse(await readFile('vercel.json','utf8'));

assert(replayHtml.includes('id="replayNoteRoom"') && !replayHtml.includes('id="replayNoteRoom" hidden'),'Replay note form should render by default.');
assert(replayHtml.includes('id="replayNoteFields" disabled'),'Replay note fields should remain private until connected.');
assert(replayHtml.includes('id="connectFlowtelButton"'),'Replay-note connection button is missing.');
assert(replayCss.includes('fieldset:disabled'),'Disabled replay-note privacy state is missing.');
assert(replayJs.includes("window.open(popupUrl.toString(),'flowtelReplayNotesConnect'"),'One-click first-party connection window is missing.');
assert(replayJs.includes("event.origin!==window.location.origin"),'Replay-note session receiver must verify the sender origin.');
assert(replayJs.includes("payload.connection!==connectionId"),'Replay-note session receiver must verify the one-time connection nonce.');
assert(replayJs.includes('supabase.auth.setSession'),'Embedded notes room does not install the returned Flowtel session.');
assert(connectJs.includes('supabase.auth.getSession()'),'Connection window does not reuse a remembered first-party Flowtel session.');
assert(connectJs.includes('signInWithEmail(email,password)'),'Connection window lacks fallback Flowtel sign-in.');
assert(connectJs.includes("window.opener.postMessage"),'Connection window does not return the session to the embedded notes room.');
assert(connectJs.includes('window.location.origin'),'Connection window must use an exact same-origin postMessage target.');
assert(!/accessToken.*searchParams|refreshToken.*searchParams/s.test(connectJs),'Session tokens must never be placed in the URL.');
assert(connectHtml.includes('autocomplete="current-password"'),'Connection sign-in should use the browser password manager safely.');
assert((vercel.rewrites||[]).some(item=>item.source==='/replay-notes/connect'&&item.destination==='/replay-notes/connect/index.html'),'Replay-note connection route is missing.');
assert((vercel.headers||[]).some(item=>item.source==='/replay-notes/connect'&&item.headers?.some(header=>header.key==='Cache-Control'&&/no-store/.test(header.value))),'Connection window must be no-store.');

console.log('Replay Notes Squarespace session bridge tests passed.');
