const assert = require('node:assert/strict');
module.exports = async function checkWalkthrough(browser) {
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 const page=await context.newPage();
 const requests=[]; const errors=[];
 page.on('request',request=>requests.push(request.url()));
 page.on('pageerror',error=>errors.push(error.message));
 try {
  await page.goto('http://127.0.0.1:5175/fixture.html#about');
  await page.locator('#walkthrough-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('#walkthrough-stage').classList.contains('walk-running'));
  assert.equal(await page.locator('#walkthrough-stage').getAttribute('aria-hidden'),'true');
  await page.locator('#walkthrough-play').click();
  assert.equal(await page.locator('#walkthrough-play').innerText(),'Play');
  const paused=await page.locator('[data-typed="0"]').innerText();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('[data-typed="0"]').innerText(),paused);
  for (const step of [0,1,2]) {
   await page.locator(`[data-walk-step="${step}"]`).focus(); await page.keyboard.press('Enter');
   assert.equal(await page.locator('#walkthrough-stage').getAttribute('data-step'),String(step));
   assert.equal(await page.locator(`[data-walk-step="${step}"]`).getAttribute('aria-pressed'),'true');
  }
  assert((await page.locator('.mock-chat').innerText()).includes('A separate AI chat window'));
  assert(await page.locator('.mock-review').evaluate(el=>el.classList.contains('shown')));
  const beforeSwap=await page.locator('#walkthrough-stage').getAttribute('data-step');
  await page.locator('#walkthrough-it').click();
  assert.equal(await page.locator('#walkthrough-stage').getAttribute('data-step'),beforeSwap);
  assert((await page.locator('#walkthrough-stage').textContent()).toLowerCase().includes('login errors for 20 minutes'));
  await page.locator('#walkthrough-replay').focus(); await page.keyboard.press('Enter');
  await page.locator('#walkthrough-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('#walkthrough-stage').classList.contains('walk-running'));
  await page.waitForFunction(()=>document.querySelector('#walkthrough-stage').dataset.step==='1',null,{timeout:8000});
  assert.equal(await page.locator('[data-preview-line="0"]').evaluate(el=>getComputedStyle(el).opacity),'0','Preview flashed complete text before typing');
  await page.waitForFunction(()=>document.querySelector('[data-typed="0"]').textContent.length>5);
  await page.locator('#walkthrough-play').click();
  const typed=await page.locator('[data-typed="0"]').innerText();
  await page.waitForTimeout(300);assert.equal(await page.locator('[data-typed="0"]').innerText(),typed);
  await page.locator('#walkthrough-play').click();
  await page.waitForFunction(()=>document.querySelector('#walkthrough-stage').dataset.step==='2',null,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.mock-copy-button').textContent.includes('Copied'));
  await page.waitForFunction(()=>document.querySelector('#walkthrough-stage').dataset.step==='0',null,{timeout:10000});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert(!await page.locator('#walkthrough-stage').evaluate(el=>el.classList.contains('walk-running')));
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.setViewportSize({width:1280,height:400});
  await page.locator('header').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.querySelector('#walkthrough-stage').classList.contains('walk-running'));
  await page.goto('http://127.0.0.1:5175/fixture.html#builder');
  assert(!await page.locator('#walkthrough-stage').evaluate(el=>el.classList.contains('walk-running')));
  const afterRoute=await page.locator('[data-typed="0"]').textContent();
  await page.waitForTimeout(300);assert.equal(await page.locator('[data-typed="0"]').textContent(),afterRoute);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:5175/fixture.html#about');
  assert.equal(await page.locator('#walkthrough-play').isDisabled(),true);
  assert.equal(await page.locator('.walk-scene:visible').count(),3);
  await page.waitForFunction(()=>document.getAnimations().length===0);
  assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  for (const width of [360,768,1280]) {
   await page.setViewportSize({width,height:1000});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Walkthrough overflow at '+width);
   assert.equal(await page.locator('.walk-scene:visible').count(),width<768?1:3);
   for (const theme of ['light','dark']) {
    const dark=await page.locator('body').evaluate(el=>el.classList.contains('midnight'));
    if (dark !== (theme==='dark')) await page.locator('#palette').click();
    await page.locator('[data-walk-step="1"]').click();
    assert((await page.locator('.walk-scene.current').textContent()).includes('Fill in the details'));
    const failures=await page.evaluate(()=>{
     const lum=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
     return [...document.querySelectorAll('.walkthrough-heading p, .walkthrough-lock, .mock-title, .mock-field strong, .mock-preview p, .mock-complete, .mock-review, .walkthrough-captions li, .walkthrough-handoff')].filter(el=>el.getClientRects().length).flatMap(el=>{
      let ancestor=el;while(ancestor && getComputedStyle(ancestor).backgroundColor==='rgba(0, 0, 0, 0)') ancestor=ancestor.parentElement;
      const fg=lum(getComputedStyle(el).color),bg=lum(getComputedStyle(ancestor ?? document.body).backgroundColor);
      const ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
      return ratio<4.5?[{text:el.textContent.slice(0,30),ratio}]:[];
     });
    });
    assert.deepEqual(failures,[],theme+' walkthrough text contrast failure');
   }
  }
  const tree=await page.locator('#walkthrough').ariaSnapshot();
  assert(tree.includes('Start from a ready-made template') && tree.includes('Always review the answer'));
  assert(!tree.includes('Login errors for 20 minutes'),'Animated sample leaked into accessible captions');
  assert(requests.every(url=>url.startsWith('http://127.0.0.1:5175/')),'Unexpected external request');
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('promptly-workspace-v1')),null,'Demo changed saved prompt data');
  console.log('PASS: Walkthrough full loop, visibility/hidden-tab pause, paused typing, steps, replay, IT sample, route cleanup, static storyboard, keyboard, themes and unchanged prompt data');
  if (process.env.SCREENSHOT_DIR) {
   await page.setViewportSize({width:1280,height:1000});
   await page.locator('#walkthrough').screenshot({path:process.env.SCREENSHOT_DIR+'/walkthrough-static.png'});
   await page.setViewportSize({width:360,height:1000});
   await page.locator('#walkthrough').screenshot({path:process.env.SCREENSHOT_DIR+'/walkthrough-mobile.png'});
  }
 } finally {await context.close();}
};
