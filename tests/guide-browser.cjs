const assert=require('node:assert/strict');
module.exports=async function checkGuide(browser) {
 const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try {
  await page.goto('http://127.0.0.1:5175/fixture.html#builder');
  assert(await page.locator('#guided-builder').isVisible());
  assert.equal(await page.locator('#guide-task-list > button').count(),6);
  assert(!await page.locator('#canvas').isVisible());
  await page.locator('#guide-all').click();await page.locator('#guide-search').fill('incident');
  assert.equal(await page.locator('[data-guide-template]').count(),1);
  await page.locator('#guide-all').click();
  if(process.env.SCREENSHOT_DIR)await page.locator('#builder').screenshot({path:process.env.SCREENSHOT_DIR+'/guide-discovery.png'});
  await page.locator('#guide-all').click();await page.locator('#guide-search').fill('Email or announcement');
  await page.locator('[data-guide-template=email]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#guide-heading').innerText(),'Who is it for?');
  await page.setViewportSize({width:360,height:844});
  let footer=await page.locator('.guide-footer').boundingBox();assert(footer.y+footer.height<=844,'Discovery choice question requires scrolling');
  await page.locator('.guide-custom-answer > summary').click();
  await page.waitForFunction(()=>document.querySelector('#guided-builder').classList.contains('guide-writing-own'));
  assert(await page.locator('#guide-answer').isVisible());
  assert(!await page.locator('.guide-content > .guide-answer-choices').isVisible());
  await page.locator('.guide-custom-answer > summary').click();
  await page.locator('[data-guide-value="My team"]').click();
  assert.equal(await page.locator('#var-audience').inputValue(),'My team');
  assert.equal(await page.locator('#guide-heading').innerText(),'What is this about?');
  footer=await page.locator('.guide-footer').boundingBox();assert(footer.y+footer.height<=844,'Subject starter choices require scrolling');
  await page.locator('[data-guide-value="A team update"]').click();
  assert.equal(await page.locator('#var-subject').inputValue(),'A team update');
  assert.equal(await page.locator('#guide-heading').innerText(),'Facts you provide');
  assert.equal(await page.locator('[data-guide-value]').count(),0,'Facts offered invented starter answers');
  for(const width of [360,768,1280]) {
   await page.setViewportSize({width,height:width===360?844:900});
   await page.evaluate(()=>window.scrollTo(0,0));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Guided layout overflow at '+width);
   const footer=await page.locator('.guide-footer').boundingBox();
   assert(footer.y+footer.height<=await page.evaluate(()=>innerHeight),'Continue requires page scrolling at '+width);
   if(width===360 && process.env.SCREENSHOT_DIR)await page.locator('#builder').screenshot({path:process.env.SCREENSHOT_DIR+'/guide-mobile.png'});
  }
  if(process.env.SCREENSHOT_DIR)await page.locator('#builder').screenshot({path:process.env.SCREENSHOT_DIR+'/guide-question.png'});
  await page.locator('#guide-answer').fill('The update is ready. <img src=x onerror="window.compromised=true">');
  await page.locator('#guide-next').click();
  await page.locator('[data-guide-value="Review the next steps"]').click();
  await page.locator('[data-guide-value="150"]').click();
  assert(await page.locator('#guide-output').isVisible());
  await page.setViewportSize({width:360,height:844});await page.evaluate(()=>scrollTo(0,0));
  footer=await page.locator('.guide-footer').boundingBox();assert(footer.y+footer.height<=844,'Review and copy require page scrolling');
  await page.setViewportSize({width:1280,height:900});
  assert((await page.locator('#guide-output').innerText()).includes('My team'));
  assert.equal(await page.locator('#guided-builder img').count(),0);
  assert(!await page.evaluate(()=>window.compromised));
  await page.locator('#guide-back').click();assert.equal(await page.locator('#guide-answer').inputValue(),'150');
  await page.locator('#guided-builder summary').filter({hasText:'Your answers'}).click();
  await page.locator('[data-guide-question="0"]').click();
  assert.equal(await page.locator('#guide-answer').inputValue(),'My team');
  await page.locator('#guide-answer').fill('Operations team');
  await page.locator('#guide-next').click();assert.equal(await page.locator('#guide-answer').inputValue(),'A team update');
  await page.locator('#guided-builder summary').filter({hasText:'Your answers'}).click();
  await page.locator('[data-guide-question="4"]').click();await page.locator('#guide-next').click();
  await page.locator('#guide-copy').click();
  await page.waitForFunction(()=>document.querySelector('#guide-feedback').textContent.includes('Prompt copied'));
  assert((await page.evaluate(()=>navigator.clipboard.readText())).includes('Operations team'));
  await page.locator('#guide-save').click();
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved in this browser');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('promptly-workspace-v1')));
  assert.equal(saved.prompts.length,1);assert.equal(saved.prompts[0].versions.length,1);
  if(process.env.SCREENSHOT_DIR)await page.locator('#builder').screenshot({path:process.env.SCREENSHOT_DIR+'/guide-review.png'});
  await page.reload();assert(await page.locator('#guide-output').isVisible());
  await page.locator('#guided-builder summary').filter({hasText:'More options'}).click();await page.locator('#guide-advanced').click();
  assert(await page.locator('#canvas').isVisible());
  await page.locator('#return-to-guide').click();assert(await page.locator('#guide-output').isVisible());
  await page.locator('#guide-back').click();
  for(let i=0;i<5;i++)await page.locator('#guide-back').click();
  await page.locator('#guide-all').click();await page.locator('#guide-search').fill('Customer reply');
  await page.locator('[data-guide-template=reply]').click();assert(await page.locator('#replace-dialog').isVisible());
  await page.locator('#replace-cancel').click();assert(await page.locator('#guide-resume').isVisible());
  await page.locator('[data-guide-template=reply]').click();await page.locator('#replace-confirm').click();
  await page.locator('#guided-builder summary').filter({hasText:'More options'}).click();await page.locator('[data-guide-action=undo]').click();
  assert((await page.locator('#guide-output').innerText()).includes('Operations team'));
  assert.deepEqual(errors,[]);
  console.log('PASS: Guided task discovery, click-fill-advance starters, facts guard, centralized mobile controls, back/overview edits, copy/save/reload, replacement guard, Undo and full-editor return');
 } finally {await context.close();}
 const broad=await browser.newContext({viewport:{width:360,height:844},reducedMotion:'reduce'});const discover=await broad.newPage();
 try {
  for(const key of ['study','dining','creative','project','strategy','script']) {
   await discover.goto('http://127.0.0.1:5175/fixture.html#builder');
   await discover.evaluate(()=>localStorage.clear());await discover.reload();await discover.evaluate(()=>scrollTo(0,0));
   if(['project','strategy','script'].includes(key)){await discover.locator('#guide-all').click();await discover.locator('#guide-search').fill(({project:'Project plan',strategy:'Build a market strategy',script:'Build or debug a script'})[key]);}
   assert(await discover.locator('[data-guide-template='+key+']').isVisible());
   assert(await discover.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const footer=await discover.locator('.guide-footer').boundingBox();assert(footer.y+footer.height<=844,'Discovery requires scrolling at phone width');
   if(process.env.SCREENSHOT_DIR && key==='study')await discover.screenshot({path:process.env.SCREENSHOT_DIR+'/broad-discovery-mobile.png'});
   await discover.locator('[data-guide-template='+key+']').click();
   if(key==='dining')assert.equal(await discover.locator('[data-guide-value]').count(),0,'Location must not be replaced by a generic business suggestion');
   for(let i=0;i<6 && !await discover.locator('#guide-output').count();i++) {
    const choices=discover.locator('[data-guide-value]');
    if(await choices.count()){const multi=await choices.first().getAttribute('aria-pressed')!==null;await choices.first().click();if(multi)await discover.locator('#guide-next').click();}
    else {await discover.locator('#guide-answer').fill(key==='script'?'Audit accounts and export a CSV; do not change accounts.':'My supplied detail');await discover.locator('#guide-next').click();}
   }
   assert(await discover.locator('#guide-output').isVisible(),key+' did not reach review');
   const text=await discover.locator('#guide-output').innerText();
   if(key!=='project')assert(text.includes('Outside information is allowed'),key+' cannot use general knowledge or research');
   if(key==='study')assert(text.includes('Wait for my attempt'));
   if(key==='dining')assert(text.includes('do not fabricate restaurants'));
   if(key==='script')assert(text.includes('dry-run'));
   await discover.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved in this browser');
  }
  console.log('PASS: Learning, everyday discovery, creative, planning, strategy and code pathways; phone discovery bounds and appropriate knowledge policies');
 } finally {await broad.close();}
 const clicks=await browser.newContext({viewport:{width:360,height:844},permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
 const c=await clicks.newPage();const clickErrors=[];c.on('pageerror',e=>clickErrors.push(e.message));
 async function fresh(){await c.goto('http://127.0.0.1:5175/fixture.html#builder');await c.evaluate(()=>localStorage.clear());await c.reload();await c.evaluate(()=>scrollTo(0,0));}
 async function choice(value){await c.locator('[data-guide-value]').filter({hasText:value}).click();}
 async function fits(label){await c.evaluate(()=>scrollTo(0,0));assert(await c.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflows');const b=await c.locator('.guide-footer').boundingBox();assert(b.y+b.height<=844,label+' navigation requires scrolling');}
 try {
  await fresh();await fits('Everyday discovery');
  await c.locator('[data-guide-path=shopping]').click();await fits('Shopping choice');
  await c.locator('#guide-discover').click();assert(await c.locator('[data-guide-path=writing]').isVisible());
  await c.locator('[data-guide-path=shopping]').click();await c.locator('[data-guide-template=shop]').click();
  await fits('Product question');await choice('Car seats');
  await fits('Budget question');await choice('Under US$250');await fits('Priorities question');
  await choice('Compatibility and fit');await choice('Durability');
  assert.equal(await c.locator('#var-priorities').inputValue(),'Compatibility and fit\nDurability');
  await choice('Durability');assert.equal(await c.locator('#var-priorities').inputValue(),'Compatibility and fit');
  assert((await c.locator('.guide-blueprint summary').innerText()).includes('Compatibility and fit'));
  await c.locator('.guide-blueprint > summary').click();assert((await c.locator('.guide-blueprint pre').innerText()).includes('US$250'));await c.locator('.guide-blueprint > summary').click();
  if(process.env.SCREENSHOT_DIR)await c.screenshot({path:process.env.SCREENSHOT_DIR+'/click-priorities-mobile.png'});
  await c.locator('#guide-next').click();await fits('Store question');await choice('Amazon');
  await fits('Shopping review');const request=await c.locator('#guide-output').innerText();assert(request.startsWith('Help me find Car seats.'));assert(request.includes('recall information'));assert(!request.includes('## '));
  await c.locator('#guide-copy').click();await c.waitForFunction(()=>document.querySelector('#guide-feedback').textContent.includes('Prompt copied'));
  assert.equal((await c.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n').trim(),request.trim());
  await c.locator('#guide-save').click();await c.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved in this browser');await c.reload();assert((await c.locator('#guide-output').innerText()).includes('Compatibility and fit'));
  await c.locator('#guide-back').click();await c.locator('#guide-back').click();assert.equal(await c.locator('[data-guide-value="Compatibility and fit"]').getAttribute('aria-pressed'),'true');
  await c.locator('.guide-custom-answer > summary').click();await c.locator('#guide-answer').fill('Must fit my compact car; help me check the manufacturer guidance.');await c.locator('#guide-next').click();await c.locator('#guide-next').click();assert((await c.locator('#guide-output').innerText()).includes('Must fit my compact car'));
  await fresh();await c.locator('[data-guide-path=writing]').click();await c.locator('[data-guide-template=write]').click();
  for(const value of ['A text message','Say thank you','Warm and thoughtful']){await fits('Writing choice');await choice(value);}
  assert((await c.locator('#guide-output').innerText()).includes('Ask me for the recipient'));await fits('Writing review');
  await fresh();await c.locator('[data-guide-path=writing]').click();await c.locator('[data-guide-template=polish]').click();
  await c.locator('#guide-answer').fill('Hi! Can we meet at 3? <img src=x onerror="window.compromised=true">');await c.locator('#guide-next').click();await choice('Make it clearer');await choice('Keep my voice');
  assert((await c.locator('#guide-output').innerText()).includes('> Hi! Can we meet at 3?'));assert.equal(await c.locator('#guided-builder img').count(),0);assert(!await c.evaluate(()=>window.compromised));
  await fresh();await c.locator('[data-guide-path=shopping]').click();await c.locator('[data-guide-template=productcompare]').click();await c.locator('#guide-answer').fill('Model A: supplied specs. Model B: supplied specs.');await c.locator('#guide-next').click();await choice('Price');await c.locator('#guide-next').click();await choice('A side-by-side table');assert((await c.locator('#guide-output').innerText()).includes('Model A'));
  await fresh();await c.locator('[data-guide-template=lifeplan]').click();await choice('Meals for the week');await choice('One week');await choice('Keep costs down');await c.locator('#guide-next').click();assert((await c.locator('#guide-output').innerText()).includes('Meals for the week'));
  assert.deepEqual(clickErrors,[]);
  console.log('PASS: Zero-typing shopping, writing and life planning; paste-once rewriting/comparison; multi-select, custom answers, live blueprint, exact plain-text copy, reload and phone controls');
 } finally {await clicks.close();}
 const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await fallback.newPage();
 try {
  await p.goto('http://127.0.0.1:5175/fixture.html?clipboard-failure#builder');
  await p.locator('#guide-blank').click();
  await p.locator('#guide-answer').fill('Write a friendly thank-you note using my supplied details.');
  await p.locator('#guide-next').click();await p.locator('#guide-copy').click();
  await p.waitForFunction(()=>document.querySelector('#guide-feedback').textContent.includes('Clipboard unavailable'));
  assert((await p.evaluate(()=>getSelection().toString())).includes('thank-you note'));
  assert.equal(await p.evaluate(()=>document.activeElement.id),'guide-output');
  console.log('PASS: Custom guided prompt and clipboard-denial fallback remain in the centralized review');
 } finally {await fallback.close();}
};
