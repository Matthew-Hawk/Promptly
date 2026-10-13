// UI vocabulary and examples are separate from saved data and export headings.
export const sectionLabels = {
 task:'What you want', context:'What the AI should know', constraints:'Rules & limits', output:'How the answer should look', tone:'Tone & style', examples:'Examples to follow', review:'What a good answer looks like', role:'AI perspective (optional)', notes:'Facts & notes', original:'Text to work from', style:'Writing example'
};
export const fieldLabels = {
 audience:'Who is it for?', subject:'What is this about?', facts:'Facts you provide', action:'What should happen next?', destination:'Where should people go?', limit:'Maximum words', impact:'Who or what is affected?', status:'What is happening now?', taken:'What has been done?', change:'What should change?', preserve:'What should stay?', options:'Options to compare', goal:'Goal and boundaries', source:'Text to work from', channel:'Where will this be shared?', duration:'Meeting length (minutes)', tone:'How should it sound?'
};
const examples = {
 audience:'Example: homeowners asking about selling, or the operations team', subject:'Example: a home listing, a service update, or a team announcement', facts:'Example: the confirmed features, dates, or actions your message can mention', action:'Example: book a viewing, reply with questions, or approve the next step', destination:'Example: reply to this email, call the office, or use your booking link', limit:'Example: 150', impact:'Example: staff cannot access shared files; email is still working', status:'Example: the team is investigating; the cause is not yet confirmed', taken:'Example: support has logged the issue and notified affected staff', change:'Example: shorten the introduction and make the next step clearer', preserve:'Example: keep the facts, dates, and friendly tone', options:'Example: Option A costs less; Option B offers phone support. Compare cost and support.', goal:'Example: move the help desk to a new system without interrupting support', source:'Example: paste the customer message or meeting notes you want to work from', channel:'Example: a LinkedIn post for colleagues', duration:'Example: 30', tone:'Example: warm, clear, and specific; no hype'
};
export function exampleFor(key,templateId) {
 if (['listing','inquiry','openhouse'].includes(templateId)) {
  return ({subject:'Example: a three-bedroom home on Oak Lane',facts:'Example: three bedrooms, two bathrooms, a fenced yard; viewing by appointment',audience:'Example: buyers asking about a property viewing',action:'Example: arrange a viewing or ask a follow-up question',source:'Example: “Is the home still available, and can I view it on Saturday?”',destination:'Example: reply to this email to arrange a viewing'})[key] ?? examples[key] ?? 'Example: add a detail that matters for your task';
 }
 return examples[key] ?? 'Example: add a detail that matters for your task';
}
export function checkText(check,prompt) {
 if (check.target.startsWith('var-')) {
  const key = check.target.slice(4);
  if (check.message.includes('number of words')) return 'Enter a number for Maximum words.';
  const field = prompt.variables?.find(v => v.key === key);
  return 'Add '+(fieldLabels[key] ?? field?.label ?? 'this detail')+'. You can still copy or save an unfinished prompt.';
 }
 return check.message.replace('template variables','reusable details').replace('Unknown variable','Missing reusable detail').replace('define it','add it in More options').replace('legacy bracketed text','bracketed reminders').replace('templates use','templates use');
}
const estate = document.querySelector('#example-estate');
const it = document.querySelector('#example-it');
function chooseExample(choice) {
 const realEstate = choice === 'estate';
 estate.setAttribute('aria-pressed',String(realEstate)); it.setAttribute('aria-pressed',String(!realEstate));
 document.querySelector('#estate-example').hidden = !realEstate;
 document.querySelector('#it-example').hidden = realEstate;
}
estate?.addEventListener('click',() => chooseExample('estate'));
it?.addEventListener('click',() => chooseExample('it'));
