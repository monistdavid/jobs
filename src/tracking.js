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
