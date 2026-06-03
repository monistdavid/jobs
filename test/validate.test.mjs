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
