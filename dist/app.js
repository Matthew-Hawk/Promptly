import { definitions, block, draft, clone, markdown, checks, templates, History, savePrompt, duplicatePrompt, backup, importBackup, instantiate, validateDraft, paletteIsDark, defineVariable, id, includeProfile, updatePrompt, restoreVersion, attachResult } from './core.js';
import { categories, roles } from './library.js';
import { Persistence, STORAGE_KEY } from './persistence.js';
import './motion.js';
import './walkthrough.js';
import { sectionLabels, fieldLabels, exampleFor, checkText } from './presentation.js';
import { focusField, refreshFocusFlow, openStage } from './focus.js';
import { createGuide } from './guide.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const history = new History();
let mode = 'preview';
let state;
let renameId;
let profileId;
let inspectId;
let pendingReplacement;
let pendingExport;
let collectionUndo;
let currentView = 'editor';
let guide;
let storage;
try { storage = localStorage; } catch { storage = { getItem() { throw new Error('Storage denied.'); } }; }
const persistence = new Persistence(storage, navigator.locks, renderStatus);
state = persistence.load();

function notify(message) {
  guide?.announce(message);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $('#toast').classList.remove('show'), 6000);
}
function renderStatus() {
  const labels = {
    saved: 'Saved in this browser', unsaved: persistence.dirty ? 'Unsaved changes' : 'Not saved yet',
    unavailable: 'Storage unavailable · download a backup',
    conflict: 'Another tab changed your saved prompts · resolve below',
    recovery: 'Saved data could not be read · original data preserved',
  };
  $('#save-status').textContent = labels[persistence.status];
  $('#recovery').hidden = persistence.status !== 'recovery';
  $('#conflict').hidden = persistence.status !== 'conflict';
  $('#storage-note').hidden = persistence.status !== 'unavailable';
  guide?.refresh();
}
function changed() {
  persistence.edit();
  updatePreview();
  $('#undo').disabled = !history.items.length && !collectionUndo;
  guide?.refresh();
}
function rememberDraft() { collectionUndo = null; history.remember(state.draft); }
function replaceDraft(next) {
  collectionUndo = null;
  rememberDraft();
  state.draft = clone(next);
  render();
  changed();
  $('#template-browser').open = false;
  openStage(state.draft.variables?.length ? 'brief-details' : 'instructions-stage');
  if(guide?.visible()) guide.focusCurrent(); else $('#prompt-name').focus();
}
function requestReplacement(next) {
  if (state.draft.blocks.some(b => b.value.trim()) || state.draft.profileSnapshots?.length || state.draft.variables?.some(v => v.value.trim())) {
    pendingReplacement = next;
    $('#replace-dialog').showModal();
  } else { setView('editor'); replaceDraft(next); }
}
function renderBlocks() {
  const opened = $('#composition details[open]')?.closest('.prompt-block')?.id;
  $('#composition').innerHTML = state.draft.blocks.map((b,index) => {
    const definition = definitions.find(d => d.id === b.type);
    const d = {...definition,name:sectionLabels[b.type] ?? definition.name};
    return `<article class="prompt-block" id="section-${escape(b.key)}"><details ${opened ? opened === "section-"+b.key ? "open" : "" : index === 0 ? "open" : ""}><summary>${d.name} · ${escape(b.value.replace(/\s+/g,' ').slice(0,70) || 'Empty section')}</summary><div class="block-header"><h3><label for="field-${escape(b.key)}">${d.name}</label></h3><div class="block-tools"><button data-remove="${escape(b.key)}" aria-label="Remove ${d.name}"><span aria-hidden="true">×</span></button></div></div><p id="help-${escape(b.key)}">${d.help}</p>${['notes','original','style'].includes(b.type) ? `<label class="source-usage">Reference supplies<select data-usage="${escape(b.key)}">${['facts','style','both'].map(u => `<option ${u === (b.usage ?? (b.type === 'style' ? 'style' : 'facts')) ? 'selected' : ''}>${u}</option>`).join('')}</select></label>` : ''}<textarea id="field-${escape(b.key)}" data-field="${escape(b.key)}" aria-describedby="help-${escape(b.key)}" maxlength="100000" placeholder="${d.help}">${escape(b.value)}</textarea></details></article>`;
  }).join('') || '<p class="empty">Add a task or choose a template to begin.</p>';
  $('#instructions-summary').textContent = `${state.draft.blocks.length} editable sections · keep only what helps`;
  $('#section-nav').innerHTML = state.draft.blocks.map(b => `<button data-jump="${escape(b.key)}">${(sectionLabels[b.type] ?? definitions.find(d => d.id === b.type).name)}</button>`).join('');
}
function renderCollection() {
  const archived = $('#show-archived').checked;
  const query = $('#collection-search').value.toLowerCase();
  const kind = $('#collection-kind').value;
  $('#prompt-list').innerHTML = state.prompts.filter(p => p.archived === archived && (kind === 'all' || (p.kind ?? 'prompt') === kind) && (!$('#favorites-only').checked || p.favorite) && [p.name,...(p.tags ?? [])].join(' ').toLowerCase().includes(query)).map(p => `<article class="saved-prompt"><strong>${escape(p.name || 'Untitled prompt')}</strong><p>${p.kind === 'template' ? 'Reusable template' : 'Completed prompt'} · ${p.versions?.length ?? 0} saved versions · ${escape((p.tags ?? []).join(', '))}</p><div><button data-inspect="${escape(p.id)}">Preview / versions / results</button><button data-open="${escape(p.id)}">${p.kind === 'template' ? 'Create new prompt' : 'Open'}</button><button data-favorite="${escape(p.id)}" aria-pressed="${!!p.favorite}">${p.favorite ? '<span aria-hidden="true">★</span> Favorite' : '<span aria-hidden="true">☆</span> Favorite'}</button><button data-tags="${escape(p.id)}">Edit tags</button><button data-rename="${escape(p.id)}">Rename</button><button data-duplicate="${escape(p.id)}">Duplicate</button><button data-archive="${escape(p.id)}">${p.archived ? 'Restore' : 'Archive'}</button></div></article>`).join('') || '<p>No prompts match this view. Save your current prompt or change the filters.</p>';
}
function render() {
  $('#prompt-name').value = state.draft.name;
  renderBlocks();
  renderCollection();
  renderGuided();
  renderTemplates();
  $('#template-browser').open = !state.draft.templateId && !state.draft.blocks.some(b => b.value.trim());
  refreshFocusFlow();
  if (!state.draft.variables?.length) { $('#brief-details').open = false; $('#instructions-stage').open = true; $('#finish-stage').open = false; }
  updatePreview();
  $('#undo').disabled = !history.items.length && !collectionUndo;
  guide?.refresh();
}
function updatePreview() {
  const content = markdown(state.draft);
  $('#copy').disabled = !content;
  $('#copy-bottom').disabled = !content;
  $('#download').disabled = !content;
  $('#preview-output').innerHTML = !content ? '<p class="empty">Your prompt appears here as you write.</p>' : mode === 'markdown' ? `<pre>${escape(content)}</pre>` : content.split(/\n\n(?=## )/).map((part,i) => { const lines = part.split('\n'); return `<section><${i ? 'h3' : 'h2'}>${escape(lines.shift().replace(/^#+ /,''))}</${i ? 'h3' : 'h2'}><p>${escape(lines.join('\n').trim())}</p></section>`; }).join('');
  $('#guidance').innerHTML = checks(state.draft).map(c => `<button data-jump="${escape(c.target)}">${escape(checkText(c,state.draft))} →</button>`).join('') || 'No completeness checks outstanding. Review the prompt and eventual AI response.';
  $('#checks-summary').textContent = checks(state.draft).length ? `${checks(state.draft).length} details to review · optional before exporting` : 'Ready to review · no missing details';
  $('#update-prompt').disabled = !state.prompts.some(p => p.id === state.draft.savedId && p.kind !== 'template');
}
function setView(next) {
  currentView = next;
  const split = $('#live-preview').checked && window.matchMedia('(min-width: 1100px)').matches;
  $('.workshop').classList.toggle('split',split);
  $('#canvas').hidden = !split && next !== 'editor';
  $('#preview').hidden = !split && next !== 'preview';
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
function report(error) { notify(error.message?.replace(/\bCollection\b/g,'Saved prompts').replace(/\bworkspace\b/g,'saved prompts').replace(/\bbrief\b/g,'prompt') || 'Action failed. Download a backup to keep your work.'); }

$('#block-library').innerHTML = definitions.map((d, i) => `<button class="library-block" data-add="${d.id}"><strong>${sectionLabels[d.id] ?? d.name}${i > 3 ? ' (optional)' : ''}</strong><span aria-hidden="true">＋</span></button>`).join('');
$('#block-library').onclick = event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  if (state.draft.blocks.length >= 100) { notify('Maximum 100 blocks per prompt.'); return; }
  const next = block(button.dataset.add);
  state.draft.blocks.push(next);
  renderBlocks();
  changed();
  $('#details-drawer').open = false;
  focusField($('#field-' + CSS.escape(next.key)));
};
$('#composition').oninput = event => {
  if (event.target.dataset.usage) return;
  const item = state.draft.blocks.find(b => b.key === event.target.dataset.field);
  if (!item) return;
  item.value = event.target.value;
  event.target.closest('details').querySelector('summary').textContent = (sectionLabels[item.type] ?? definitions.find(d => d.id === item.type).name) + ' · ' + (item.value.replace(/\s+/g,' ').slice(0,70) || 'Empty section');
  changed();
};
$('#composition').onclick = event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  collectionUndo = null;
  rememberDraft();
  const index = state.draft.blocks.findIndex(b => b.key === button.dataset.remove);
  state.draft.blocks.splice(index, 1);
  renderBlocks();
  changed();
  const next = state.draft.blocks[Math.min(index, state.draft.blocks.length - 1)];
  focusField(next ? $('#field-' + CSS.escape(next.key)) : $('#add-details'));
  notify('Block removed. Undo is available.');
};
$('#prompt-name').oninput = event => { state.draft.name = event.target.value; changed(); };
$('#clear').onclick = () => { replaceDraft({ ...draft(), name:state.draft.name, blocks: [] }); notify('Prompt cleared. Undo is available.'); };
$('#new-prompt').onclick = () => { requestReplacement({...draft(),policy:'ask',outside:false}); };
$('#undo').onclick = () => {
  const previous = history.undo();
  if (!previous) return;
  state.draft = previous;
  render();
  changed();
  setView('editor');
  $('#prompt-name').focus();
  notify('Previous prompt restored.');
};
$('#templates').onclick = event => {
  const button = event.target.closest('[data-template]');
  if (!button) return;
  requestReplacement(instantiate(templates[button.dataset.template]));
};
$('#save-prompt').onclick = () => {
  try { savePrompt(state); renderCollection(); changed(); notify('Completed prompt saved as new. Update saves a new version.'); }
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
    if (action === 'open') { requestReplacement(saved.kind === 'template' ? instantiate(saved) : {...validateDraft(saved),savedId:saved.id}); return; }
    if (action === 'inspect') { inspectId = saved.id; renderInspect(); $('#inspect-dialog').showModal(); return; }
    if (action === 'favorite') saved.favorite = !saved.favorite;
    if (action === 'tags') { const tags = window.prompt('Tags, separated by commas', (saved.tags ?? []).join(', ')); if (tags === null) return; const values = tags.split(',').map(t => t.trim()).filter(Boolean); if (values.length > 30 || values.some(t => t.length > 100)) throw new Error('Maximum 30 tags, 100 characters each.'); saved.tags = values; }
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
    if (action === 'archive') { collectionUndo = {id:saved.id,archived:saved.archived}; saved.archived = !saved.archived; }
    renderCollection();
    changed();
    $('#collection-heading').focus();
    notify(action === 'archive' ? 'Archive status changed. Undo is available.' : 'Saved prompts updated.');
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
    renderGuided();
    changed();
    notify('Backup restored as copies in Saved prompts. Your current prompt is preserved.');
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
  try { await persistence.flush(); state = persistence.useLatest(); history.items = []; render(); setView('editor'); $('#prompt-name').focus(); notify('Latest saved prompts loaded.'); }
  catch (error) { report(error); }
};
$('#keep-both').onclick = async () => {
  try { await persistence.flush(); state = await persistence.keepBoth(); history.items = []; render(); notify('Latest saved prompts loaded; this tab’s prompt and saved prompts are preserved as local copies.'); }
  catch (error) { report(error); }
};
$('#view-editor').onclick = () => setView('editor');
$('#view-preview').onclick = () => setView('preview');
$('#rendered-tab').onclick = () => previewMode('preview');
$('#markdown-tab').onclick = () => previewMode('markdown');
$('#copy').onclick = async () => {
  try { await navigator.clipboard.writeText(markdown(state.draft)); notify('Prompt copied. Paste it into the AI you use.'); }
  catch {
    setView('preview');
    previewMode('markdown');
    if (guide?.visible()) guide.review();
    const target = guide?.visible() ? $('#guide-output') : $('#preview-output');
    target.focus();
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    notify('Clipboard unavailable. Your prompt text is selected: use your device’s Copy command.');
  }
};
$('#copy-bottom').onclick = $('#copy').onclick;
$('#download').onclick = () => download(markdown(state.draft), (state.draft.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 80) || 'prompt') + '.md', 'text/markdown;charset=utf-8');

function paletteLabel() {
  const dark = document.body.classList.contains('midnight');
  const label = 'Switch to ' + (dark ? 'light' : 'dark') + ' theme';
  $('#palette').setAttribute('aria-label',label); $('#palette').title = label;
  $('#palette').setAttribute('aria-pressed', dark);
}
try { document.body.classList.toggle('midnight', paletteIsDark(storage.getItem('promptly-palette'))); } catch { document.body.classList.add('midnight'); }
$('#palette').onclick = () => {
  document.body.classList.toggle('midnight');
  try { storage.setItem('promptly-palette', document.body.classList.contains('midnight') ? 'midnight' : 'daylight'); } catch { /* Palette remains usable in memory. */ }
  paletteLabel();
};
function route(focus = false) {
  const [requested, templateKey] = location.hash.slice(1).split('/');
  const page = ['home', 'builder', 'about'].includes(requested) ? requested : 'home';
  if (page === 'builder' && templates[templateKey]) { requestReplacement(instantiate(templates[templateKey])); window.history.replaceState(null,'','#builder'); }
  document.querySelectorAll('.page').forEach(el => { el.hidden = el.id !== page; });
  document.querySelectorAll('[data-page]').forEach(el => {
    if (el.dataset.page === page) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  document.title = page === 'builder' ? 'Make a prompt — Promptly' : page === 'about' ? 'How it works — Promptly' : 'Promptly: build better AI prompts in minutes';
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


function renderTemplates() {
 const category = $('#category-filter').value;
 const role = $('#role-filter').value;
 const query = $('#template-search').value.toLowerCase();
 $('#templates').innerHTML = Object.entries(templates).filter(([,t]) => (!category || t.category === category) && (!role || t.roles.includes(role)) && [t.name,t.description,t.deliverable].join(' ').toLowerCase().includes(query)).map(([key,t]) => `<button class="template-card" data-template="${key}" aria-pressed="${state.draft.templateId === key}"><strong>${escape(t.name)}</strong><span>${escape(t.description)}</span><small>${escape(t.deliverable)}</small></button>`).join('') || '<p>No templates match. Clear a filter or start a blank prompt.</p>';
 $('#selected-template').textContent = state.draft.templateId ? 'Template: '+(templates[state.draft.templateId]?.name ?? state.draft.name)+'. All instructions are editable.' : 'Pick a template, or write your own prompt';
}
function renderGuided() {
 state.draft.policy ??= 'ask'; state.draft.outside ??= false;
 $('#variables').innerHTML = (state.draft.variables ?? []).map(v => `<details class="question-card" data-question="${v.key}"><summary><strong>${escape(fieldLabels[v.key] ?? v.label)}</strong><span class="question-answer">${escape(v.value.trim().replace(/\s+/g,' ').slice(0,85) || 'Tap to add your context')}</span></summary><div class="question-content"><label for="var-${v.key}">${escape(v.help)}</label><textarea id="var-${v.key}" data-variable="${v.key}" maxlength="100000" aria-describedby="var-help-${v.key}" placeholder="${escape(exampleFor(v.key,state.draft.templateId))}">${escape(v.value)}</textarea><small id="var-help-${v.key}">${v.required ? 'Useful for this template. ' : ''}Your answer fills this detail throughout the prompt.</small><button data-drop-variable="${v.key}" type="button" class="quiet">Remove this question</button></div></details>`).join('') || '<p>No guided questions for this prompt. Start with your task in Shape the instructions.</p>';
 refreshFocusFlow();
 $('#missing-policy').value = state.draft.policy ?? 'ask';
 $('#outside-info').checked = state.draft.outside ?? false;
 const selected = $('#profile-select').value;
 $('#profile-select').innerHTML = '<option value="">Choose My details</option>' + (state.profiles ?? []).map(p => `<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('');
 $('#profile-select').value = selected;
 $('#included-profiles').innerHTML = (state.draft.profileSnapshots ?? []).map(p => `<details><summary>${escape(p.name)} · copy in this prompt</summary>${['background','audiences','facts','voice','avoid','example'].map(k => `<label>${escape(({background:'Background',audiences:'Who you write for',facts:'Facts you provide',voice:'How you like to sound',avoid:'Words or claims to avoid',example:'Example writing'})[k])}<textarea data-snapshot="${escape(p.id)}" data-property="${k}" id="profile-${k}-${escape(p.id)}" maxlength="100000">${escape(p[k])}</textarea></label>`).join('')}<button data-remove-profile="${escape(p.id)}">Remove from prompt</button></details>`).join('') || '<p>No saved details added.</p>';
}
$('#category-filter').innerHTML = '<option value="">All tasks</option>'+categories.map(c => `<option>${escape(c)}</option>`).join('');
$('#role-filter').innerHTML = '<option value="">All roles</option>'+roles.map(r => `<option>${escape(r)}</option>`).join('');
for (const selector of ['#category-filter','#role-filter','#template-search']) $(selector).oninput = renderTemplates;
for (const selector of ['#collection-search','#collection-kind','#favorites-only']) $(selector).oninput = renderCollection;
$('#review-preview').onclick = () => {setView('preview'); $('#preview-heading').tabIndex = -1; $('#preview-heading').focus();};
$('#my-prompts').onclick = () => { $('#collection').open = true; $('#collection-heading').focus(); $('#collection').scrollIntoView({block:'start'}); };
$('#live-preview').onchange = () => setView(currentView);
window.addEventListener('resize', () => setView(currentView));
$('#variables').oninput = event => {
 const variable = state.draft.variables?.find(v => v.key === event.target.dataset.variable);
 if (variable) { variable.value = event.target.value; changed(); }
};
$('#variables').onclick = event => {
 const key = event.target.dataset.dropVariable;
 if (!key) return;
 rememberDraft();
 state.draft.variables = state.draft.variables.filter(v => v.key !== key);
 renderGuided(); changed(); focusField($('#add-variable')); notify('Variable removed; remaining tokens are reported by checks. Undo is available.');
};
$('#add-variable').onclick = () => {
 try { defineVariable(state.draft,$('#variable-key').value.trim(),$('#variable-label').value.trim() || $('#variable-key').value.trim()); renderGuided(); changed(); } catch(error) { report(error); }
};
$('#missing-policy').onchange = event => { state.draft.policy = event.target.value; changed(); };
$('#outside-info').onchange = event => { state.draft.outside = event.target.checked; changed(); };
$('#composition').onchange = event => { const b = state.draft.blocks.find(b => b.key === event.target.dataset.usage); if (b) {b.usage = event.target.value; changed();} };
function jump(event) {
 const key = event.target.closest('[data-jump]')?.dataset.jump;
 if (!key) return;
 setView('editor');
 const field = document.getElementById(key.startsWith('var-') || key.startsWith('profile-') || key === 'add-details' ? key : 'field-'+key);
 if (!field) { $('#add-details').focus(); return; }
 let details = field.closest('details'); while (details) {details.open = true; details = details.parentElement.closest('details');}
 field.focus(); field.scrollIntoView({block:'center'});
}
$('#section-nav').onclick = jump;
$('#guidance').onclick = jump;
$('#replace-cancel').onclick = () => { pendingReplacement = null; $('#replace-dialog').close(); };
$('#replace-confirm').onclick = () => { $('#replace-dialog').close(); if (pendingReplacement) {setView('editor'); replaceDraft(pendingReplacement); pendingReplacement = null; notify('Current prompt replaced. Undo restores the previous draft.');} };
$('#replace-dialog').addEventListener('cancel', () => {pendingReplacement = null;});
$('#update-prompt').onclick = () => { try { updatePrompt(state,state.draft.savedId); renderCollection(); changed(); notify('Saved prompt updated. Earlier versions are still available.'); } catch(error) { report(error); } };
$('#save-template').onclick = () => { try { savePrompt(state,'template'); delete state.draft.savedId; renderCollection(); changed(); notify('Reusable template saved. Create new prompt makes a separate copy and clears guided values.'); } catch(error) { report(error); } };
const oldUndo = $('#undo').onclick;
$('#undo').onclick = () => {
 if (collectionUndo) { const saved = state.prompts.find(p => p.id === collectionUndo.id); if (saved) { if (collectionUndo.snapshot) state.prompts[state.prompts.findIndex(p => p.id === saved.id)] = clone(collectionUndo.snapshot); else saved.archived = collectionUndo.archived; } collectionUndo = null; renderCollection(); changed(); notify('Archive change undone.'); } else oldUndo();
};
// Archive actions share the visible Undo control with draft actions.
$('#prompt-list').addEventListener('click', () => { $('#undo').disabled = !history.items.length && !collectionUndo; });
function editProfile(profile) {
 profileId = profile?.id;
 const labels = {name:'Name',background:'Your business, team or project',audiences:'Who you write for',facts:'Facts you provide',voice:'How you like to sound',avoid:'Words or claims to avoid',example:'Example writing (style reference only)'};
 $('#profile-fields').innerHTML = Object.entries(labels).map(([k,label]) => `<label>${label}${k === 'name' ? `<input name="${k}" required maxlength="100" placeholder="Example: My real estate team" value="${escape(profile?.[k] ?? '')}">` : `<textarea name="${k}" maxlength="100000" placeholder="${escape(({background:'Example: we help people buy and sell homes',audiences:'Example: buyers and sellers with questions about viewings',facts:'Example: our office is open Monday through Friday',voice:'Example: warm, clear and specific',avoid:'Example: avoid guarantees or unsupported claims',example:'Example: paste a short piece of writing and explain what to follow'})[k])}">${escape(profile?.[k] ?? '')}</textarea>`}</label>`).join('');
 $('#profile-dialog').showModal(); $('#profile-fields input').focus();
}
$('#new-profile').onclick = () => editProfile();
$('#edit-profile').onclick = () => { const profile = state.profiles?.find(p => p.id === $('#profile-select').value); if (profile) editProfile(profile); else notify('Choose My details first.'); };
$('#profile-cancel').onclick = () => $('#profile-dialog').close();
$('#profile-form').onsubmit = event => {
 event.preventDefault();
 state.profiles ??= [];
 if (!profileId && state.profiles.length >= 50) {notify('You can save up to 50 sets of My details.'); return;}
 const profile = {id:profileId ?? id(),...Object.fromEntries(new FormData(event.target))};
 const index = state.profiles.findIndex(p => p.id === profile.id);
 if (index >= 0) state.profiles[index] = profile; else state.profiles.push(profile);
 $('#profile-dialog').close(); renderGuided(); $('#profile-select').value = profile.id; changed(); notify('My details saved. Existing prompts keep their own copy; refresh when ready.');
};
$('#include-profile').onclick = () => {
 const profile = state.profiles?.find(p => p.id === $('#profile-select').value);
 if (!profile) {notify('Choose My details first.'); return;}
 try {rememberDraft(); includeProfile(state.draft,profile); renderGuided(); changed(); notify('My details added / refreshed. Undo is available.');} catch(error) {report(error);}
};
$('#included-profiles').oninput = event => {
 const profile = state.draft.profileSnapshots?.find(p => p.id === event.target.dataset.snapshot);
 if (profile) { profile[event.target.dataset.property] = event.target.value; changed(); }
};
$('#included-profiles').onclick = event => {
 const key = event.target.dataset.removeProfile; if (!key) return;
 rememberDraft(); state.draft.profileSnapshots = state.draft.profileSnapshots.filter(p => p.id !== key); renderGuided(); changed();
};
function renderInspect() {
 const saved = state.prompts.find(p => p.id === inspectId); if (!saved) return;
 $('#inspect-heading').textContent = saved.name;
 $('#inspect-body').innerHTML = `<pre>${escape(markdown(saved))}</pre><h3>Saved versions</h3>` + (!saved.versions?.length ? '<p>No versions yet. Open and update this prompt to record versions.</p>' : '') + (saved.versions ?? []).map((v,i) => `<details><summary>Version ${i+1} · ${escape(v.date)}</summary><pre>${escape(markdown(v.brief))}</pre><button data-restore-version="${escape(v.id)}">Restore as current and save a new version</button><form data-result-version="${escape(v.id)}"><h3>Manual result notes for version ${i+1}</h3>${[['response','AI response or notes'],['model','AI / model used'],['worked','What worked'],['revision','What needed revision']].map(([k,label]) => `<label>${label}<textarea name="${k}" maxlength="100000">${escape(v.result?.[k] ?? '')}</textarea></label>`).join('')}<button>Save result notes</button></form></details>`).join('');
}
$('#inspect-close').onclick = () => $('#inspect-dialog').close();
$('#inspect-body').onclick = event => {
 const versionId = event.target.dataset.restoreVersion; if (!versionId) return;
 const saved = state.prompts.find(p => p.id === inspectId);
 const version = saved?.versions?.find(v => v.id === versionId); if (!version) return;
 // Do not replace an unrelated current prompt when restoring a collection version.
 try {
  const priorSaved = clone(saved);
  restoreVersion(state,saved.id,versionId);
  collectionUndo = {id:saved.id,snapshot:priorSaved};
  renderInspect(); renderCollection(); changed(); notify('Version restored as a new saved version. Current prompt preserved. Undo is available; open the saved prompt to edit.');
 } catch(error) {report(error);}
};
$('#inspect-body').onsubmit = event => {
 event.preventDefault();
 try { attachResult(state,inspectId,event.target.dataset.resultVersion,Object.fromEntries(new FormData(event.target))); changed(); notify('Result attached to this saved version.'); } catch(error) {report(error);}
};
function intentionalExport(action) {
 if (checks(state.draft).length) { $('#unfinished-confirm').textContent = action === copyAction ? 'Copy anyway' : 'Save anyway'; pendingExport = action; $('#unfinished-dialog').showModal(); } else action();
}
const copyAction = $('#copy').onclick;
const downloadAction = $('#download').onclick;
$('#copy').onclick = () => intentionalExport(copyAction);
$('#copy-bottom').onclick = $('#copy').onclick;
$('#download').onclick = () => intentionalExport(downloadAction);
$('#unfinished-cancel').onclick = () => {pendingExport = null; $('#unfinished-dialog').close();};
$('#unfinished-confirm').onclick = () => {$('#unfinished-dialog').close(); const action = pendingExport; pendingExport = null; action?.();};
$('#unfinished-dialog').addEventListener('cancel', () => {pendingExport = null;});
renderTemplates();
guide = createGuide({
 draft:()=>state.draft, templates,
 checks:()=>checks(state.draft).map(note=>({...note,message:checkText(note,state.draft)})),
 markdown:()=>markdown(state.draft),
 canUndo:()=>history.items.length || collectionUndo,
 choose:key=>requestReplacement(instantiate(templates[key])),
 blank:()=>$('#new-prompt').click(),
 answer:(question,value)=>{
  const field=question.variable ? $('#var-'+CSS.escape(question.key)) : $('#field-'+CSS.escape(question.key));
  if(field) {field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));}
 },
 rename:value=>{$('#prompt-name').value=value;$('#prompt-name').dispatchEvent(new Event('input',{bubbles:true}));},
 copy:()=>$('#copy').click(), export:()=>$('#download').click(), save:()=>$('#save-prompt').click(), undo:()=>$('#undo').click(),
 jump:target=>{const button=[...$('#guidance').querySelectorAll('[data-jump]')].find(b=>b.dataset.jump===target);button?.click();},
 advanced:action=>{
  setView('editor');
  if(action==='saved') $('#my-prompts').click();
  else if(action==='details') {openStage('brief-details');$('#extra-options').open=true;$('#extra-options').querySelectorAll('details').forEach(details=>{details.open=true;});$('#extra-options').scrollIntoView({block:'start'});}
 },
});
