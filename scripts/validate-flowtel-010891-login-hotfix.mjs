import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const client=read('client/app.js');
const html=read('client/index.html');
const roadmap=read('docs/FLOWTEL_ROADMAP.md');
const release=read('docs/RELEASE-0.10.89.1.md');
const must=(ok,msg)=>{if(!ok)throw new Error(msg);};

must(!/import\s*\{[^}]*QueendomEvent[^}]*\}\s*from\s*["']\.\.\/shared\/queendom-events\.js/.test(client), 'Client auth bundle must not statically import Queendom Events exports.');
must(client.includes('import("../shared/queendom-events.js?v=0.10.89.1")'), 'Event module must lazy-load with the v0.10.89.1 cache key.');
must(client.includes('document.getElementById("signInButton").addEventListener("click",handleSignIn);'), 'Existing Sign In handler must remain bound.');
must(client.includes('bootFlowtelClient();'), 'Remembered-session client boot must remain enabled.');
must(client.includes("function icsEscape(value){return String(value??'').replace(/\\\\/g,'\\\\\\\\').replace(/\\r?\\n/g,'\\\\n').replace(/,/g,'\\\\,').replace(/;/g,'\\\\;');}"), 'ICS escaping helper must be restored.');
must(html.includes('./app.js?v=0.10.89.1'), 'Client app cache key must advance to v0.10.89.1.');
must(html.includes('./styles.css?v=0.10.89.1'), 'Client stylesheet cache key must advance to v0.10.89.1.');
must(roadmap.includes('v0.10.89.1 Login Doorway Isolation Hotfix'), 'Roadmap must identify the current hotfix.');
must(release.includes('No migration is required for this hotfix.'), 'Release docs must state the no-migration boundary.');
console.log('Flowtel v0.10.89.1 login doorway isolation validator passed.');
