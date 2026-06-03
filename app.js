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
