import fs from 'node:fs';

const html=fs.readFileSync(new URL('../manager/events/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../manager/events/styles.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../manager/events/app.js',import.meta.url),'utf8');

const checks=[
  ['Event Admin CSS cache key is v0.10.90.1 or newer hotfix', /\/manager\/events\/styles\.css\?v=0\.10\.90(?:\.\d+)?/.test(html)],
  ['Event Admin JS cache key is v0.10.90.1 or newer hotfix', /\/manager\/events\/app\.js\?v=0\.10\.90(?:\.\d+)?/.test(html)],
  ['Series count retains min=2 for real series', /id="eventSeriesCount"[^>]*min="2"/.test(html)],
  ['Series-only hidden CSS guard exists', /\[data-series-field\]\[hidden\]\{display:none!important\}/.test(css)],
  ['Non-series series-count input is disabled', js.includes('fields.seriesCount.disabled=!series')],
  ['Non-series series-interval input is disabled', js.includes('fields.seriesInterval.disabled=!series')],
  ['Series-only labels still toggle by event format', js.includes("element.hidden=!series")],
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} — ${name}`);
  if(!ok)failed++;
}
if(failed){
  console.error(`\n${failed} v0.10.90.1 validation check(s) failed.`);
  process.exit(1);
}
console.log('\nFlowtel v0.10.90.1 event-editor hotfix validation passed.');
