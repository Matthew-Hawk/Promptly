// Pure validation, editing, and serialization. No browser storage or UI access.
export const definitions = [
  ['task', 'Task', 'Describe the job and the desired outcome.'],
  ['context', 'Context', 'Include the audience and verified facts the AI needs.'],
  ['constraints', 'Constraints', 'Set limits, requirements, and things to avoid.'],
  ['output', 'Output format', 'Specify structure, length, and deliverables.'],
  ['tone', 'Tone & style', 'Choose a voice that suits your audience.'],
  ['examples', 'Examples', 'Include a reference or sample if useful.'],
  ['review', 'Success criteria', 'Describe how you will review the result.'],
  ['role', 'Role', 'Optionally specify useful expertise or perspective.'],
].map(([id, name, help]) => ({ id, name, help }));

export const clone = value => JSON.parse(JSON.stringify(value));
// IDs are local identifiers, not security tokens. Keep memory-only editing usable
// on insecure origins where randomUUID and Web Locks may be unavailable.
export const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export const block = (type, value = '') => ({ key: id(), type, value });
export const draft = () => ({ name: 'Untitled prompt', blocks: [block('task')] });
export const initial = () => ({ version: 1, revision: null, draft: draft(), prompts: [] });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function text(value, max) {
  assert(typeof value === 'string' && value.length <= max, 'Invalid text or text too large.');
  return value;
}
export function validateDraft(value) {
  assert(value && typeof value === 'object', 'Missing prompt.');
  assert(Array.isArray(value.blocks) && value.blocks.length <= 100, 'Invalid blocks (maximum 100).');
  const keys = new Set();
  const blocks = value.blocks.map(item => {
    assert(item && definitions.some(d => d.id === item.type), 'Invalid block type.');
    const key = text(item.key, 100);
    assert(/^[a-zA-Z0-9_-]+$/.test(key) && !keys.has(key), 'Invalid or repeated block key.');
    keys.add(key);
    return { key, type: item.type, value: text(item.value, 100000) };
  });
  return { name: text(value.name, 100), blocks };
}
export function validateState(value) {
  assert(value && value.version === 1, 'Unsupported storage version.');
  assert(value.revision === null || (typeof value.revision === 'string' && value.revision.length <= 100), 'Invalid revision.');
  assert(Array.isArray(value.prompts) && value.prompts.length <= 500, 'Invalid collection (maximum 500).');
  const ids = new Set();
  const prompts = value.prompts.map(prompt => {
    assert(prompt && typeof prompt.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(prompt.id) && !ids.has(prompt.id), 'Invalid prompt ID.');
    assert(typeof prompt.archived === 'boolean', 'Invalid archive flag.');
    ids.add(prompt.id);
    return { ...validateDraft(prompt), id: prompt.id, archived: prompt.archived };
  });
  return { version: 1, revision: value.revision, draft: validateDraft(value.draft), prompts };
}
export function parseState(raw) {
  assert(typeof raw === 'string' && raw.length <= 10000000, 'Storage is too large.');
  return validateState(JSON.parse(raw));
}
export function migrate(raw) {
  const old = JSON.parse(raw);
  assert(old && Array.isArray(old.blocks), 'Invalid legacy draft.');
  // Legacy keys were transient; retain content and generate stable IDs.
  const result = initial();
  result.draft = validateDraft({ name: old.name, blocks: old.blocks.map(b => {
    assert(b && typeof b === 'object', 'Invalid legacy block.');
    return { ...b, key: id() };
  }) });
  return result;
}
export function markdown(prompt) {
  const filled = prompt.blocks.filter(b => b.value.trim());
  if (!filled.length) return '';
  return '# ' + (prompt.name.trim() || 'Untitled prompt').replace(/[\r\n]/g, ' ') + '\n\n' + filled.map(b =>
    '## ' + definitions.find(d => d.id === b.type).name + '\n\n' + b.value.trim()
  ).join('\n\n') + '\n';
}
export function guidance(prompt) {
  const notes = [];
  if (!prompt.blocks.some(b => b.type === 'task' && b.value.trim())) notes.push('Add a task so the AI knows what you want it to do.');
  if (prompt.blocks.some(b => /\[[^\]\n]+\]/.test(b.value))) notes.push('Review bracketed text: templates use [placeholders] for facts only you can supply. Brackets in your own content may be intentional.');
  return notes;
}
export function savePrompt(state) {
  assert(state.prompts.length < 500, 'Collection is full. Export a backup first.');
  const prompt = { ...clone(state.draft), id: id(), archived: false };
  state.prompts.push(prompt);
  return prompt.id;
}
export function duplicatePrompt(state, promptId) {
  const original = state.prompts.find(p => p.id === promptId);
  assert(original, 'Prompt not found.');
  assert(state.prompts.length < 500, 'Collection is full.');
  const copy = { ...clone(original), id: id(), name: (original.name + ' (copy)').slice(0, 100), archived: false };
  state.prompts.push(copy);
  return copy.id;
}
export function backup(state) {
  return JSON.stringify({ format: 'promptly-backup', version: 1, data: validateState(state) }, null, 2);
}
export function readBackup(raw) {
  assert(typeof raw === 'string' && raw.length <= 10000000, 'Backup is too large (maximum 10 MB).');
  const value = JSON.parse(raw);
  assert(value && value.format === 'promptly-backup' && value.version === 1, 'Unsupported backup format.');
  return validateState(value.data);
}
export function importBackup(state, raw) {
  const imported = readBackup(raw);
  assert(state.prompts.length + imported.prompts.length + 1 <= 500, 'Import would exceed 500 saved prompts.');
  state.prompts.push(...[...imported.prompts, { ...imported.draft, archived: false }].map(p => ({ ...clone(p), id: id() })));
}
export class History {
  constructor() { this.items = []; }
  remember(value) { this.items.push(clone(value)); if (this.items.length > 20) this.items.shift(); }
  undo() { return this.items.pop(); }
}

export const templates = {
  launch: { name: 'Launch email', blocks: [
    block('task', 'Write a launch email announcing [product or service] to [audience]. Encourage readers to [desired action].'),
    block('context', 'Audience needs: [problem or goal]. Verified offering facts: [benefits, features, availability]. Business: [name and relevant background]. Call-to-action destination: [URL or instructions].'),
    block('constraints', 'Use only the facts provided. Do not invent prices, dates, testimonials, or performance claims. Flag missing facts. Keep the body under [word limit] words.'),
    block('output', 'Return two subject lines, one preview-text line, an email body, and one clear call to action.'),
    block('tone', 'Clear, welcoming, and specific. Avoid hype and pressure.'),
  ] },
  homepage: { name: 'Homepage introduction', blocks: [
    block('task', 'Write a homepage introduction for [business] that helps [audience] understand the offering and take [desired next step].'),
    block('context', 'What we offer: [verified services or products]. Audience needs: [needs]. Relevant differentiators we can support: [facts]. Next-step destination: [URL or instructions].'),
    block('constraints', 'Do not invent credentials, customer results, prices, or guarantees. Avoid jargon and generic claims. Keep the introduction under [word limit] words.'),
    block('output', 'Return three headline options, one introductory paragraph, and a short call-to-action label. Explain any missing information separately.'),
  ] },
  reply: { name: 'Customer reply', blocks: [
    block('task', 'Draft a reply to the customer message below. Aim to [resolve the question, explain a next step, or acknowledge the concern].'),
    block('context', 'Customer message: [paste message, omitting private information you do not need]. Confirmed facts and applicable policy: [facts]. Actions we are authorized to offer: [actions].'),
    block('constraints', 'Do not invent policy, promise a refund, admit liability, or commit to timelines beyond the confirmed facts. If information is missing, list questions for me before the draft. Keep private information out of the reply.'),
    block('output', 'Return a concise customer-ready reply with a greeting, acknowledgment, answer, and clear next step. Put internal questions in a separate section.'),
    block('tone', 'Empathetic, calm, and direct. Avoid blame and canned apologies.'),
  ] },
};
