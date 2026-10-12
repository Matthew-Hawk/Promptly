import { initial, migrate, parseState, clone, id, validateState } from './core.js';

export const STORAGE_KEY = 'promptly-workspace-v1';
export const LEGACY_KEY = 'promptly-draft';

// Every writer uses the same origin-wide Web Lock. Without it, stay in memory.
export class Persistence {
  constructor(storage, locks, changed = () => {}) {
    this.storage = storage;
    this.locks = locks;
    this.changed = changed;
    this.state = initial();
    this.base = null;
    this.status = 'unsaved';
    this.dirty = false;
    this.raw = null;
    this.epoch = 0;
    this.pending = null;
  }
  load() {
    try {
      this.base = this.storage.getItem(STORAGE_KEY);
      if (this.base !== null) {
        this.raw = this.base;
        this.state = parseState(this.base);
        this.status = 'saved';
      } else {
        this.raw = this.storage.getItem(LEGACY_KEY);
        if (this.raw !== null) {
          this.state = migrate(this.raw);
          this.dirty = true;
          this.status = 'unsaved';
        }
      }
      if (!this.locks) this.status = 'unavailable';
    } catch (error) {
      this.status = this.raw !== null ? 'recovery' : 'unavailable';
      this.error = error.message;
    }
    this.changed();
    return this.state;
  }
  edit() {
    this.dirty = true;
    this.epoch++;
    if (!['conflict', 'recovery', 'unavailable'].includes(this.status)) this.status = 'unsaved';
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 400);
    this.changed();
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.pending) { await this.pending; if (this.dirty && this.status === 'unsaved') return this.flush(); return; }
    if (!this.dirty || ['conflict', 'recovery', 'unavailable'].includes(this.status)) return;
    if (!this.locks) { this.status = 'unavailable'; this.changed(); return; }
    this.pending = this.locks.request('promptly-workspace-write', async () => {
      try {
        const current = this.storage.getItem(STORAGE_KEY);
        if (current !== this.base) { this.status = 'conflict'; return; }
        const epoch = this.epoch;
        const next = validateState(clone(this.state));
        next.revision = id();
        const raw = JSON.stringify(next);
        if (raw.length > 10000000) throw new Error('Workspace exceeds 10 MB. Export a backup.');
        this.storage.setItem(STORAGE_KEY, raw);
        this.base = raw;
        this.state.revision = next.revision;
        this.dirty = epoch !== this.epoch;
        this.status = this.dirty ? 'unsaved' : 'saved';
      } catch (error) { this.status = 'unavailable'; this.error = error.message; }
      finally { this.changed(); }
    }).catch(error => { this.status = 'unavailable'; this.error = error.message; this.changed(); });
    try { await this.pending; }
    finally { this.pending = null; }
  }
  externalChange() {
    // Keep the local working copy until the user explicitly chooses a resolution.
    if (this.status !== 'recovery') this.status = 'conflict';
    clearTimeout(this.timer);
    this.changed();
  }
  useLatest() {
    const raw = this.storage.getItem(STORAGE_KEY);
    const next = raw === null ? initial() : parseState(raw);
    this.base = raw;
    this.state = next;
    this.dirty = false;
    this.status = this.locks ? (raw === null ? 'unsaved' : 'saved') : 'unavailable';
    this.changed();
    return next;
  }
  async keepBoth() {
    if (!this.locks) throw new Error('Safe saving is unavailable; download a backup.');
    await this.locks.request('promptly-workspace-write', async () => {
      const raw = this.storage.getItem(STORAGE_KEY);
      const next = raw === null ? initial() : parseState(raw);
      // Preserve the entire local snapshot, including local collection edits.
      const copies = [...this.state.prompts, { ...this.state.draft, archived: false }];
      if (next.prompts.length + copies.length > 500) throw new Error('Collection is full. Download both backups to resolve manually.');
      next.prompts.push(...copies.map(p => ({ ...clone(p), id: id(), name: (p.name + ' (local copy)').slice(0, 100) })));
      next.revision = id();
      const encoded = JSON.stringify(validateState(next));
      if (encoded.length > 10000000) throw new Error('Workspace exceeds 10 MB. Download a backup.');
      this.storage.setItem(STORAGE_KEY, encoded);
      this.base = encoded;
      this.state = next;
      this.dirty = false;
      this.status = 'saved';
    });
    this.changed();
    return this.state;
  }
}
