import { definitions, block, draft, clone, markdown, guidance, templates, History, savePrompt, duplicatePrompt, backup, importBackup } from './core.js';
import { Persistence, STORAGE_KEY } from './persistence.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const history = new History();
let mode = 'preview';
let state;
let renameId;
let storage;
try { storage = localStorage; } catch { storage = { getItem() { throw new Error('Storage denied.'); } }; }
const persistence = new Persistence(storage, navigator.locks, renderStatus);
state = persistence.load();

function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $('#toast').classList.remove('show'), 6000);
}
function renderStatus() {
  const labels = {
    saved: 'Saved in this browser', unsaved: persistence.dirty ? 'Unsaved changes' : 'Not saved yet',
    unavailable: 'Storage unavailable · download a backup',
    conflict: 'Another tab changed this workspace · resolve below',
    recovery: 'Saved data could not be read · original data preserved',
  };
  $('#save-status').textContent = labels[persistence.status];
  $('#recovery').hidden = persistence.status !== 'recovery';
  $('#conflict').hidden = persistence.status !== 'conflict';
  $('#storage-note').hidden = persistence.status !== 'unavailable';
}
function changed() {
  persistence.edit();
  updatePreview();
  $('#undo').disabled = !history.items.length;
}
function replaceDraft(next) {
  history.remember(state.draft);
  state.draft = clone(next);
  render();
  changed();
  $('#prompt-name').focus();
}
function renderBlocks() {
  $('#composition').innerHTML = state.draft.blocks.map(b => {
    const d = definitions.find(d => d.id === b.type);
    return `<article class="prompt-block"><div class="block-header"><h3><label for="field-${escape(b.key)}">${d.name}</label></h3><div class="block-tools"><button data-remove="${escape(b.key)}" aria-label="Remove ${d.name}">×</button></div></div><p id="help-${escape(b.key)}">${d.help}</p><textarea id="field-${escape(b.key)}" data-field="${escape(b.key)}" aria-describedby="help-${escape(b.key)}" maxlength="100000" placeholder="${d.help}">${escape(b.value)}</textarea></article>`;
  }).join('') || '<p class="empty">Add a task or choose a template to begin.</p>';
}
function renderCollection() {
  const archived = $('#show-archived').checked;
  $('#prompt-list').innerHTML = state.prompts.filter(p => p.archived === archived).map(p => `<article class="saved-prompt"><strong>${escape(p.name || 'Untitled prompt')}</strong><div><button data-open="${escape(p.id)}">Open</button><button data-rename="${escape(p.id)}">Rename</button><button data-duplicate="${escape(p.id)}">Duplicate</button><button data-archive="${escape(p.id)}">${p.archived ? 'Restore' : 'Archive'}</button></div></article>`).join('') || '<p>No prompts in this view. Save a copy of your brief to start a collection.</p>';
}
function render() {
  $('#prompt-name').value = state.draft.name;
  renderBlocks();
  renderCollection();
  updatePreview();
  $('#undo').disabled = !history.items.length;
}
function updatePreview() {
  const content = markdown(state.draft);
  const filled = state.draft.blocks.filter(b => b.value.trim());
  $('#copy').disabled = !content;
  $('#copy-bottom').disabled = !content;
  $('#download').disabled = !content;
  $('#preview-output').innerHTML = !content ? '<p class="empty">Your prompt appears here as you write.</p>' : mode === 'markdown' ? `<pre>${escape(content)}</pre>` : `<h2>${escape(state.draft.name || 'Untitled prompt')}</h2>` + filled.map(b => `<section><h3>${definitions.find(d => d.id === b.type).name}</h3><p>${escape(b.value.trim())}</p></section>`).join('');
  $('#guidance').textContent = guidance(state.draft).join(' ');
}
function setView(next) {
  $('#canvas').hidden = next !== 'editor';
  $('#preview').hidden = next !== 'preview';
  for (const value of ['editor', 'preview']) $('#view-' + value).setAttribute('aria-pressed', value === next);
}
function previewMode(next) {
  mode = next;
  $('#rendered-tab').setAttribute('aria-pressed', mode === 'preview');
  $('#markdown-tab').setAttribute('aria-pressed', mode === 'markdown');
  updatePreview();
}
function download(content, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function report(error) { notify(error.message || 'Action failed. Download a backup to keep your work.'); }

$('#block-library').innerHTML = definitions.map((d, i) => `<button class="library-block" data-add="${d.id}"><strong>${d.name}${i > 3 ? ' (optional)' : ''}</strong><span aria-hidden="true">＋</span></button>`).join('');
$('#block-library').onclick = event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  if (state.draft.blocks.length >= 100) { notify('Maximum 100 blocks per brief.'); return; }
  const next = block(button.dataset.add);
  state.draft.blocks.push(next);
  renderBlocks();
  changed();
  $('#details-drawer').open = false;
  $('#field-' + CSS.escape(next.key)).focus();
};
$('#composition').oninput = event => {
  const item = state.draft.blocks.find(b => b.key === event.target.dataset.field);
  if (!item) return;
  item.value = event.target.value;
  changed();
};
$('#composition').onclick = event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  history.remember(state.draft);
  const index = state.draft.blocks.findIndex(b => b.key === button.dataset.remove);
  state.draft.blocks.splice(index, 1);
  renderBlocks();
  changed();
  const next = state.draft.blocks[Math.min(index, state.draft.blocks.length - 1)];
  (next ? $('#field-' + CSS.escape(next.key)) : $('#add-details')).focus();
  notify('Block removed. Undo is available.');
};
$('#prompt-name').oninput = event => { state.draft.name = event.target.value; changed(); };
$('#clear').onclick = () => { replaceDraft({ ...state.draft, blocks: [] }); notify('Brief cleared. Undo is available.'); };
$('#new-prompt').onclick = () => { setView('editor'); replaceDraft(draft()); notify('New brief started. Undo restores your previous brief.'); };
$('#undo').onclick = () => {
  const previous = history.undo();
  if (!previous) return;
  state.draft = previous;
  render();
  changed();
  setView('editor');
  $('#prompt-name').focus();
  notify('Previous brief restored.');
};
$('#templates').onclick = event => {
  const button = event.target.closest('[data-template]');
  if (!button) return;
  const template = clone(templates[button.dataset.template]);
  template.blocks = template.blocks.map(b => block(b.type, b.value));
  setView('editor');
  replaceDraft(template);
  notify('Template loaded. Replace bracketed placeholders. Undo restores your previous brief.');
};
$('#save-prompt').onclick = () => {
  try { savePrompt(state); renderCollection(); changed(); notify('Copy added to your collection. Further edits stay in your working brief; save another copy when ready.'); }
  catch (error) { report(error); }
};
$('#show-archived').onchange = renderCollection;
$('#prompt-list').onclick = event => {
  const button = event.target.closest('button');
  if (!button) return;
  const [action, promptId] = Object.entries(button.dataset)[0];
  const saved = state.prompts.find(p => p.id === promptId);
  if (!saved) return;
  try {
    if (action === 'open') { setView('editor'); replaceDraft({ name: saved.name, blocks: saved.blocks }); notify('Opened a working copy. Undo restores the previous brief.'); return; }
    if (action === 'rename') {
      renameId = saved.id;
      $('#rename-name').value = saved.name;
      $('#rename-name').setCustomValidity('');
      $('#rename-dialog').showModal();
      $('#rename-name').focus();
      $('#rename-name').select();
      return;
    }
    if (action === 'duplicate') duplicatePrompt(state, promptId);
    if (action === 'archive') saved.archived = !saved.archived;
    renderCollection();
    changed();
    $('#collection-heading').focus();
    notify('Collection updated.');
  } catch (error) { report(error); }
};
$('#rename-form').onsubmit = event => {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') { $('#rename-dialog').close(); return; }
  const name = $('#rename-name').value.trim();
  if (!name) { $('#rename-name').setCustomValidity('Enter a name.'); $('#rename-name').reportValidity(); return; }
  const saved = state.prompts.find(p => p.id === renameId);
  if (saved) { saved.name = name; renderCollection(); changed(); }
  $('#rename-dialog').close();
  $('#collection-heading').focus();
  notify('Saved prompt renamed.');
};
$('#rename-name').oninput = event => event.target.setCustomValidity('');
$('#rename-cancel').onclick = () => $('#rename-dialog').close();
$('#backup').onclick = () => download(backup(state), 'promptly-backup.json');
$('#import-file').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 10000000) throw new Error('Backup is too large (maximum 10 MB).');
    importBackup(state, await file.text());
    renderCollection();
    changed();
    notify('Backup added to the collection, including its working brief. Existing work is preserved.');
  } catch (error) { report(error); }
  event.target.value = '';
};
$('#raw-backup').onclick = () => download(persistence.raw, 'promptly-unreadable-storage.txt', 'text/plain');
$('#use-latest').onclick = () => $('#latest-dialog').showModal();
$('#latest-cancel').onclick = () => $('#latest-dialog').close();
$('#latest-form').onsubmit = async event => {
  event.preventDefault();
  $('#latest-dialog').close();
  if (event.submitter?.value === 'cancel') return;
  try { await persistence.flush(); state = persistence.useLatest(); history.items = []; render(); setView('editor'); $('#prompt-name').focus(); notify('Latest workspace loaded.'); }
  catch (error) { report(error); }
};
$('#keep-both').onclick = async () => {
  try { await persistence.flush(); state = await persistence.keepBoth(); history.items = []; render(); notify('Latest workspace loaded; this tab’s brief and collection are preserved as local copies.'); }
  catch (error) { report(error); }
};
$('#view-editor').onclick = () => setView('editor');
$('#view-preview').onclick = () => setView('preview');
$('#rendered-tab').onclick = () => previewMode('preview');
$('#markdown-tab').onclick = () => previewMode('markdown');
$('#copy').onclick = async () => {
  try { await navigator.clipboard.writeText(markdown(state.draft)); notify('Prompt copied.'); }
  catch {
    setView('preview');
    previewMode('markdown');
    $('#preview-output').focus();
    const range = document.createRange();
    range.selectNodeContents($('#preview-output'));
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    notify('Clipboard unavailable. Markdown is selected: use your device’s Copy command.');
  }
};
$('#copy-bottom').onclick = $('#copy').onclick;
$('#download').onclick = () => download(markdown(state.draft), (state.draft.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 80) || 'prompt') + '.md', 'text/markdown;charset=utf-8');

function paletteLabel() {
  const dark = document.body.classList.contains('midnight');
  $('#palette').setAttribute('aria-label', 'Switch to ' + (dark ? 'daylight' : 'midnight') + ' palette');
  $('#palette').setAttribute('aria-pressed', dark);
}
try { if (storage.getItem('promptly-palette') === 'midnight') document.body.classList.add('midnight'); } catch { /* Optional preference. */ }
$('#palette').onclick = () => {
  document.body.classList.toggle('midnight');
  try { storage.setItem('promptly-palette', document.body.classList.contains('midnight') ? 'midnight' : 'daylight'); } catch { /* Palette remains usable in memory. */ }
  paletteLabel();
};
function route(focus = false) {
  const page = ['home', 'builder', 'about'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  document.querySelectorAll('.page').forEach(el => { el.hidden = el.id !== page; });
  document.querySelectorAll('[data-page]').forEach(el => {
    if (el.dataset.page === page) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  document.title = (page === 'builder' ? 'Edit your brief' : 'Promptly') + ' — Promptly';
  if (focus) { const heading = $('#' + page + ' h1'); heading.tabIndex = -1; heading.focus(); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => route(true));
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) persistence.externalChange();
});
window.addEventListener('pagehide', () => persistence.flush());
document.addEventListener('visibilitychange', () => { if (document.hidden) persistence.flush(); });
window.addEventListener('beforeunload', event => {
  if (persistence.dirty || persistence.status === 'conflict') {
    persistence.flush(); event.preventDefault(); event.returnValue = '';
  }
});
render();
setView('editor');
paletteLabel();
route();
if (persistence.dirty) persistence.flush();
