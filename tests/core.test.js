import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
globalThis.crypto = webcrypto;
const { initial, block, clone, migrate, validateState, markdown, History, savePrompt, duplicatePrompt, backup, importBackup, guidance } = await import('../dist/core.js');
const { Persistence, STORAGE_KEY, LEGACY_KEY } = await import('../dist/persistence.js');

class Storage {
  values = new Map();
  writes = 0;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes++; this.values.set(key, value); }
}
const locks = { tail: Promise.resolve(), request(name, callback) {
  const result = this.tail.then(callback);
  this.tail = result.catch(() => {});
  return result;
} };
const store = (storage = new Storage(), lock = locks) => {
  const p = new Persistence(storage, lock);
  p.load();
  return p;
};
test('valid legacy content migrates intact without deleting original', async () => {
  const storage = new Storage();
  const raw = JSON.stringify({ name: 'My email', blocks: [{ type: 'task', value: 'Hello\nworld' }, { type: 'role', value: '' }] });
  storage.values.set(LEGACY_KEY, raw);
  const p = store(storage);
  assert.equal(p.state.draft.name, 'My email');
  assert.equal(p.state.draft.blocks[0].value, 'Hello\nworld');
  await p.flush();
  assert.equal(p.status, 'saved');
  assert.equal(storage.getItem(LEGACY_KEY), raw);
  assert.deepEqual(store(storage).state.draft, p.state.draft);
});
test('malformed, null, invalid block and field data never writes on startup or edit', async () => {
  const cases = ['{', 'null', JSON.stringify({ name: 'x', blocks: [null] }), JSON.stringify({ name: 'x', blocks: [{ type: 'wat', value: 'x' }] }), JSON.stringify({ name: false, blocks: [] }), JSON.stringify({ name: 'x', blocks: [{ type: 'task', value: 2 }] })];
  for (const raw of cases) {
    for (const key of [STORAGE_KEY, LEGACY_KEY]) {
      const storage = new Storage();
      storage.values.set(key, raw);
      const p = store(storage);
      assert.equal(p.status, 'recovery');
      p.state.draft.blocks[0].value = 'temporary';
      p.edit();
      await p.flush();
      assert.equal(storage.writes, 0);
      assert.equal(storage.getItem(key), raw);
      assert.equal(p.raw, raw);
    }
  }
});
test('fresh startup does not persist an empty draft', () => {
  const storage = new Storage();
  const p = store(storage);
  assert.equal(storage.writes, 0);
  assert.equal(p.state.draft.blocks[0].type, 'task');
});
test('two concurrent tabs cannot overwrite; keep both preserves collections and drafts', async () => {
  const storage = new Storage();
  const a = store(storage);
  const b = store(storage);
  a.state.draft.blocks[0].value = 'A';
  b.state.draft.blocks[0].value = 'B';
  savePrompt(b.state);
  a.edit(); b.edit();
  await Promise.all([a.flush(), b.flush()]);
  assert.equal(a.status, 'saved');
  assert.equal(b.status, 'conflict');
  assert.equal(store(storage).state.draft.blocks[0].value, 'A');
  await b.keepBoth();
  assert.equal(b.state.draft.blocks[0].value, 'A');
  assert.equal(b.state.prompts.length, 2);
  assert.equal(b.state.prompts[0].blocks[0].value, 'B');
});
test('storage events pause saves and latest is an explicit choice', async () => {
  const storage = new Storage();
  const p = store(storage);
  p.state.draft.blocks[0].value = 'local';
  p.edit();
  p.externalChange();
  await p.flush();
  assert.equal(storage.writes, 0);
  const next = initial(); next.draft.name = 'Remote';
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  p.useLatest();
  assert.equal(p.state.draft.name, 'Remote');
  assert.equal(p.dirty, false);
});
test('quota failure and missing locks retain in-memory work', async () => {
  for (const noLocks of [false, true]) {
    const storage = new Storage();
    storage.setItem = () => { throw new Error('Quota'); };
    const p = store(storage, noLocks ? null : locks);
    p.state.draft.blocks[0].value = 'Keep'; p.edit(); await p.flush();
    assert.equal(p.status, 'unavailable');
    assert.equal(p.dirty, true);
    assert.match(backup(p.state), /Keep/);
  }
});
test('debounce coalesces edits and explicit flush persists latest content', async () => {
  const storage = new Storage(); const p = store(storage);
  for (const value of ['a', 'ab', 'abc']) { p.state.draft.blocks[0].value = value; p.edit(); }
  assert.equal(storage.writes, 0);
  await p.flush();
  assert.equal(storage.writes, 1);
  assert.equal(store(storage).state.draft.blocks[0].value, 'abc');
});
test('lock acquisition failure reports unavailable without dropping work', async () => {
  const p = store(new Storage(), { request: async () => { throw new Error('Lock denied'); } });
  p.state.draft.blocks[0].value = 'Retained'; p.edit(); await Promise.all([p.flush(), p.flush()]);
  assert.equal(p.status, 'unavailable');
  assert.equal(p.dirty, true);
  assert.equal(p.state.draft.blocks[0].value, 'Retained');
});
test('unknown versions, duplicate IDs, oversized and unexpected fields are rejected', () => {
  const state = initial(); savePrompt(state);
  const variants = [
    { ...state, version: 2 }, { ...state, revision: false },
    { ...state, prompts: [state.prompts[0], state.prompts[0]] },
    { ...state, draft: { ...state.draft, name: 'x'.repeat(101) } },
    { ...state, draft: { ...state.draft, blocks: [block('task', 'x'.repeat(100001))] } },
    { ...state, draft: { ...state.draft, blocks: [state.draft.blocks[0], state.draft.blocks[0]] } },
    { ...state, draft: { ...state.draft, blocks: [{ ...state.draft.blocks[0], key: 'invalid key' }] } },
  ];
  for (const invalid of variants) assert.throws(() => validateState(invalid));
  assert.throws(() => migrate('null'));
});
test('undo snapshots restore deletion, clear, and replacement without aliasing', () => {
  const state = initial(); const history = new History();
  state.draft.blocks[0].value = 'Keep this';
  const original = clone(state.draft);
  for (const action of [() => state.draft.blocks.pop(), () => state.draft.blocks = [], () => state.draft = { name: 'Template', blocks: [block('context', 'New')] }]) {
    history.remember(state.draft); action(); state.draft = history.undo();
    assert.deepEqual(state.draft, original);
  }
});
test('save, reopen copies, rename, duplicate, archive and restore preserve content', () => {
  const state = initial(); state.draft.blocks[0].value = 'Original';
  const savedId = savePrompt(state);
  state.draft.blocks[0].value = 'Edited';
  assert.equal(state.prompts[0].blocks[0].value, 'Original');
  state.prompts[0].name = 'Renamed';
  const copyId = duplicatePrompt(state, savedId);
  assert.notEqual(copyId, savedId);
  state.prompts[0].archived = true;
  state.draft = clone(state.prompts[0]);
  state.draft.blocks[0].value = 'Working copy';
  assert.equal(state.prompts[0].blocks[0].value, 'Original');
  state.prompts[0].archived = false;
  assert.equal(validateState(state).prompts[0].name, 'Renamed');
});
test('backup round trip appends all prompts and draft; invalid import is atomic', () => {
  const source = initial(); source.draft.blocks[0].value = 'Text'; savePrompt(source); source.prompts[0].archived = true;
  const target = initial(); const before = clone(target.draft);
  importBackup(target, backup(source));
  assert.deepEqual(target.draft, before);
  assert.equal(target.prompts.length, 2);
  assert.equal(target.prompts[0].archived, true);
  assert.equal(target.prompts[1].blocks[0].value, 'Text');
  const snapshot = clone(target);
  for (const raw of ['null', '{', JSON.stringify({ format: 'promptly-backup', version: 2 }), backup(source).replace('"archived": true', '"archived": null')]) {
    assert.throws(() => importBackup(target, raw)); assert.deepEqual(target, snapshot);
  }
});
test('Markdown keeps order, multiline content and ignores empty fields', () => {
  const prompt = { name: 'My brief', blocks: [block('task', '  Write an email\nUse facts  '), block('role'), block('output', 'Three paragraphs')] };
  assert.equal(markdown(prompt), '# My brief\n\n## Task\n\nWrite an email\nUse facts\n\n## Output format\n\nThree paragraphs\n');
  assert.equal(markdown(initial().draft), '');
  assert.equal(guidance(prompt).length, 0);
  assert.equal(guidance({ ...prompt, blocks: [block('context', '[audience]')] }).length, 2);
});
