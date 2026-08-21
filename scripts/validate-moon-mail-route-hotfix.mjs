import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fail = (msg) => { throw new Error(msg); };

const vercel = JSON.parse(read("vercel.json"));
const rewrites = vercel.rewrites || [];
const exact = rewrites.find((rule) => rule.source === "/moon-mail");
const nested = rewrites.find((rule) => rule.source === "/moon-mail/:path*");
if (!exact || exact.destination !== "/moonbox/") fail("Moon Mail exact alias rewrite is missing or incorrect.");
if (!nested || nested.destination !== "/moonbox/:path*") fail("Moon Mail catch-all alias rewrite is missing or incorrect.");

const shared = read("shared/supabase.js");
if (!shared.includes('"/moonbox/"') || !shared.includes('"/moon-mail/"')) fail("Moon Mail and Moonbox must both remain protected Flowtel prefixes.");

const app = read("moonbox/app.js");
if (!app.includes('../shared/supabase.js?v=0.10.86.2')) fail("Moon Mail must cache-bust the shared product-access guard for this hotfix.");

const html = read("moonbox/index.html");
if (!html.includes("<h1>MOON MAIL</h1>")) fail("Existing Moonbox implementation must remain the Moon Mail room.");

if (fs.existsSync(path.join(root, "moon-mail", "index.html"))) fail("Do not create a duplicate physical Moon Mail implementation.");

console.log("Moon Mail route hotfix validation passed.");
