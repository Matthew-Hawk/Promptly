// Presentation only: focusing and minimizing never changes saved prompt content.
let questionKey;
const questions = () => [...document.querySelectorAll('#variables > details')];
const stages = () => [...document.querySelectorAll('#focus-flow > details')];
export function focusField(element) {
  if (!element) return;
  let parent = element.closest('details');
  while (parent) {parent.open = true; parent = parent.parentElement.closest('details');}
  element.focus();
}
function chooseQuestion(question,focus = false) {
  if (!question) return;
  questionKey = question.dataset.question;
  questions().forEach(item => {item.open = item === question;});
  updateQuestionControls();
  if (focus) {
    focusField(question.querySelector('textarea'));
    question.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
}
function updateQuestionControls() {
  const items = questions();
  const index = items.findIndex(item => item.open);
  document.querySelector('#question-back').disabled = index <= 0;
  document.querySelector('#question-next').disabled = !items.length;
  document.querySelector('#question-next').textContent = index === items.length-1 ? 'Customize prompt →' : 'Next detail →';
  const filled = items.filter(item => item.querySelector('textarea').value.trim()).length;
  document.querySelector('#question-progress').textContent = items.length ? `${filled} of ${items.length} details filled · you can skip any detail` : 'Start with your task in the instructions below, or choose a template for guided questions.';
  document.querySelector('#details-summary').textContent = items.length ? `${filled} of ${items.length} details filled` : 'Optional facts, preferences and My details';
}
export function refreshFocusFlow() {
  const items = questions();
  chooseQuestion(items.find(item => item.dataset.question === questionKey) ?? items.find(item => !item.querySelector('textarea').value.trim()) ?? items[0]);
  updateQuestionControls();
  document.querySelector('#instructions-summary').textContent = `${document.querySelectorAll('#composition .prompt-block').length} editable sections · keep only what helps`;
}
export function openStage(stageId) {
  const stage = document.getElementById(stageId);
  stages().forEach(item => {item.open = item === stage;});
  stage.querySelector(':scope > summary').focus();
  stage.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
document.querySelector('#focus-flow').addEventListener('toggle',event => {
  const item = event.target;
  if (!item.open) return;
  if (item.classList.contains('focus-stage')) stages().forEach(other => {if (other !== item) other.open = false;});
  if (item.dataset.question) chooseQuestion(item);
  if (item.matches('#composition details')) document.querySelectorAll('#composition details').forEach(other => {if (other !== item) other.open = false;});
  const content = item.querySelector(':scope > .stage-content, :scope > .question-content');
  if (content?.animate && !content.contains(document.activeElement) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) content.animate([{opacity:0,translate:'0 6px'},{opacity:1,translate:'0 0'}],{duration:240,easing:'ease-out'});
},true);
// Minimize peers synchronously, before native toggle events are queued.
document.querySelector('#focus-flow').addEventListener('click',event => {
  const summary = event.target.closest('summary');
  if (!summary) return;
  const item = summary.parentElement;
  if (item.classList.contains('focus-stage')) {
    event.preventDefault();
    const opening = !item.open;
    stages().forEach(other => {other.open = opening && other === item;});
  } else if (item.dataset.question) {
    event.preventDefault();
    chooseQuestion(item);
  } else if (item.matches('#composition details')) {
    event.preventDefault();
    const opening = !item.open;
    document.querySelectorAll('#composition details').forEach(other => {other.open = opening && other === item;});
  }
});
document.querySelector('#focus-flow').addEventListener('focusin',event => {
  const question = event.target.closest('[data-question]');
  if (question && !event.target.matches('summary')) chooseQuestion(question);
});
document.querySelector('#variables').addEventListener('input',event => {
  if (!event.target.matches('textarea')) return;
  const card = event.target.closest('[data-question]');
  card.querySelector('.question-answer').textContent = event.target.value.trim().replace(/\s+/g,' ').slice(0,85) || 'Tap to add your context';
  updateQuestionControls();
});
document.querySelector('#question-back').onclick = () => {
  const items = questions(); chooseQuestion(items[items.findIndex(item => item.open)-1],true);
};
document.querySelector('#question-next').onclick = () => {
  const items = questions(); const index = items.findIndex(item => item.open);
  if (index === items.length-1) openStage('instructions-stage'); else chooseQuestion(items[index+1],true);
};
document.querySelectorAll('[data-stage]').forEach(button => {button.onclick = () => openStage(button.dataset.stage);});

window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event => {
  if (event.matches) document.querySelectorAll('#focus-flow .stage-content, #focus-flow .question-content').forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
});
