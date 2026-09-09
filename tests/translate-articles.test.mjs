import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyTranslation,
  getSourceHash,
  normalizeText,
  parseArticleOrder,
} from '../scripts/translate-articles.mjs';

test('normalizes line endings before hashing a source article', () => {
  assert.equal(getSourceHash('title\r\nbody\r\n'), getSourceHash('title\nbody\n'));
  assert.equal(normalizeText('a\r\nb\r'), 'a\nb\n');
});

test('classifies translation lifecycle states', () => {
  assert.equal(classifyTranslation({ sourceId: 'article-1', sourceHash: 'a', hasTranslation: false }), 'missing');
  assert.equal(classifyTranslation({
    sourceId: 'article-1',
    sourceHash: 'a',
    translationData: { translationOf: 'article-1', sourceHash: 'a' },
    hasTranslation: true,
  }), 'ready');
  assert.equal(classifyTranslation({
    sourceId: 'article-1',
    sourceHash: 'b',
    translationData: { translationOf: 'article-1', sourceHash: 'a' },
    hasTranslation: true,
  }), 'stale');
  assert.equal(classifyTranslation({
    sourceId: 'article-1',
    sourceHash: 'a',
    translationData: { translationOf: 'article-2', sourceHash: 'a' },
    hasTranslation: true,
  }), 'invalid');
});

test('reads the explicit article order without changing dotted IDs', () => {
  const order = parseArticleOrder(`export const articleOrder = [\n  'article-1.1y',\n  'istina',\n] as const;`);
  assert.deepEqual(order, ['article-1.1y', 'istina']);
  assert.deepEqual(parseArticleOrder('"article-2",'), ['article-2']);
});
