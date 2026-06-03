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
