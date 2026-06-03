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

// exported for later tasks
window.__app = { renderGrid, renderStats, state, get SITES(){ return SITES; }, store };
