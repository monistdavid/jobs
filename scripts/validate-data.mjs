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
    if (!['required','not-required','unknown'].includes(s.coverLetter)) errors.push(`[${i}] bad coverLetter ${s.coverLetter}`);
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
