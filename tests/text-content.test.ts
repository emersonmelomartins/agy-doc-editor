import test from 'node:test';
import assert from 'node:assert/strict';

import { parseTextContent } from '../src/utils/text-content.ts';

test('parseTextContent returns provided valid TipTap document', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ok' }] }],
  });

  const parsed = parseTextContent(content);

  assert.equal(parsed.type, 'doc');
  assert.equal(parsed.content.length, 1);
});

test('parseTextContent falls back when JSON is invalid', () => {
  const parsed = parseTextContent('{invalid-json');

  assert.equal(parsed.type, 'doc');
  assert.equal(parsed.content.length, 1);
  assert.deepEqual(parsed.content[0], { type: 'paragraph', content: [] });
});

test('parseTextContent falls back when content is empty or has invalid shape', () => {
  const emptyParsed = parseTextContent('');
  assert.equal(emptyParsed.type, 'doc');
  assert.equal(emptyParsed.content.length, 1);

  const invalidShapeParsed = parseTextContent(JSON.stringify({ type: 'doc', content: null }));
  assert.equal(invalidShapeParsed.type, 'doc');
  assert.equal(invalidShapeParsed.content.length, 1);
  assert.deepEqual(invalidShapeParsed.content[0], { type: 'paragraph', content: [] });
});
