# Denver Counseling Internship Finder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static personal website that browses, filters, and tracks Denver-metro counseling (心理咨询师) internship sites — seeded from the user's spreadsheet (~40 sites) and expanded with 50+ new sites found via Claude in Chrome.

**Architecture:** Plain static site (HTML/CSS/vanilla JS, no framework, no build step). All site data lives in `data/sites.json`. Pure logic (search/filter/sort/stats) is isolated in an importable ES module so it can be unit-tested with Node's built-in test runner. Application-tracking state lives in browser `localStorage`, keyed by site `id`, with JSON export/import. Deploys to GitHub Pages.

**Tech Stack:** HTML5, CSS3 (Fraunces + Inter via Google Fonts), vanilla ES modules, Node.js built-in `node:test` (no third-party deps), Claude in Chrome (browser automation) for the research pass, GitHub Pages for hosting.

---

## File Structure

```
index.html                  page structure (header, controls, grid, detail panel)
styles.css                  approved visual direction
src/logic.js                pure functions: searchSites, filterSites, sortSites, computeStats, slugify, parseDeadline
src/tracking.js             pure functions: localStorage read/write, export/import serialization
app.js                      DOM glue: load data, render, wire events, import logic + tracking
data/sites.json             all sites (seed + research)
data/sites.schema.md        human-readable field contract
scripts/transform-seed.mjs  fetch Google Sheet CSV -> normalized seed records
scripts/validate-data.mjs   data integrity test (run via node --test)
test/logic.test.mjs         unit tests for src/logic.js
test/tracking.test.mjs      unit tests for src/tracking.js
test/validate.test.mjs      runs validation assertions against data/sites.json
README.md                   how to run, test, and deploy
```

Each file has one responsibility. `src/logic.js` and `src/tracking.js` are pure (no DOM, no globals) so they unit-test cleanly; `app.js` is the only file that touches the DOM.

---

## Task 1: Repo scaffold + README

**Files:**
- Create: `README.md`
- Create: `package.json`
- Create: `data/sites.schema.md`

- [ ] **Step 1: Create `package.json`** (declares ES modules + test script, zero deps)

```json
{
  "name": "denver-counseling-internship-finder",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "transform": "node scripts/transform-seed.mjs",
    "serve": "python3 -m http.server 8080"
  }
}
```

- [ ] **Step 2: Create `data/sites.schema.md`** (the field contract)

```markdown
# sites.json record shape

Each entry in `data/sites.json` is one object:

| field | type | notes |
|-------|------|-------|
| id | string | unique slug, e.g. "colorado-therapy-collective" |
| name | string | required |
| website | string | "" if unknown |
| description | string | "" if unknown |
| area | string | short label, e.g. "Denver – Highlands" or "Denver metro" |
| addresses | string[] | full location strings |
| siteTypes | string[] | |
| populations | string[] | |
| services | string[] | |
| deliveryModes | string[] | |
| paid | boolean | true unless compensation explicitly "No" |
| compensationNote | string | |
| languages | string[] | |
| positionsCount | string | free text (e.g. "2", "1-2", "") |
| applicationRequirements | string[] | |
| deadline | string | "Rolling", an ISO date, or free text; "" if unknown |
| applyMethod | string | |
| contact | string | |
| hiresAfter | boolean | false if unknown |
| source | string | "spreadsheet" or "research" |

Tracking state (status + notes) is NOT stored here — it lives in localStorage.
```

- [ ] **Step 3: Create `README.md`**

```markdown
# Denver 心理咨询师 Internship Finder

Static site to browse, filter, and track counseling internship/practicum sites in
the Denver metro area.

## Run locally
```
npm run serve   # then open http://localhost:8080
```
(A static server is required because the app loads ES modules + JSON via fetch.)

## Build the seed dataset
```
npm run transform   # fetches the Google Sheet and writes data/sites.json seed
```

## Test
```
npm test
```

## Deploy
Push to GitHub, enable Pages (serve from `main` / root). See plan for details.
```

- [ ] **Step 4: Commit**

```bash
git add README.md package.json data/sites.schema.md
git commit -m "chore: scaffold project (package.json, README, data schema)"
```

---

## Task 2: Slug helper (TDD)

**Files:**
- Create: `src/logic.js`
- Test: `test/logic.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/logic.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/logic.js';

test('slugify lowercases and hyphenates', () => {
  assert.equal(slugify('Colorado Therapy Collective'), 'colorado-therapy-collective');
});

test('slugify strips punctuation and trailing markers', () => {
  assert.equal(slugify('Center for Valued Living*'), 'center-for-valued-living');
  assert.equal(slugify('Knippenberg, Patterson, Langley & Assoc.'), 'knippenberg-patterson-langley-assoc');
});

test('slugify collapses repeated separators', () => {
  assert.equal(slugify('A   B -- C'), 'a-b-c');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/logic.test.mjs`
Expected: FAIL — `slugify` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/logic.js
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/logic.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/logic.js test/logic.test.mjs
git commit -m "feat: add slugify helper"
```

---

## Task 3: Search / filter / sort / stats logic (TDD)

**Files:**
- Modify: `src/logic.js`
- Test: `test/logic.test.mjs`

- [ ] **Step 1: Add failing tests**

```javascript
// append to test/logic.test.mjs
import { searchSites, filterSites, sortSites, computeStats, parseDeadline } from '../src/logic.js';

const SAMPLE = [
  { id:'a', name:'Alpha Counseling', area:'Denver', paid:true,  populations:['Adults'],
    services:['Individual therapy'], languages:['English'], description:'depth work', deadline:'2026-03-01' },
  { id:'b', name:'Beta Center',      area:'Aurora', paid:false, populations:['Children'],
    services:['Play therapy'], languages:['Spanish'], description:'bilingual', deadline:'Rolling' },
  { id:'c', name:'Gamma Clinic',     area:'Denver', paid:true,  populations:['LGBTQ+'],
    services:['Group therapy'], languages:['English'], description:'', deadline:'' },
];

test('searchSites matches name, population, service, description (case-insensitive)', () => {
  assert.deepEqual(searchSites(SAMPLE, 'beta').map(s=>s.id), ['b']);
  assert.deepEqual(searchSites(SAMPLE, 'CHILDREN').map(s=>s.id), ['b']);
  assert.deepEqual(searchSites(SAMPLE, 'therapy').map(s=>s.id).sort(), ['a','b','c']);
  assert.deepEqual(searchSites(SAMPLE, '').map(s=>s.id), ['a','b','c']); // empty -> all
});

test('filterSites applies area, paid, population, language filters (AND across categories)', () => {
  assert.deepEqual(filterSites(SAMPLE, { area:'Denver' }).map(s=>s.id), ['a','c']);
  assert.deepEqual(filterSites(SAMPLE, { paid:true }).map(s=>s.id), ['a','c']);
  assert.deepEqual(filterSites(SAMPLE, { population:'Children' }).map(s=>s.id), ['b']);
  assert.deepEqual(filterSites(SAMPLE, { language:'Spanish' }).map(s=>s.id), ['b']);
  assert.deepEqual(filterSites(SAMPLE, { area:'Denver', paid:true }).map(s=>s.id), ['a','c']);
  assert.deepEqual(filterSites(SAMPLE, {}).map(s=>s.id), ['a','b','c']); // no filters -> all
});

test('parseDeadline returns a Date for ISO, null otherwise', () => {
  assert.equal(parseDeadline('2026-03-01').getTime(), new Date('2026-03-01').getTime());
  assert.equal(parseDeadline('Rolling'), null);
  assert.equal(parseDeadline(''), null);
});

test('sortSites by name, paid, deadline', () => {
  assert.deepEqual(sortSites(SAMPLE,'name').map(s=>s.id), ['a','b','c']);
  assert.deepEqual(sortSites(SAMPLE,'paid').map(s=>s.id), ['a','c','b']); // paid first, stable
  // deadline: dated first (ascending), undated last
  assert.deepEqual(sortSites(SAMPLE,'deadline').map(s=>s.id), ['a','b','c']);
});

test('computeStats counts totals', () => {
  const stats = computeStats(SAMPLE, { a:{status:'Applied'} });
  assert.equal(stats.total, 3);
  assert.equal(stats.paid, 2);
  assert.equal(stats.applied, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/logic.test.mjs`
Expected: FAIL — `searchSites` etc. not exported.

- [ ] **Step 3: Implement the functions in `src/logic.js`**

```javascript
// append to src/logic.js
const norm = (v) => String(v ?? '').toLowerCase();
const arr  = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);

export function searchSites(sites, query) {
  const q = norm(query).trim();
  if (!q) return sites.slice();
  return sites.filter((s) => {
    const hay = [
      s.name, s.description, s.area,
      ...arr(s.populations), ...arr(s.services), ...arr(s.siteTypes),
    ].map(norm).join(' • ');
    return hay.includes(q);
  });
}

export function filterSites(sites, f = {}) {
  return sites.filter((s) => {
    if (f.area && s.area !== f.area) return false;
    if (f.paid === true && s.paid !== true) return false;
    if (f.population && !arr(s.populations).includes(f.population)) return false;
    if (f.language && !arr(s.languages).includes(f.language)) return false;
    return true;
  });
}

export function parseDeadline(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return null;
  const d = new Date(m);
  return isNaN(d.getTime()) ? null : d;
}

export function sortSites(sites, key) {
  const out = sites.slice();
  if (key === 'name') {
    out.sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  } else if (key === 'paid') {
    out.sort((a, b) => (b.paid === true) - (a.paid === true)); // stable: paid first
  } else if (key === 'deadline') {
    out.sort((a, b) => {
      const da = parseDeadline(a.deadline), db = parseDeadline(b.deadline);
      if (da && db) return da - db;
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
  }
  return out;
}

export function computeStats(sites, tracking = {}) {
  const isApplied = (id) => ['Applied','Interviewing','Offer'].includes(tracking[id]?.status);
  return {
    total: sites.length,
    paid: sites.filter((s) => s.paid === true).length,
    applied: sites.filter((s) => isApplied(s.id)).length,
    research: sites.filter((s) => s.source === 'research').length,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/logic.test.mjs`
Expected: PASS (all logic tests green).

- [ ] **Step 5: Commit**

```bash
git add src/logic.js test/logic.test.mjs
git commit -m "feat: add search/filter/sort/stats logic with tests"
```

---

## Task 4: Tracking module (TDD)

**Files:**
- Create: `src/tracking.js`
- Test: `test/tracking.test.mjs`

- [ ] **Step 1: Write the failing test** (uses an injected storage object, so it runs under Node with no browser)

```javascript
// test/tracking.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore, serialize, deserialize, STATUSES } from '../src/tracking.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

test('STATUSES has the agreed pipeline', () => {
  assert.deepEqual(STATUSES, ['New','Interested','Applied','Interviewing','Rejected','Offer']);
});

test('store reads empty, writes status and notes, persists', () => {
  const storage = memStorage();
  const store = makeStore(storage);
  assert.deepEqual(store.get('site-a'), { status:'New', notes:'' });
  store.set('site-a', { status:'Applied', notes:'sent email' });
  assert.deepEqual(store.get('site-a'), { status:'Applied', notes:'sent email' });
  // new store over same storage sees persisted value
  assert.deepEqual(makeStore(storage).get('site-a'), { status:'Applied', notes:'sent email' });
});

test('serialize / deserialize round-trips', () => {
  const data = { 'site-a': { status:'Applied', notes:'x' } };
  assert.deepEqual(deserialize(serialize(data)), data);
});

test('deserialize rejects malformed json by throwing', () => {
  assert.throws(() => deserialize('not json'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tracking.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/tracking.js`**

```javascript
// src/tracking.js
export const STATUSES = ['New','Interested','Applied','Interviewing','Rejected','Offer'];
const KEY = 'denver-internship-tracking-v1';

export function makeStore(storage) {
  let data = {};
  try { data = JSON.parse(storage.getItem(KEY) || '{}') || {}; } catch { data = {}; }
  const save = () => storage.setItem(KEY, JSON.stringify(data));
  return {
    get(id) {
      const t = data[id] || {};
      return { status: t.status || 'New', notes: t.notes || '' };
    },
    set(id, { status, notes }) {
      data[id] = { status: status || 'New', notes: notes || '' };
      save();
    },
    all() { return { ...data }; },
    replaceAll(next) { data = next || {}; save(); },
  };
}

export function serialize(data) {
  return JSON.stringify(data, null, 2);
}

export function deserialize(text) {
  const parsed = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('tracking import must be a JSON object');
  }
  return parsed;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tracking.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tracking.js test/tracking.test.mjs
git commit -m "feat: add tracking store with localStorage + export/import"
```

---

## Task 5: Seed data transform script

**Files:**
- Create: `scripts/transform-seed.mjs`
- Create (output): `data/sites.json`

- [ ] **Step 1: Write `scripts/transform-seed.mjs`**

Fetches the Google Sheet as CSV and normalizes each row into the schema. Uses only Node built-ins. `slugify` is imported from `src/logic.js` to stay DRY.

```javascript
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
    addresses: splitMulti(r[15]),
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
```

- [ ] **Step 2: Run the transform**

Run: `node scripts/transform-seed.mjs`
Expected: prints `wrote 40 seed sites to data/sites.json` (count ≈ 40; exact number is whatever the sheet currently holds).

- [ ] **Step 3: Sanity-check the output**

Run: `node -e "const s=require('./data/sites.json'); console.log(s.length, s[0].name, s[0].id, s[0].paid)"`
Expected: a count, a real site name, its slug, and a boolean.

- [ ] **Step 4: Commit**

```bash
git add scripts/transform-seed.mjs data/sites.json
git commit -m "feat: transform Google Sheet into seed sites.json"
```

---

## Task 6: Data validation test

**Files:**
- Create: `scripts/validate-data.mjs`
- Create: `test/validate.test.mjs`

- [ ] **Step 1: Write `scripts/validate-data.mjs`** (exported validator, reusable by the test)

```javascript
// scripts/validate-data.mjs
import { readFileSync } from 'node:fs';

const REQUIRED_STRING = ['id','name','source'];
const ARRAY_FIELDS = ['addresses','siteTypes','populations','services','deliveryModes','languages','applicationRequirements'];
const BOOL_FIELDS = ['paid','hiresAfter'];

export function validate(sites) {
  const errors = [];
  if (!Array.isArray(sites)) return ['root is not an array'];
  const ids = new Set();
  sites.forEach((s, i) => {
    REQUIRED_STRING.forEach((k) => {
      if (typeof s[k] !== 'string' || !s[k].trim()) errors.push(`[${i}] missing string ${k}`);
    });
    if (ids.has(s.id)) errors.push(`[${i}] duplicate id ${s.id}`);
    ids.add(s.id);
    if (!['spreadsheet','research'].includes(s.source)) errors.push(`[${i}] bad source ${s.source}`);
    BOOL_FIELDS.forEach((k) => {
      if (typeof s[k] !== 'boolean') errors.push(`[${i}] ${k} must be boolean`);
    });
    ARRAY_FIELDS.forEach((k) => {
      if (!Array.isArray(s[k])) errors.push(`[${i}] ${k} must be an array`);
    });
    if (typeof s.deadline !== 'string') errors.push(`[${i}] deadline must be a string`);
  });
  return errors;
}

// CLI usage: `node scripts/validate-data.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const sites = JSON.parse(readFileSync('data/sites.json', 'utf8'));
  const errors = validate(sites);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: ${sites.length} sites valid`);
}
```

- [ ] **Step 2: Write `test/validate.test.mjs`**

```javascript
// test/validate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from '../scripts/validate-data.mjs';

test('data/sites.json passes validation', () => {
  const sites = JSON.parse(readFileSync('data/sites.json', 'utf8'));
  assert.deepEqual(validate(sites), []);
});

test('validate catches a bad record', () => {
  const errs = validate([{ id:'x', name:'', source:'spreadsheet', paid:'no', hiresAfter:false,
    addresses:[], siteTypes:[], populations:[], services:[], deliveryModes:[], languages:[],
    applicationRequirements:[], deadline:'' }]);
  assert.ok(errs.length >= 2); // empty name + non-boolean paid
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `node --test`
Expected: all suites (logic, tracking, validate) PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-data.mjs test/validate.test.mjs
git commit -m "test: add data integrity validation"
```

---

## Task 7: Research pass — find 50+ new sites via Claude in Chrome

**Files:**
- Modify: `data/sites.json` (append `source: "research"` records)

This task is browser-driven research, not code. Work in batches and commit progress so nothing is lost.

- [ ] **Step 1: Load existing names for de-duplication**

Run: `node -e "const s=require('./data/sites.json'); console.log(s.map(x=>x.name).join('\n'))"`
Keep this list; skip any candidate whose name or website matches an existing seed site.

- [ ] **Step 2: Open Chrome and search source by source**

Use Claude in Chrome (`ToolSearch` to load `mcp__claude-in-chrome__*`, start with `tabs_context_mcp`, then `tabs_create_mcp` + `navigate` + `get_page_text`). Sweep these source types, recording candidates:
  - Psychology Today "Denver, CO" practice listings (look for group practices noting trainees/practicum)
  - Community mental health centers: WellPower, Jefferson Center, AllHealth Network, Aurora Mental Health & Recovery, Community Reach Center, Mental Health Partners
  - University/college counseling training clinics in the metro (DU, MSU Denver, CU Denver, Regis, Adams State satellite, Naropa)
  - Counseling collectives / group practices with intern programs
  - Specialty clinics: children/trauma, LGBTQ+, bilingual/Spanish, eating disorders, SUD/recovery
  - Job boards: Indeed "counseling intern Denver", Network of Schools of Professional Psychology listings

Constraints (from spec): for each site capture as many schema fields as the source supports; **always** record `website` and how to apply; mark fields you cannot verify as empty rather than guessing; set `source: "research"`.

- [ ] **Step 3: Append records to `data/sites.json`**

For each confirmed new site, add an object matching `data/sites.schema.md`, generating `id` with the same slug rules (lowercase, hyphenated). Append to the array (keep seed records first).

- [ ] **Step 4: Validate after each batch**

Run: `node scripts/validate-data.mjs`
Expected: `OK: N sites valid`. Fix any reported errors before continuing.

- [ ] **Step 5: Confirm the count target is met**

Run: `node -e "const s=require('./data/sites.json'); console.log('research:', s.filter(x=>x.source==='research').length, 'total:', s.length)"`
Expected: `research: >= 50`. If under 50, return to Step 2 with additional sources.

- [ ] **Step 6: Commit** (commit each batch as you go)

```bash
git add data/sites.json
git commit -m "data: add researched Denver internship sites (batch)"
```

---

## Task 8: Page structure (index.html)

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write `index.html`** (semantic regions; loads fonts, styles, and app.js as a module)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Denver 心理咨询师 Internship Finder</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <div class="brand">
        <h1>Denver Internship Finder</h1>
        <span class="zh">心理咨询师实习</span>
      </div>
      <p class="tag">Counseling practicum &amp; internship sites across the Denver metro</p>
      <div class="stats" id="stats"></div>
    </div>
  </header>

  <div class="controls">
    <div class="wrap">
      <div class="row">
        <label class="search">🔍
          <input id="search" type="search" placeholder="Search sites, populations, services…" autocomplete="off">
        </label>
        <select id="sort" aria-label="Sort by">
          <option value="deadline">Sort: Deadline</option>
          <option value="name">Sort: Name</option>
          <option value="paid">Sort: Paid first</option>
        </select>
      </div>
      <div class="row chips" id="filters"></div>
    </div>
  </div>

  <main class="wrap">
    <p id="result-count" class="result-count"></p>
    <div class="grid" id="grid"></div>
    <p id="empty" class="empty" hidden>No sites match your filters.</p>
  </main>

  <aside class="panel" id="panel" hidden>
    <div class="panel-scrim" id="panel-scrim"></div>
    <div class="panel-body" id="panel-body" role="dialog" aria-modal="true"></div>
  </aside>

  <div class="toolbar">
    <button id="export-btn" type="button">⬇ Export tracking</button>
    <label class="import-label">⬆ Import
      <input id="import-input" type="file" accept="application/json" hidden>
    </label>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify it loads** (no JS yet, so expect an empty grid)

Run: `npm run serve` then open `http://localhost:8080`.
Expected: header, search bar, sort dropdown, and toolbar render; grid is empty. No console 404s except app.js logic until next tasks.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add page structure"
```

---

## Task 9: Styles (styles.css)

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Write `styles.css`** porting the approved visual direction (palette, Fraunces/Inter, cards, chips, status badges, paid accent) and adding styles for the detail panel, toolbar, and responsive grid.

Base the rules on the approved mockup at
`.superpowers/brainstorm/25853-1780510417/content/polished-v1.html` (same CSS
variables and component styling), extended with:

```css
/* additions beyond the mockup */
.panel[hidden]{display:none}
.panel{position:fixed;inset:0;z-index:20}
.panel-scrim{position:absolute;inset:0;background:rgba(31,77,63,.35)}
.panel-body{position:absolute;right:0;top:0;height:100%;width:min(460px,92vw);
  background:var(--paper);overflow-y:auto;padding:28px;box-shadow:-12px 0 40px -20px rgba(0,0,0,.4)}
.toolbar{position:fixed;left:0;right:0;bottom:0;display:flex;gap:12px;justify-content:center;
  padding:10px;background:var(--cream);border-top:1px solid var(--line)}
.status-select{font-family:inherit;padding:8px 10px;border-radius:9px;border:1px solid var(--line)}
.notes-box{width:100%;min-height:90px;font-family:inherit;padding:10px;border-radius:9px;border:1px solid var(--line)}
@media (max-width:560px){ .stats{gap:16px} .grid{grid-template-columns:1fr} }
```

Reuse the mockup's `:root` variables, `.wrap`, `.site-header`/`header`, `.controls`,
`.chip`, `.grid`, `.card`, `.status`, `.pill`, `.deadline`, and font declarations
verbatim (rename the mockup's `header` selector to `.site-header` to match index.html).

- [ ] **Step 2: Verify visually**

Run: `npm run serve` then reload `http://localhost:8080`.
Expected: header band has forest-green background, serif title, cream page — matching the approved mockup. Grid still empty (rendered next task).

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add approved visual styles"
```

---

## Task 10: Render cards + stats + result count (app.js)

**Files:**
- Create: `app.js`

- [ ] **Step 1: Write `app.js`** — load data, render the grid and stats using the logic module

```javascript
// app.js
import { searchSites, filterSites, sortSites, computeStats } from './src/logic.js';
import { makeStore, STATUSES, serialize, deserialize } from './src/tracking.js';

const store = makeStore(window.localStorage);
let SITES = [];
const state = { query:'', sort:'deadline', filters:{} };

const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function statusClass(status) {
  return { Applied:'s-applied', Interested:'s-interested', Interviewing:'s-applied',
    Offer:'s-applied', Rejected:'s-new', New:'s-new' }[status] || 's-new';
}

function cardHTML(s) {
  const t = store.get(s.id);
  const pay = s.paid ? `<span class="pill pay">💰 ${esc(s.compensationNote || 'Paid')}</span>` : `<span class="pill">🤝 Unpaid</span>`;
  const pops = (s.populations || []).slice(0,2).map((p) => `<span class="pill">👥 ${esc(p)}</span>`).join('');
  const dl = s.deadline ? `⏳ ${esc(s.deadline)}` : '⏳ —';
  return `<article class="card${s.paid ? ' paid' : ''}" data-id="${esc(s.id)}" tabindex="0">
    <span class="accent"></span>
    <div class="top"><h3>${esc(s.name)}</h3>
      <span class="status ${statusClass(t.status)}">${esc(t.status)}</span></div>
    <div class="meta"><span class="pill">📍 ${esc(s.area)}</span>${pay}${pops}</div>
    <p class="desc">${esc(s.description) || '<em>No description provided.</em>'}</p>
    <div class="foot"><span class="deadline">${dl}</span><span class="open">Details →</span></div>
  </article>`;
}

function visibleSites() {
  let list = searchSites(SITES, state.query);
  list = filterSites(list, state.filters);
  return sortSites(list, state.sort);
}

function renderStats() {
  const st = computeStats(SITES, store.all());
  el('stats').innerHTML = [
    ['total','Sites'],['paid','Paid'],['applied','Applied'],['research','New finds'],
  ].map(([k,l]) => `<div class="stat"><div class="n">${st[k]}</div><div class="l">${l}</div></div>`).join('');
}

function renderGrid() {
  const list = visibleSites();
  el('grid').innerHTML = list.map(cardHTML).join('');
  el('result-count').textContent = `${list.length} of ${SITES.length} sites`;
  el('empty').hidden = list.length > 0;
}

async function init() {
  SITES = await (await fetch('data/sites.json')).json();
  renderStats();
  renderGrid();
}
init();

// exported for later tasks
window.__app = { renderGrid, renderStats, state, get SITES(){ return SITES; }, store };
```

- [ ] **Step 2: Verify cards render**

Run: `npm run serve`, reload. Expected: stat band shows real counts; grid fills with site cards in the approved style; result count reads e.g. "90 of 90 sites".

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: render site cards and stats"
```

---

## Task 11: Wire search, sort, and filter chips

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add filter-chip building + event wiring** (append before the `window.__app` export)

```javascript
function uniqueValues(key) {
  const set = new Set();
  SITES.forEach((s) => (s[key] || []).forEach((v) => set.add(v)));
  return [...set].sort();
}

function renderFilters() {
  const areas = [...new Set(SITES.map((s) => s.area))].sort();
  const pops = uniqueValues('populations').slice(0, 8);
  const langs = uniqueValues('languages').filter((l) => l && l !== 'English').slice(0, 4);
  const chips = [];
  chips.push(chip('All', !state.filters.area && !state.filters.paid, () => { state.filters = {}; sync(); }));
  chips.push(chip('💰 Paid only', state.filters.paid === true, () => {
    state.filters.paid = state.filters.paid ? undefined : true; sync(); }, 'terra'));
  areas.forEach((a) => chips.push(chip(a, state.filters.area === a, () => {
    state.filters.area = state.filters.area === a ? undefined : a; sync(); })));
  pops.forEach((p) => chips.push(chip(p, state.filters.population === p, () => {
    state.filters.population = state.filters.population === p ? undefined : p; sync(); })));
  langs.forEach((l) => chips.push(chip('🗣 ' + l, state.filters.language === l, () => {
    state.filters.language = state.filters.language === l ? undefined : l; sync(); })));
  el('filters').replaceChildren(...chips);
}

function chip(label, on, onClick, extra='') {
  const b = document.createElement('button');
  b.className = `chip ${extra} ${on ? 'on' : ''}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function sync() { renderFilters(); renderGrid(); }

el('search').addEventListener('input', (e) => { state.query = e.target.value; renderGrid(); });
el('sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });
```

- [ ] **Step 2: Call `renderFilters()` in `init()`**

Modify `init()` to call `renderFilters();` right after `renderStats();`.

- [ ] **Step 3: Verify interactions**

Run: `npm run serve`, reload. Expected: typing filters cards live; sort dropdown reorders; clicking a chip toggles it (highlighted) and narrows the grid; "All" resets.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: wire search, sort, and filter chips"
```

---

## Task 12: Detail panel with status + notes editing

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add the detail panel renderer + open/close wiring** (append before `window.__app`)

```javascript
function field(label, value) {
  if (!value || (Array.isArray(value) && !value.length)) return '';
  const v = Array.isArray(value) ? value.map(esc).join(', ') : esc(value);
  return `<div class="field"><div class="label">${esc(label)}</div><div>${v}</div></div>`;
}

function openPanel(id) {
  const s = SITES.find((x) => x.id === id);
  if (!s) return;
  const t = store.get(id);
  const link = s.website ? `<a class="open" href="${esc(s.website)}" target="_blank" rel="noopener">Visit website ↗</a>` : '';
  el('panel-body').innerHTML = `
    <button class="panel-close" id="panel-close" aria-label="Close">✕</button>
    <h2>${esc(s.name)}</h2>
    ${link}
    <p class="desc-full">${esc(s.description)}</p>
    ${field('Area', s.area)}
    ${field('Addresses', s.addresses)}
    ${field('Site type', s.siteTypes)}
    ${field('Populations', s.populations)}
    ${field('Services', s.services)}
    ${field('Delivery', s.deliveryModes)}
    ${field('Compensation', s.compensationNote)}
    ${field('Languages', s.languages)}
    ${field('Positions', s.positionsCount)}
    ${field('Application requires', s.applicationRequirements)}
    ${field('Deadline', s.deadline)}
    ${field('How to apply', s.applyMethod)}
    ${field('Contact', s.contact)}
    <hr>
    <div class="label">My status</div>
    <select class="status-select" id="status-select">
      ${STATUSES.map((x) => `<option ${x === t.status ? 'selected' : ''}>${x}</option>`).join('')}
    </select>
    <div class="label" style="margin-top:12px">My notes</div>
    <textarea class="notes-box" id="notes-box" placeholder="Application notes…">${esc(t.notes)}</textarea>`;
  el('panel').hidden = false;

  const persist = () => {
    store.set(id, { status: el('status-select').value, notes: el('notes-box').value });
    renderStats(); renderGrid();
  };
  el('status-select').addEventListener('change', persist);
  el('notes-box').addEventListener('input', persist);
  el('panel-close').addEventListener('click', closePanel);
}

function closePanel() { el('panel').hidden = true; }
el('panel-scrim').addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

el('grid').addEventListener('click', (e) => {
  const card = e.target.closest('.card'); if (card) openPanel(card.dataset.id);
});
el('grid').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const card = e.target.closest('.card'); if (card) openPanel(card.dataset.id); }
});
```

- [ ] **Step 2: Add minimal `.field` / `.panel-close` styles to `styles.css`**

```css
.field{margin:10px 0;font-size:14px}
.field .label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);margin-bottom:2px}
.panel-close{float:right;border:0;background:transparent;font-size:18px;cursor:pointer;color:var(--ink-soft)}
.desc-full{color:var(--ink-soft);line-height:1.55;margin:10px 0}
```

- [ ] **Step 3: Verify**

Run: `npm run serve`, reload. Expected: clicking a card opens a right-side panel with all fields; changing status updates the card badge + stats immediately; typing notes and reopening shows them persisted (reload too — localStorage).

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat: add detail panel with status and notes tracking"
```

---

## Task 13: Export / import tracking data

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Wire the toolbar buttons** (append before `window.__app`)

```javascript
el('export-btn').addEventListener('click', () => {
  const blob = new Blob([serialize(store.all())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'internship-tracking.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

el('import-input').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const next = deserialize(await file.text());
    store.replaceAll(next);
    renderStats(); renderGrid();
    alert('Tracking data imported.');
  } catch (err) {
    alert('Import failed: ' + err.message);
  }
  e.target.value = '';
});
```

Note: `alert` is acceptable here (user-initiated import feedback, not during automated browsing).

- [ ] **Step 2: Verify round-trip**

Run: `npm run serve`, reload. Set a couple statuses → click **Export** (downloads `internship-tracking.json`). Clear localStorage in devtools, reload (statuses reset to New), click **Import** and choose the file → statuses restore.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: export/import tracking data as JSON"
```

---

## Task 14: Final verification + deploy to GitHub Pages

**Files:**
- Modify: `README.md` (deploy notes)

- [ ] **Step 1: Run the full test suite**

Run: `node --test`
Expected: logic, tracking, and validate suites all PASS.

- [ ] **Step 2: Full manual smoke check** (serve, then confirm each)

- [ ] header stats correct  - [ ] search narrows  - [ ] each filter chip works
- [ ] sort by deadline/name/paid  - [ ] detail panel opens/closes
- [ ] status + notes persist across reload  - [ ] export downloads  - [ ] import restores
- [ ] layout holds on a narrow (mobile) width

- [ ] **Step 3: Add deploy notes to `README.md`**

```markdown
## Deploy to GitHub Pages
1. Create a GitHub repo and push: `git remote add origin <url> && git push -u origin main`
2. Repo → Settings → Pages → Source: "Deploy from a branch", Branch: `main` / `/ (root)`.
3. Wait ~1 min; your site is at `https://<user>.github.io/<repo>/`.

### Optional: make it non-public
GitHub Pages URLs are public. For a light gate, add a static password overlay
(e.g. a small script prompting for a passphrase before revealing the app), or keep
the repo private and use a Netlify "password protection" deploy instead.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add GitHub Pages deploy instructions"
```

- [ ] **Step 5: Push and enable Pages** (user runs the push; assist with Settings)

```bash
git push -u origin main
```

---

## Self-Review Notes

- **Spec coverage:** browse (Tasks 8–11), discover/50+ via Claude in Chrome (Task 7),
  track + export/import (Tasks 4, 12, 13), data model (Tasks 5–6, schema in Task 1),
  visual direction (Task 9), testing (Tasks 2–4, 6, 14), GitHub Pages (Task 14). All
  spec sections map to tasks.
- **Type consistency:** `makeStore`, `STATUSES`, `serialize`, `deserialize` (tracking)
  and `searchSites`/`filterSites`/`sortSites`/`computeStats`/`slugify`/`parseDeadline`
  (logic) are defined in Tasks 2–4 and used with the same signatures in app.js Tasks 10–13.
  `computeStats` returns `{total,paid,applied,research}` — keys match the stat band render.
- **No placeholders:** every code step contains full code; the research task lists
  concrete sources and a measurable ≥50 gate.
```
