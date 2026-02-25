import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_DOCUMENTS, getDemoManualContent } from '../src/lib/demo-documents.ts';

test('getDemoManualContent returns a valid tiptap document string', () => {
  const content = getDemoManualContent();
  const parsed = JSON.parse(content);

  assert.equal(parsed.type, 'doc');
  assert.ok(Array.isArray(parsed.content));
  assert.ok(parsed.content.length > 0);
});

test('DEMO_DOCUMENTS default seed list is empty', () => {
  assert.deepEqual(DEMO_DOCUMENTS, []);
});
