// UI vocabulary and examples are separate from saved data and export headings.
export const sectionLabels = {
 task:'What you want', context:'What the AI should know', constraints:'Rules & limits', output:'How the answer should look', tone:'Tone & style', examples:'Examples to follow', review:'What a good answer looks like', role:'AI perspective (optional)', notes:'Facts & notes', original:'Text to work from', style:'Writing example'
};
export const fieldLabels = {
 audience:'Who is it for?', subject:'What is this about?', facts:'Facts you provide', action:'What should happen next?', destination:'Where should people go?', limit:'Maximum words', impact:'Who or what is affected?', status:'What is happening now?', taken:'What has been done?', change:'What should change?', preserve:'What should stay?', options:'Options to compare', goal:'Goal and boundaries', source:'Text to work from', channel:'Where will this be shared?', duration:'Meeting length (minutes)', tone:'How should it sound?'
};
const examples = {
 audience:'Example: me as a beginner, my classmates, or potential customers', subject:'Example: a class topic, weekend plans, a home listing, or a coding problem', facts:'Example: the confirmed features, dates, or actions your message can mention', action:'Example: book a viewing, reply with questions, or approve the next step', destination:'Example: reply to this email, call the office, or use your booking link', limit:'Example: 150', impact:'Example: staff cannot access shared files; email is still working', status:'Example: the team is investigating; the cause is not yet confirmed', taken:'Example: support has logged the issue and notified affected staff', change:'Example: shorten the introduction and make the next step clearer', preserve:'Example: keep the facts, dates, and friendly tone', options:'Example: Option A costs less; Option B offers phone support. Compare cost and support.', goal:'Example: move the help desk to a new system without interrupting support', source:'Example: paste the customer message or meeting notes you want to work from', channel:'Example: a LinkedIn post for colleagues', duration:'Example: 30', tone:'Example: warm, clear, and specific; no hype'
};
export function exampleFor(key,templateId) {
 const starters={study:{subject:'Example: why seasons change, or quadratic equations',goal:'Example: explain it visually, then give me a practice question',audience:'Example: a high school student learning this for the first time'},dining:{subject:'Example: near campus in Austin',preferences:'Example: vegetarian options, under $20 per person, relaxed atmosphere',goal:'Example: dinner with two friends on Friday'},creative:{subject:'Example: a mystery set in a town where nobody can lie',goal:'Example: a short story outline with an unexpected ending'},strategy:{subject:'Example: my real estate practice serving first-time buyers',goal:'Example: build local awareness over three months with a $500 budget'},script:{goal:'Example: audit inactive accounts and export a CSV without changing accounts',environment:'Example: PowerShell 7.4, Windows 11, Microsoft Graph; advanced user',source:'Example: paste a redacted script and the exact error, or leave blank for a new script'}};
 if(starters[templateId]?.[key])return starters[templateId][key];
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
const exampleChoices=['school','life','estate','it'];
function chooseExample(choice) {
 for(const key of exampleChoices) {
  document.querySelector('#example-'+key)?.setAttribute('aria-pressed',String(key===choice));
  const panel=document.querySelector('#'+key+'-example');if(panel)panel.hidden=key!==choice;
 }
}
for(const key of exampleChoices)document.querySelector('#example-'+key)?.addEventListener('click',()=>chooseExample(key));
