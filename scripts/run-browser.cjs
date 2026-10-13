const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const server = spawn(process.execPath,['scripts/browser-checks.cjs'],{stdio:'inherit',windowsHide:true});
(async () => {
 await new Promise(resolve => setTimeout(resolve,1000));
 const browser = await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {channel:'chrome'}),headless:true,args:['--no-proxy-server']});
 const page = await browser.newPage({viewport:{width:1400,height:1000}});
 page.on('pageerror',error => console.error('PAGE ERROR:',error.message));
 try {
 await page.goto('http://127.0.0.1:5175/checks.html');
 try { await page.waitForFunction(() => document.title.startsWith('PASS') || document.querySelector('#results')?.textContent.includes('FAIL'),{timeout:30000}); } catch(e) {console.error(e.message);}
 const results = await page.locator('#results').innerText(); console.log(results);
 if (!await page.title().then(t => t.startsWith('PASS')) || results.includes('FAIL:')) process.exitCode=1;
 // Real browser motion preferences and keyboard interactions.
 await page.goto('http://127.0.0.1:5175/fixture.html#home');
 await page.waitForFunction(() => document.getAnimations().some(a => a.effect?.getKeyframes().some(k => /14px/.test(k.translate ?? ''))));
 const cascade = await page.evaluate(() => {
   const delay = selector => document.querySelector(selector).getAnimations().find(a => a.effect.getKeyframes().some(k => /14px/.test(k.translate ?? '')))?.effect.getTiming().delay;
   return {heading:delay('#home .hero-copy h1'), paragraph:delay('#home .hero-copy > p'), footerPending:document.querySelector('#home footer > span').classList.contains('home-reveal-pending')};
 });
 assert(cascade.heading < cascade.paragraph,'Homepage does not cascade from top to bottom');
 assert(cascade.footerPending,'Offscreen footer was revealed before scrolling');
 await page.locator('#home footer').scrollIntoViewIfNeeded();
 await page.waitForFunction(() => !document.querySelector('#home footer > span').classList.contains('home-reveal-pending'));
 await page.waitForFunction(() => !document.querySelector('#home footer > span').getAnimations().length);
 assert.equal(await page.locator('#home footer > span').first().evaluate(el => getComputedStyle(el).opacity),'1');
 await page.evaluate(() => window.scrollTo(0,0));
 assert(!await page.locator('#home footer > span').first().evaluate(el => el.classList.contains('home-reveal-pending')),'Scroll replay hid previously revealed content');
 console.log('PASS: Top-to-bottom homepage cascade and one-time offscreen scroll reveals');
 await page.locator('#ambient-toggle').focus();
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('#ambient-toggle').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.ambient-glow').first().evaluate(el => getComputedStyle(el).animationPlayState),'paused');
 await page.reload();
 assert.equal(await page.locator('#ambient-toggle').getAttribute('aria-pressed'),'true');
 await page.locator('#ambient-toggle').click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(() => document.querySelector('#ambient-toggle').disabled);
 assert.equal(await page.evaluate(() => document.getAnimations().length),0);
 console.log('PASS: Entrances, keyboard pause, persisted motion setting and reduced-motion behavior');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(() => !document.querySelector('#ambient-toggle').disabled);
 await page.goto('http://127.0.0.1:5175/fixture.html#builder');
 await page.locator('#instructions-stage > summary').click();
 await page.locator('#section-nav button').first().click();
 await page.locator('#composition textarea').first().fill('Typing stays steady');
 assert.equal(await page.locator('#preview-output').evaluate(el => el.getAnimations({subtree:true}).length),0);
 for (const width of [320,390,1280]) {
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),'Motion layout overflows at '+width);
 }
 console.log('PASS: Steady preview while typing and 320/390/1280px layout bounds');
 await page.setViewportSize({width:1280,height:900});
 await page.locator('#brief-details > summary').click();
 await page.locator('[data-question=audience] > summary').click();
 await page.locator('#var-audience').fill('Operations team');
 assert.equal(await page.locator('#variables > details[open]').count(),1);
 await page.locator('#question-next').click();
 assert.equal(await page.locator('#variables > details[open]').getAttribute('data-question'),'facts');
 assert.equal(await page.locator('#var-audience').inputValue(),'Operations team');
 await page.locator('#question-back').click();
 assert.equal(await page.locator('#variables > details[open]').getAttribute('data-question'),'audience');
 await page.locator('#checks-panel > summary').click();
 await page.locator('#guidance [data-jump="var-destination"]').click();
 assert.equal(await page.locator('#variables > details[open]').getAttribute('data-question'),'destination');
 assert.equal(await page.locator('#focus-flow > details[open]').count(),1);
 assert.equal(await page.locator('[data-stage=finish-stage]').count(),1);
 await page.locator('#finish-stage > summary').click();
 assert.equal(await page.locator('#focus-flow > details[open]').getAttribute('id'),'finish-stage');
 await page.locator('#review-preview').click();
 assert.equal(await page.locator('#canvas').isVisible(),false);
 await page.locator('#view-editor').click();
 await page.locator('#brief-details > summary').click();
 assert.equal(await page.locator('#var-audience').inputValue(),'Operations team');
 await page.locator('#checks-panel > summary').click();
 assert(await page.evaluate(() => document.documentElement.scrollHeight < 2200),'Focused builder remains too long');
 console.log('PASS: Focused questions, next/back, collapsed content preservation, check jumps and review flow');
 await require('../tests/ux-browser.cjs')(browser);
 await require('../tests/walkthrough-browser.cjs')(browser);
 if (process.env.SCREENSHOT_DIR) {
  await page.setViewportSize({width:1400,height:1000});
  if (!await page.locator('body').evaluate(el => el.classList.contains('midnight'))) await page.locator('#palette').click();
  await page.goto('http://127.0.0.1:5175/fixture.html#home'); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/home.png',fullPage:true,animations:'disabled'});
  await page.goto('http://127.0.0.1:5175/fixture.html#builder'); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/builder.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/mobile.png',fullPage:true,animations:'disabled'});
 }
 } finally {await browser.close(); server.kill();}
})().catch(e => {console.error(e);server.kill();process.exitCode=1;});
