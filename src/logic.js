// src/logic.js
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const norm = (v) => String(v ?? '').toLowerCase();
const arr  = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);

// Curated, meaningful filter facets. Each tag is matched by keyword against the
// relevant part of a site record, so messy free-text source data still maps to a
// small, consistent, useful set of labels. `scope` chooses which fields to scan:
//   'setting' -> site types + name (what kind of place it is)
//   'focus'   -> name + populations + services + description (who/what it serves)
export const TAG_GROUPS = [
  { group: 'Setting', scope: 'setting', tags: [
    { label: 'Community mental health', re: /community (mental|behavioral)|mental health center/ },
    { label: 'Group practice',          re: /group practice|private practice/ },
    { label: 'Training clinic',         re: /training (clinic|institute)/ },
    { label: 'University',              re: /universit|college/ },
    { label: 'Nonprofit',               re: /non-?profit/ },
    { label: 'Hospital',                re: /hospital|medical center/ },
  ]},
  { group: 'Focus', scope: 'focus', tags: [
    { label: 'Children & youth',   re: /child|youth|adolescent|teen|play therapy/ },
    { label: 'Couples & families', re: /couple|famil|marriage/ },
    { label: 'LGBTQ+',             re: /lgbtq|queer/ },
    { label: 'Trauma',             re: /trauma/ },
    { label: 'Substance use',      re: /substance|addiction|recovery|\bsud\b/ },
    { label: 'Eating disorders',   re: /eating disorder|body image/ },
    { label: 'Bilingual / Spanish',re: /spanish|bilingual|multilingual|latino|immigrant|refugee/ },
  ]},
];

function scopeText(site, scope) {
  if (scope === 'setting') return [site.name, ...arr(site.siteTypes)].map(norm).join(' • ');
  return [site.name, site.description, ...arr(site.populations), ...arr(site.services)].map(norm).join(' • ');
}

// Derive the curated tag labels that apply to a site (across all groups).
export function deriveTags(site) {
  const out = [];
  for (const g of TAG_GROUPS) {
    const hay = scopeText(site, g.scope);
    for (const t of g.tags) if (t.re.test(hay)) out.push(t.label);
  }
  return out;
}

export function searchSites(sites, query) {
  const q = norm(query).trim();
  if (!q) return sites.slice();
  return sites.filter((s) => {
    const hay = [
      s.name, s.description, s.area,
      ...arr(s.populations), ...arr(s.services), ...arr(s.siteTypes), ...arr(s.languages),
    ].map(norm).join(' • ');
    return hay.includes(q);
  });
}

export function filterSites(sites, f = {}) {
  return sites.filter((s) => {
    if (f.source && s.source !== f.source) return false;
    if (f.area && s.area !== f.area) return false;
    if (f.paid === true && s.paid !== true) return false;
    if (f.tag && !arr(s.tags).includes(f.tag)) return false;
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
