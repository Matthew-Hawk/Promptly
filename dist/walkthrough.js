// All sample copy lives here. This illustration never reads drafts or calls an AI.
export const scenarios = {
 estate: {template:'Write a listing description', fields:[['The property','3 bed, 2 bath, fenced yard, near Oak Elementary'],["Who it’s for",'First-time buyers'],['Tone','Warm, not pushy']],before:'Write a listing for my house.',lines:['Write a listing description for this home.','Facts: 3 bed, 2 bath, fenced yard, near Oak Elementary.','Audience: first-time buyers. Tone: warm, not pushy.','Use only the facts provided. Do not invent features.']},
 it: {template:'Share an incident update',fields:[['What happened','Login errors for 20 minutes'],['Who needs to know','Support team and leadership'],['Tone','Calm, factual']],before:'Write an update about the problem.',lines:['Write an incident update for the support team and leadership.','Facts: login errors for 20 minutes.','Tone: calm, factual.','Use only the facts provided; flag anything unknown.']}
};
const stage = document.querySelector('#walkthrough-stage');
const play = document.querySelector('#walkthrough-play');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 767px)');
const canObserve = Boolean(window.IntersectionObserver);
const starts = [0,5000,12000];
let scenario = 'estate', elapsed = 0, started = 0, frame, observer, visible = false, paused = false, running = false, lastScene = -1;
const escape = value => value.replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const templates = ['Write a listing description','Reply to a buyer inquiry','Summarize notes','Share an incident update'];
function draw() {
 const sample = scenarios[scenario];
 stage.innerHTML = `<div class="walk-scene" data-scene="0"><h3>1. Pick a task</h3><div class="mock-window"><div class="mock-title">Promptly · Templates</div><div class="mock-templates">${templates.map(name=>`<div class="mock-template ${name===sample.template?'chosen-template':''}">${name}</div>`).join('')}</div><p class="mock-hint">A useful template, ready to make yours.</p></div></div>
 <div class="walk-scene" data-scene="1"><h3>2. Fill in the details</h3><div class="walk-split"><div class="mock-window"><div class="mock-title">Promptly · Your details</div>${sample.fields.map(([label],index)=>`<div class="mock-field"><strong>${escape(label)}</strong><div><span data-typed="${index}"></span><span class="typing-caret">|</span></div></div>`).join('')}</div><div class="mock-window mock-preview"><div class="mock-title">Your prompt</div><div class="mock-before">Before: ${escape(sample.before)}</div>${sample.lines.map((line,index)=>`<p data-preview-line="${index}">${escape(line)}</p>`).join('')}<span class="mock-complete">All sections filled ✓</span></div></div></div>
 <div class="walk-scene" data-scene="2"><h3>3. Copy into your AI</h3><div class="walk-split"><div class="mock-window"><div class="mock-title">Promptly · Your prompt</div><p class="mock-copy-text">${escape(sample.lines.join(' '))}</p><div class="mock-copy-button">Copy prompt</div></div><div class="mock-window mock-chat"><div class="mock-title">Your AI (ChatGPT, Claude, Gemini…)</div><p class="mock-hint">A separate AI chat window</p><div class="mock-message">${escape(sample.lines.join(' '))}</div><div class="mock-send">Send</div><div class="mock-skeleton"><span></span><span></span><span></span><span></span></div><div class="mock-review"><span aria-hidden="true">☞ ✓</span> You review it.</div></div></div><div class="flying-prompt">${escape(sample.lines.join(' '))}</div></div>
 <svg class="walk-cursor" viewBox="0 0 1000 600" preserveAspectRatio="none"><g id="demo-cursor"><path d="M0 0 L0 25 L7 18 L13 31 L18 28 L12 16 L23 16 Z"/><circle class="cursor-ripple" cx="6" cy="8" r="23"/></g></svg>`;
 lastScene = -1;
 render(elapsed);
}
function reveal(element,show) {element.classList.toggle('shown',show);}
function render(time) {
 const step = time < 5000 ? 0 : time < 12000 ? 1 : 2;
 const staticView = reduced.matches || !canObserve;
 stage.classList.toggle('static-storyboard',staticView);
 stage.dataset.step = String(step);
 if (lastScene !== step) {
  stage.querySelectorAll('.walk-scene').forEach((scene,index)=>{scene.classList.toggle('current',index===step);});
  document.querySelectorAll('[data-walk-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.walkStep)===step)));
  document.querySelectorAll('[data-walk-caption]').forEach(caption=>caption.classList.toggle('current',Number(caption.dataset.walkCaption)===step));
  lastScene=step;
 }
 const final = staticView;
 const local = time-starts[step];
 stage.querySelectorAll('.mock-template').forEach(card=>{reveal(card,final || (step===0 && local>250));card.classList.toggle('selected',card.classList.contains('chosen-template') && (final || (step===0 && local>2100)));});
 const sample=scenarios[scenario];
 stage.querySelectorAll('[data-typed]').forEach((field,index)=>{
  const progress = final ? 1 : step!==1 ? 0 : Math.max(0,Math.min(1,(local-450-index*1600)/1400));
  const typedText=sample.fields[index][1].slice(0,Math.ceil(sample.fields[index][1].length*progress));
  if (field.textContent!==typedText) field.textContent=typedText;
  field.nextElementSibling.classList.toggle('shown',!final && running && step===1 && progress>0 && progress<1);
 });
 stage.querySelector('.mock-before').style.opacity= final || step!==1 || local>1200 ? '0' : '1';
 stage.querySelectorAll('[data-preview-line]').forEach((line,index)=>reveal(line,final || (step===1 && local>[750,1850,5050,5700][index])));
 reveal(stage.querySelector('.mock-complete'),final || (step===1 && local>6200));
 const copied=final || (step===2 && local>800);
 stage.querySelector('.mock-copy-button').textContent=copied?'✓ Copied!':'Copy prompt';
 stage.querySelector('.mock-copy-button').classList.toggle('copied',copied);
 reveal(stage.querySelector('.mock-message'),final || (step===2 && local>2200));
 const sent=final || (step===2 && local>2900);
 stage.querySelector('.mock-message').classList.toggle('sent',sent);
 stage.querySelector('.mock-send').textContent=sent?'Sent ✓':'Send';
 reveal(stage.querySelector('.mock-send'),final || (step===2 && local>2200));
 reveal(stage.querySelector('.mock-skeleton'),final || (step===2 && local>3300));
 reveal(stage.querySelector('.mock-review'),final || (step===2 && local>4600));
 const flying=stage.querySelector('.flying-prompt');
 reveal(flying,!final && step===2 && local>1100 && local<2300);
 const flightProgress=Math.min(1,Math.max(0,(local-1100)/1200));
 flying.style.transform=`translate(${compact.matches?0:flightProgress*250}px, ${compact.matches?flightProgress*100:-Math.sin(flightProgress*Math.PI)*60}px) scale(${1-flightProgress*.35})`;
 const cursor=stage.querySelector('#demo-cursor');
 const progress=step===0?Math.min(1,local/2100):step===2?Math.min(1,Math.max(0,(local-800)/1800)):0;
 cursor.style.transform=step===0?`translate(${740-progress*(scenario==='estate'?560:110)}px, ${470-progress*(scenario==='estate'?300:150)}px)`:step===2?`translate(${260+progress*450}px, ${460-progress*130}px)`:'translate(210px, 230px)';
 stage.querySelector('.walk-cursor').style.opacity=final?'0':'1';
 stage.querySelector('.cursor-ripple').classList.toggle('shown',!final && ((step===0 && local>2050 && local<2500)||(step===2 && local>750 && local<1150)));
 stage.classList.toggle('walk-running',running && !staticView);
}
function tick(now) {
 render((elapsed+now-started)%18000);
 frame=requestAnimationFrame(tick);
}
function stop() {
 if (running) elapsed=(elapsed+performance.now()-started)%18000;
 running=false;
 cancelAnimationFrame(frame);frame=undefined;
 stage.classList.remove('walk-running');
}
function sync() {
 const shouldRun=location.hash.split('/')[0]==='#about' && visible && !document.hidden && !paused && !reduced.matches && canObserve;
 if (shouldRun && !running) {running=true;started=performance.now();frame=requestAnimationFrame(tick);}
 else if (!shouldRun) stop();
 play.disabled=reduced.matches || !canObserve;
 play.textContent=reduced.matches || !canObserve?'Motion off':paused?'Play':'Pause';
 play.setAttribute('aria-label',reduced.matches || !canObserve?'Autoplay unavailable; static storyboard shown':paused?'Play walkthrough':'Pause walkthrough');
 render(elapsed);
}
function jump(step) {stop();elapsed=starts[step]+(paused || reduced.matches ? [4500,6500,5500][step] : 0);render(elapsed);stage.scrollIntoView({block:'nearest',behavior:reduced.matches?'auto':'smooth'});sync();}
function route() {
 stop();observer?.disconnect();observer=undefined;visible=false;
 if (location.hash.split('/')[0]==='#about' && canObserve) {
  observer=new IntersectionObserver(entries=>{visible=entries[0].intersectionRatio>=.4;sync();},{threshold:[0,.4]});
  observer.observe(stage);
 }
 sync();
}
play.addEventListener('click',()=>{paused=!paused;sync();});
document.querySelector('#walkthrough-replay').addEventListener('click',()=>{paused=false;elapsed=0;jump(0);});
document.querySelectorAll('[data-walk-step]').forEach(button=>button.addEventListener('click',()=>jump(Number(button.dataset.walkStep))));
for (const [key,id] of [['estate','walkthrough-estate'],['it','walkthrough-it']]) document.getElementById(id).addEventListener('click',()=>{
 stop();scenario=key;
 document.querySelector('#walkthrough-estate').setAttribute('aria-pressed',String(key==='estate'));
 document.querySelector('#walkthrough-it').setAttribute('aria-pressed',String(key==='it'));
 draw();sync();
});
window.addEventListener('hashchange',route);
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',sync);
window.addEventListener('pagehide',()=>{stop();observer?.disconnect();});
window.addEventListener('pageshow',route);
draw();route();
