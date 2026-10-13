// Progressive enhancement: content stays visible if animation APIs are unavailable.
// Preview text and completeness checks deliberately stay steady while typing.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = '.hero-copy > *, .hero-art, .page > section:not(.hero), .builder-controls, .workshop > section, .collection, .template-card, .prompt-block, .saved-prompt, #variables > label';
const observed = new WeakSet();
const active = new Map();
const viewport = window.IntersectionObserver ? new IntersectionObserver(entries => {
  const entering = entries.filter(entry => entry.isIntersecting);
  entering.forEach((entry,index) => {
    viewport.unobserve(entry.target);
    reveal(entry.target,index);
  });
}, {threshold:0, rootMargin:'0px 0px -20px 0px'}) : {observe() {},unobserve() {}};

function reveal(element,index = 0) {
  if (reduceMotion.matches || document.hidden || element.contains(document.activeElement) || !element.animate) return;
  active.get(element)?.cancel();
  const animation = element.animate([
    {opacity:0, translate:'0 14px'},
    {opacity:1, translate:'0 0'}
  ], {duration:480, delay:Math.min(index,5)*45, easing:'cubic-bezier(.22, 1, .36, 1)', fill:'backwards'});
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
  for (const [element,animation] of active) if (element.contains(event.target)) animation.cancel();
});
window.addEventListener('hashchange',() => {
  requestAnimationFrame(() => {
    document.querySelectorAll('.page:not([hidden])').forEach(page => {
      page.querySelectorAll(targets).forEach(element => viewport.observe(element));
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
}
toggle.addEventListener('click',() => {
  paused = !paused;
  try {localStorage.setItem('promptly-motion',paused ? 'paused' : 'running');} catch { /* Usable in memory. */ }
  motionState();
});
reduceMotion.addEventListener('change',motionState);
document.addEventListener('visibilitychange',motionState);
motionState();
