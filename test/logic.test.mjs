// test/logic.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/logic.js';
import { searchSites, filterSites, sortSites, computeStats, parseDeadline, deriveTags } from '../src/logic.js';

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

const SAMPLE = [
  { id:'a', name:'Alpha Counseling', area:'Denver', paid:true,  populations:['Adults'],
    services:['Individual therapy'], languages:['English'], description:'depth work', deadline:'2026-03-01', source:'spreadsheet' },
  { id:'b', name:'Beta Center',      area:'Aurora', paid:false, populations:['Children'],
    services:['Play therapy'], languages:['Spanish'], description:'bilingual', deadline:'Rolling', source:'research' },
  { id:'c', name:'Gamma Clinic',     area:'Denver', paid:true,  populations:['LGBTQ+'],
    services:['Group therapy'], languages:['English'], description:'', deadline:'', source:'spreadsheet' },
];

test('searchSites matches name, population, service, description (case-insensitive)', () => {
  assert.deepEqual(searchSites(SAMPLE, 'beta').map(s=>s.id), ['b']);
  assert.deepEqual(searchSites(SAMPLE, 'CHILDREN').map(s=>s.id), ['b']);
  assert.deepEqual(searchSites(SAMPLE, 'therapy').map(s=>s.id).sort(), ['a','b','c']);
  assert.deepEqual(searchSites(SAMPLE, 'spanish').map(s=>s.id), ['b']); // matches languages
  assert.deepEqual(searchSites(SAMPLE, '').map(s=>s.id), ['a','b','c']); // empty -> all
});

test('filterSites applies area, paid, population, language filters (AND across categories)', () => {
  assert.deepEqual(filterSites(SAMPLE, { area:'Denver' }).map(s=>s.id), ['a','c']);
  assert.deepEqual(filterSites(SAMPLE, { paid:true }).map(s=>s.id), ['a','c']);
  assert.deepEqual(filterSites(SAMPLE, { population:'Children' }).map(s=>s.id), ['b']);
  assert.deepEqual(filterSites(SAMPLE, { language:'Spanish' }).map(s=>s.id), ['b']);
  assert.deepEqual(filterSites(SAMPLE, { source:'spreadsheet' }).map(s=>s.id), ['a','c']);
  assert.deepEqual(filterSites(SAMPLE, { source:'research' }).map(s=>s.id), ['b']);
  assert.deepEqual(filterSites(SAMPLE, { area:'Denver', paid:true }).map(s=>s.id), ['a','c']);
  assert.deepEqual(filterSites(SAMPLE, {}).map(s=>s.id), ['a','b','c']); // no filters -> all
});

test('deriveTags maps records to curated setting + focus tags', () => {
  const cmhc = deriveTags({ name:'WellPower', siteTypes:['Community mental health center'],
    populations:['Children','Families'], services:[], description:'' });
  assert.ok(cmhc.includes('Community mental health'));
  assert.ok(cmhc.includes('Children & youth'));
  assert.ok(cmhc.includes('Couples & families'));

  const apdc = deriveTags({ name:'Asian Pacific Development Center', siteTypes:['Nonprofit / community'],
    populations:['Immigrants & refugees'], services:[], description:'bilingual multicultural services' });
  assert.ok(apdc.includes('Nonprofit'));
  assert.ok(apdc.includes('Bilingual / Spanish'));

  assert.deepEqual(deriveTags({ name:'x', siteTypes:[], populations:[], services:[], description:'' }), []);
});

test('filterSites filters by derived tag (s.tags)', () => {
  const tagged = SAMPLE.map((s) => ({ ...s, tags: deriveTags(s) }));
  assert.deepEqual(filterSites(tagged, { tag:'Children & youth' }).map(s=>s.id), ['b']); // Play therapy
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
