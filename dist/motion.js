// Progressive enhancement: content stays visible if animation APIs are unavailable.
// Preview text and completeness checks deliberately stay steady while typing.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const homeTargets = 'header .brand, header nav > a, .header-actions > button, #home .hero-copy > :not(.hero-actions), #home .hero-copy .hero-actions > a, #home .hero-art > *, #home > section:not(.hero), #home > footer, #home .starting-points > :not(.hero-actions), #home .starting-points .hero-actions > a, #home .process > .eyebrow, #home .process > div > *, #home .human > .human-symbol, #home .human > div > *, #home .human > a, #home footer > *';
const targets = '[data-home-reveal], .page:not(#home) > section, .builder-controls, .workshop > section, .collection, .template-card, .prompt-block, .saved-prompt, #variables > .question-card';
const homeElements = [...document.querySelectorAll(homeTargets)];
homeElements.forEach(element => element.setAttribute('data-home-reveal',''));
const observed = new WeakSet();
const active = new Map();
const viewport = window.IntersectionObserver ? new IntersectionObserver(entries => {
  // Use visual position rather than observer delivery order for the cascade.
  const entering = entries.filter(entry => entry.isIntersecting).sort((a,b) =>
    a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
  entering.forEach((entry,index) => {
    viewport.unobserve(entry.target);
    reveal(entry.target,index);
  });
}, {threshold:0, rootMargin:'0px 0px -20px 0px'}) : {observe() {},unobserve() {}};

function reveal(element,index = 0) {
  element.classList.remove('home-reveal-pending');
  if (reduceMotion.matches || document.hidden || element.contains(document.activeElement) || !element.animate) return;
  active.get(element)?.cancel();
  const animation = element.animate([
    {opacity:0, translate:'0 14px'},
    {opacity:1, translate:'0 0'}
  ], {duration:element.hasAttribute('data-home-reveal') ? 650 : 480, delay:element.hasAttribute('data-home-reveal') ? index*55 : Math.min(index,5)*45, easing:'cubic-bezier(.22, 1, .36, 1)', fill:'backwards'});
  active.set(element,animation);
  animation.finished.catch(() => {}).finally(() => {if (active.get(element) === animation) active.delete(element);});
}

function scan(root) {
  if (!(root instanceof Element || root instanceof Document)) return;
  const elements = [...root.querySelectorAll(targets)];
  if (root instanceof Element && root.matches(targets)) elements.unshift(root);
  for (const element of elements) {
    if (observed.has(element)) continue;
    observed.add(element);
    prepareHomeElement(element);
    viewport.observe(element);
  }
}

scan(document);
const mutations = new MutationObserver(records => {
  for (const record of records) {
    record.addedNodes.forEach(scan);
    for (const node of record.removedNodes) {
      if (!(node instanceof Element)) continue;
      for (const element of [node,...node.querySelectorAll(targets)]) {
        viewport.unobserve(element);
        active.get(element)?.cancel();
      }
    }
  }
});
mutations.observe(document.body,{childList:true,subtree:true});

// Keyboard focus is never delayed by an entrance effect.
document.addEventListener('focusin',event => {
  homeElements.filter(element => element.contains(event.target)).forEach(element => {
    element.classList.remove('home-reveal-pending');
    viewport.unobserve(element);
  });
  for (const [element,animation] of active) if (element.contains(event.target)) animation.cancel();
});
window.addEventListener('hashchange',() => {
  requestAnimationFrame(() => {
    document.querySelectorAll('.page:not([hidden])').forEach(page => {
      page.querySelectorAll(targets).forEach(element => viewport.observe(element));
      if (page.id === 'home') homeElements.forEach(element => {
        prepareHomeElement(element);
        viewport.observe(element);
      });
    });
  });
});

const toggle = document.querySelector('#ambient-toggle');
let paused = false;
try { paused = localStorage.getItem('promptly-motion') === 'paused'; } catch { /* Optional preference. */ }
function motionState() {
  document.body.classList.toggle('ambient-paused',paused || document.hidden || reduceMotion.matches);
  toggle.disabled = reduceMotion.matches;
  toggle.setAttribute('aria-pressed',String(paused || reduceMotion.matches));
  const label = reduceMotion.matches ? 'Motion disabled by your reduced-motion preference' : paused ? 'Resume ambient motion' : 'Pause ambient motion';
  toggle.setAttribute('aria-label',label);
  toggle.title = label;
  if (reduceMotion.matches || document.hidden) for (const animation of active.values()) animation.cancel();
  if (reduceMotion.matches) homeElements.forEach(element => {
    element.classList.remove('home-reveal-pending');
    viewport.unobserve(element);
  });
}

function prepareHomeElement(element) {
  if (element.hasAttribute('data-home-reveal') && window.IntersectionObserver && element.animate && !reduceMotion.matches && !element.contains(document.activeElement)) element.classList.add('home-reveal-pending');
}
toggle.addEventListener('click',() => {
  paused = !paused;
  try {localStorage.setItem('promptly-motion',paused ? 'paused' : 'running');} catch { /* Usable in memory. */ }
  motionState();
});
reduceMotion.addEventListener('change',motionState);
document.addEventListener('visibilitychange',motionState);
motionState();
