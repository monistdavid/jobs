// scripts/transform-seed.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { slugify } from '../src/logic.js';

const SHEET_ID = '1mvceHg-RBUckbcUXtgFW-_x_CH7c1Dcy';
const GID = '1663402424';
const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// --- minimal RFC4180 CSV parser (handles quotes + embedded newlines) ---
function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (c === '"') { q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const splitMulti = (v) =>
  String(v || '').split(/[;\n]|,\s(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);

// Addresses must stay whole — split only on newlines/semicolons, never on the
// comma pattern (which would shred "190 E 9th Ave, Denver, CO" into fragments).
const splitLines = (v) =>
  String(v || '').split(/[;\n]/).map((s) => s.trim()).filter(Boolean);

const cityRe = /\b(Denver|Aurora|Lakewood|Westminster|Wheat Ridge|Arvada|Englewood|Littleton|Centennial|Thornton|Broomfield|Boulder|Commerce City|Greeley|Highlands Ranch|Colorado Springs)\b/;

function deriveArea(locations) {
  const m = String(locations || '').match(cityRe);
  return m ? m[0] : 'Denver metro';
}

const res = await fetch(URL);
if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
const rows = parseCSV(await res.text());
const data = rows.slice(3); // row 0 = Q-codes, row 1 = question text, row 2 = sub-header/template row

const sites = [];
const seen = new Set();
for (const r of data) {
  const name = (r[2] || '').trim();
  if (!name) continue;
  let id = slugify(name);
  while (seen.has(id)) id += '-2';
  seen.add(id);
  const comp = (r[12] || '').trim();
  sites.push({
    id,
    name,
    website: (r[3] || '').trim(),
    description: (r[4] || '').trim(),
    area: deriveArea(r[15]),
    addresses: splitLines(r[15]),
    siteTypes: splitMulti(r[6]),
    populations: splitMulti(r[7]),
    services: splitMulti(r[8]),
    deliveryModes: splitMulti(r[9]),
    paid: !/^no\b/i.test(comp),
    compensationNote: comp,
    languages: splitMulti(r[11]),
    positionsCount: (r[14] || '').trim(),
    applicationRequirements: splitMulti(r[16]),
    deadline: (r[17] || '').trim(),
    applyMethod: (r[18] || '').trim(),
    contact: (r[19] || '').trim(),
    hiresAfter: /^yes\b/i.test((r[21] || '').trim()),
    source: 'spreadsheet',
  });
}

mkdirSync('data', { recursive: true });
writeFileSync('data/sites.json', JSON.stringify(sites, null, 2) + '\n');
console.log(`wrote ${sites.length} seed sites to data/sites.json`);
