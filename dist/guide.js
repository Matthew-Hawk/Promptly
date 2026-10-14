import { fieldLabels, sectionLabels, exampleFor } from './presentation.js';

// These are editable preferences, never invented source material or facts.
export function starterOptions(key,templateId) {
 const custom={study:{subject:['Photosynthesis','Algebra','A historical event'],goal:['Explain it step by step','Quiz me with practice questions','Use an everyday analogy'],audience:['I’m new to this','High school level','University level']},dining:{goal:['A casual meal with friends','A quick lunch on a budget','A special occasion']},creative:{goal:['A short story','A video outline','Ideas for a personal project'],audience:['Just for me','Friends and family','An online audience']},script:{environment:['PowerShell 7 on Windows; advanced','Windows PowerShell 5.1; intermediate','Python 3; beginner']}};
 if(custom[templateId])return custom[templateId][key] ?? [];
 if(templateId==='strategy')return key==='audience'?['First-time home buyers','Homeowners thinking of selling','Local customers']:[];
 if(templateId==='project')return ({subject:['A weekend trip','A school project','A personal goal'],audience:['Just me','My study group','My team']})[key] ?? [];
 const property=['listing','inquiry','openhouse'].includes(templateId);
 return ({
  subject:property ? ['A home I’m listing'] : ['A team update','An upcoming event','A product or service'],
  audience:property ? ['Buyers interested in a viewing','Sellers with questions'] : ['Customers','My team','Leadership'],
  action:property ? ['Arrange a viewing','Reply with questions'] : ['Reply with questions','Review the next steps','Get in touch'],
  destination:['Reply to this email','Contact our team'], limit:['100','150','300'], duration:['15','30','60'],
  tone:['Warm and helpful','Clear and professional','Calm and factual'],
  change:['Make it shorter and clearer','Make the tone friendlier'],preserve:['Keep all facts and dates','Keep the original meaning'],
  channel:['Email','LinkedIn','Our website']
 })[key] ?? [];
}
const featured=[
 ['study','Learn something','Untangle a topic. Make it click.','A tricky class topic','◎'],
 ['dining','Find my next favorite','Explore places that fit your taste.','Dinner near campus','⌖'],
 ['creative','Create something','Give that half-formed idea a start.','A story, video, or side project','✳'],
 ['project','Make a plan','Turn “where do I start?” into next steps.','A trip, project, or personal goal','↗'],
 ['strategy','Grow an idea','Find a direction for your next move.','A real estate marketing strategy','◇'],
 ['script','Solve a technical problem','Build, debug, and understand the code.','An advanced PowerShell script','⌘']
];
const questionCopy={
 study:{subject:['What are you trying to understand?','A topic, a confusing idea, or a question from class.'],goal:['What would help it click?','Choose how you want to learn, or tell us where you get stuck.'],audience:['Where are you starting from?','Set the level so the explanation meets you where you are.']},
 dining:{subject:['Where do you want to eat?','Add a city or neighborhood. An approximate area is enough.'],goal:['What’s the occasion?','A quick lunch, a date, or somewhere new with friends?']},
 creative:{subject:['What’s your spark?','A theme, a character, a topic, or just a rough idea.'],goal:['What would you like to make?','Tell us the format and anything you want to try.']},
 strategy:{subject:['What are you growing?','Describe your business, market, or offering.'],goal:['What would progress look like?','Include your timeframe, resources and budget if you know them.'],facts:['What do you know so far?','Add real market information or past results. Skip if you’re starting fresh; the prompt will ask for research.']},
 script:{goal:['What should the script do?','Describe the result, inputs and limits. Include the bug if you’re troubleshooting.'],source:['What are you working with?','Paste code, errors or sample input. Remove passwords and private data. Skip if starting from scratch.']}
};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createGuide(api) {
 const root=document.querySelector('#guided-builder');
 let stage='discover',index=0,allTasks=false,query='',draftRef,advanced=false,startingCustom=false,feedback='';
 function questions() {
  const draft=api.draft();
  const copy=questionCopy[draft.templateId] ?? {};
  return draft.variables?.length ? draft.variables.map(v=>({key:v.key,label:copy[v.key]?.[0] ?? fieldLabels[v.key] ?? v.label,help:copy[v.key]?.[1] ?? v.help,value:v.value,variable:true})) : draft.blocks.map(b=>({key:b.key,label:sectionLabels[b.type] ?? b.type,help:b.type==='task'?'Tell the AI what you want it to do.':'Keep what helps, and edit anything you want.',value:b.value,variable:false}));
 }
 function setAnswer(question,value) {api.answer(question,value);}
 function focusHeading() {const heading=root.querySelector('#guide-heading');heading?.focus();}
 function move(next,questionIndex=index) {stage=next;index=questionIndex;feedback='';render();focusHeading();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)root.querySelector('.guide-content')?.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});}
 function review() {move('review');}
 function optionsMenu() {return `<details class="guide-menu"><summary>More options</summary><div class="guide-menu-panel"><button id="guide-advanced">Edit the full prompt</button><button data-guide-action="saved">Saved prompts & backups</button><button data-guide-action="details">My details & preferences</button><button data-guide-action="export">Save a text copy (.md)</button><button data-guide-action="undo" ${api.canUndo()?'':'disabled'}>Undo last change</button></div></details>`;}
 function renderHeader() {
  const items=questions();
  return `<div class="guide-top"><span class="guide-step">${stage==='discover'?'1 · Choose your task':stage==='question'?`2 · Detail ${index+1} of ${items.length}`:'3 · Your prompt is ready to review'}</span><div class="guide-tools">${stage!=='discover'?`<details class="guide-menu"><summary>Your answers</summary><div class="guide-menu-panel answer-overview">${items.map((q,i)=>`<button data-guide-question="${i}"><strong>${escape(q.label)}</strong><span>${escape(q.value.trim().slice(0,90)||'Not added yet')}</span></button>`).join('')}</div></details>`:''}${optionsMenu()}</div></div>`;
 }
 function render() {
  if (advanced) return;
  const draft=api.draft(),items=questions();index=Math.max(0,Math.min(index,items.length-1));
  let body,footer;root.classList.remove('guide-writing-own');
  if (stage==='discover') {
   const tasks=allTasks ? Object.entries(api.templates).filter(([,t])=>[t.name,t.description].join(' ').toLowerCase().includes(query.toLowerCase())).map(([key,t])=>[key,t.name,t.description]) : featured;
   body=`<h2 id="guide-heading" tabindex="-1">What’s on your mind?</h2><p class="guide-description">Something to learn, a place to go, an idea to bring to life. Start anywhere. We’ll find the words together.</p>${allTasks?`<label class="guide-search">Find a task<input id="guide-search" type="search" value="${escape(query)}" placeholder="Study, food, PowerShell, real estate…"></label>`:''}<div id="guide-task-list" class="guide-task-list">${tasks.map(([key,label,help,example,icon])=>`<button data-guide-template="${key}" class="${allTasks?'':'guide-intent'}">${icon?`<i class="guide-intent-icon" aria-hidden="true">${icon}</i>`:''}<strong>${escape(label)}</strong><span>${escape(help)}</span>${example?`<small>${escape(example)}</small><b class="guide-card-arrow" aria-hidden="true">↗</b>`:''}</button>`).join('')||'<p>No matching tasks. Try another word.</p>'}</div>`;
   footer=`<button id="guide-all">${allTasks?'Back to inspiration':'Explore all starters'}</button><button id="guide-blank">Use my own idea</button>${draft.blocks.some(b=>b.value.trim())?'<button id="guide-resume" class="primary">Continue my prompt →</button>':''}`;
  } else if (stage==='question' && items.length) {
   const q=items[index],options=q.variable?starterOptions(q.key,draft.templateId):[];
   const choices=`<div class="guide-answer-choices">${options.map(value=>`<button data-guide-value="${escape(value)}">${escape(value)}</button>`).join('')}</div>`;
   const input=`<label for="guide-answer" class="sr-only">${escape(q.label)}</label><textarea id="guide-answer" aria-describedby="guide-help" maxlength="100000" placeholder="${escape(q.variable?exampleFor(q.key,draft.templateId):'Example: write a short, friendly email explaining our next steps.')}">${escape(q.value)}</textarea>`;
   body=`<p class="guide-template-label">${escape(draft.name)}</p><h2 id="guide-heading" tabindex="-1">${escape(q.label)}</h2><p class="guide-description" id="guide-help">${escape(q.help)}</p>${options.length && !q.value.trim()?`<p class="guide-choice-hint">Choose a starter answer to fill this in and continue.</p>${choices}<details class="guide-custom-answer"><summary>Write my own answer instead</summary>${input}</details>`:options.length?`<details class="guide-change-starter"><summary>Use a different starter answer</summary>${choices}</details>${input}`:input}<p class="guide-answer-note">${['facts','source','impact','status','taken'].includes(q.key)?'Use your own information here. We won’t make up facts for you.':'Everything you choose stays editable.'}</p>`;
   footer=`<button id="guide-back">← Back</button><button id="guide-skip">${q.value.trim()?'Keep this answer':'Skip for now'}</button><button id="guide-next" class="primary">${index===items.length-1?'Review my prompt →':'Continue →'}</button>`;
  } else {
   stage='review';
   const notes=api.checks();
   body=`<h2 id="guide-heading" tabindex="-1">Here’s your prompt.</h2><p class="guide-description">Review it, then copy it into the AI you already use. Always check the answer you get.</p><details class="guide-name-options"><summary>Name: ${escape(draft.name)}</summary><label class="guide-name">Name your prompt<input id="guide-name" maxlength="100" value="${escape(draft.name)}"></label></details>${notes.length?`<details class="guide-review-checks"><summary>${notes.length} details you may want to add</summary>${notes.map((n,i)=>`<button data-guide-check="${i}">${escape(n.message)}</button>`).join('')}</details>`:'<p class="guide-ready">Your details are filled in. Give the instructions a final read.</p>'}<pre id="guide-output" tabindex="-1">${escape(api.markdown()||'Add a task or a few details to create your prompt.')}</pre>`;
   footer=`<button id="guide-back">← Back</button><button id="guide-save" ${api.markdown()?'':'disabled'}>Save prompt</button><button id="guide-copy" class="primary" ${api.markdown()?'':'disabled'}>Copy prompt</button>`;
  }
  root.innerHTML=`${renderHeader()}<div class="guide-content">${body}</div><p id="guide-feedback" role="status" aria-live="polite">${escape(feedback)}</p><div class="guide-footer">${footer}</div><p class="guide-local">${escape(document.querySelector('#save-status').textContent)} · No AI calls</p>`;
 }
 function advance() {const items=questions();if(index<items.length-1) move('question',index+1);else review();}
 root.addEventListener('toggle',event=>{if(event.target.classList.contains('guide-custom-answer'))root.classList.toggle('guide-writing-own',event.target.open);},true);
 root.addEventListener('input',event=>{
  if (event.target.id==='guide-answer') setAnswer(questions()[index],event.target.value);
  if (event.target.id==='guide-name') {api.rename(event.target.value);root.querySelector('.guide-name-options > summary').textContent='Name: '+api.draft().name;}
  if (event.target.id==='guide-search') {query=event.target.value;const caret=event.target.selectionStart;render();const search=root.querySelector('#guide-search');search.focus();search.setSelectionRange(caret,caret);}
 });
 root.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button) return;
  if (button.dataset.guideTemplate) {startingCustom=false;api.choose(button.dataset.guideTemplate);return;}
  if (button.dataset.guideValue!==undefined) {setAnswer(questions()[index],button.dataset.guideValue);advance();return;}
  if (button.dataset.guideQuestion!==undefined) {move('question',Number(button.dataset.guideQuestion));return;}
  if (button.dataset.guideCheck!==undefined) {const note=api.checks()[Number(button.dataset.guideCheck)];const i=questions().findIndex(q=>'var-'+q.key===note.target || q.key===note.target);if(i>=0)move('question',i);else {openAdvanced();api.jump(note.target);}return;}
  if (button.dataset.guideAction) {const action=button.dataset.guideAction;if(action==='export')api.export();else if(action==='undo')api.undo();else {openAdvanced();api.advanced(action);}return;}
  switch(button.id) {
   case 'guide-all': allTasks=!allTasks;query='';render();break;
   case 'guide-blank': startingCustom=true;api.blank();break;
   case 'guide-resume': move(questions().length?'question':'review',Math.max(0,questions().findIndex(q=>!q.value.trim())));break;
   case 'guide-next':case 'guide-skip':advance();break;
   case 'guide-back':if(stage==='review')move(questions().length?'question':'discover',questions().length-1);else if(index>0)move('question',index-1);else move('discover');break;
   case 'guide-copy':api.copy();break;
   case 'guide-save':api.save();break;
   case 'guide-advanced':openAdvanced();break;
  }
 });
 function openAdvanced() {advanced=true;document.body.classList.remove('builder-guided');root.hidden=true;api.advanced('editor');}
 function resume() {advanced=false;document.body.classList.add('builder-guided');root.hidden=false;render();focusHeading();}
 document.querySelector('#return-to-guide').onclick=resume;
 function refresh() {
  const draft=api.draft();
  if(draftRef!==draft) {draftRef=draft;feedback='';index=Math.max(0,questions().findIndex(q=>!q.value.trim()));stage=startingCustom || draft.templateId || draft.blocks.some(b=>b.value.trim())?'question':'discover';startingCustom=false;if(stage==='question' && questions().length && questions().every(q=>q.value.trim()))stage='review';render();}
  const status=root.querySelector('.guide-local');if(status)status.textContent=document.querySelector('#save-status').textContent+' · No AI calls';
 }
 document.body.classList.add('builder-guided');refresh();
 return {refresh,resume,review,focusCurrent:focusHeading,announce:message=>{feedback=message;const status=root.querySelector('#guide-feedback');if(status)status.textContent=message;},visible:()=>!advanced,discover:()=>move('discover')};
}
