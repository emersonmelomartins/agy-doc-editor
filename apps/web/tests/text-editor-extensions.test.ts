import test from 'node:test';
import assert from 'node:assert/strict';

import { getTextEditorExtensions } from '../src/lib/text-editor-extensions.ts';

function getExtensionByName(name: string) {
  const ext = getTextEditorExtensions().find((candidate) => candidate.name === name);
  assert.ok(ext, `Extension ${name} should exist`);
  return ext;
}

test('cross-platform history shortcuts map to undo/redo commands', () => {
  const historyExtension = getExtensionByName('cross-platform-history-shortcuts');
  const calls: string[] = [];

  const shortcuts = historyExtension.config.addKeyboardShortcuts.call({
    editor: {
      commands: {
        undo: () => {
          calls.push('undo');
          return true;
        },
        redo: () => {
          calls.push('redo');
          return true;
        },
      },
    },
  });

  assert.equal(shortcuts['Mod-z'](), true);
  assert.equal(shortcuts['Mod-Shift-z'](), true);
  assert.equal(shortcuts['Mod-y'](), true);
  assert.equal(shortcuts['Ctrl-z'](), true);
  assert.equal(shortcuts['Ctrl-Shift-z'](), true);
  assert.equal(shortcuts['Ctrl-y'](), true);
  assert.deepEqual(calls, ['undo', 'redo', 'redo', 'undo', 'redo', 'redo']);
});

test('editable image extension normalizes width, alignment and offset attributes', () => {
  const imageExtension = getExtensionByName('image');

  const options = imageExtension.config.addOptions.call({
    parent: () => ({ sample: true }),
  });
  assert.equal(options.allowBase64, true);

  const attrs = imageExtension.config.addAttributes.call({
    parent: () => ({}),
  });

  const fakeElement = {
    getAttribute: (name: string) => {
      if (name === 'data-width') return '500';
      if (name === 'data-align') return 'right';
      if (name === 'data-offset-x') return '18';
      return null;
    },
  } as unknown as Element;

  assert.equal(attrs.width.parseHTML(fakeElement), 500);
  assert.equal(attrs.align.parseHTML(fakeElement), 'right');
  assert.equal(attrs.offsetX.parseHTML(fakeElement), 18);

  const fallbackElement = {
    getAttribute: (_name: string) => null,
  } as unknown as Element;
  assert.equal(attrs.width.parseHTML(fallbackElement), 420);
  assert.equal(attrs.align.parseHTML(fallbackElement), 'center');
  assert.equal(attrs.offsetX.parseHTML(fallbackElement), 0);

  const invalidOffsetElement = {
    getAttribute: (name: string) => (name === 'data-offset-x' ? 'abc' : null),
  } as unknown as Element;
  assert.equal(attrs.offsetX.parseHTML(invalidOffsetElement), 0);

  const widthWithOffset = attrs.width.renderHTML({ width: 640, offsetX: -12 });
  assert.equal(widthWithOffset['data-width'], '640');
  assert.match(widthWithOffset.style, /transform:translateX\(-12px\);/);

  const fallbackWidth = attrs.width.renderHTML({ width: 0, offsetX: 0 });
  assert.equal(fallbackWidth['data-width'], '420');
  assert.match(fallbackWidth.style, /width:420px/);

  assert.deepEqual(attrs.offsetX.renderHTML({ offsetX: 0 }), {});
  assert.deepEqual(attrs.offsetX.renderHTML({ offsetX: 22 }), { 'data-offset-x': '22' });
  assert.deepEqual(attrs.align.renderHTML({ align: 'left' }), { 'data-align': 'left' });
  assert.deepEqual(attrs.align.renderHTML({ align: undefined }), { 'data-align': 'center' });
});
