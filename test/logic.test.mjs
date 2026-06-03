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
