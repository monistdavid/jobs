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
  renderFilters();
  renderGrid();
}
init();

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

// exported for later tasks
window.__app = { renderGrid, renderStats, state, get SITES(){ return SITES; }, store };
