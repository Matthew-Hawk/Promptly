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
 await page.locator('#composition textarea').first().fill('Typing stays steady');
 assert.equal(await page.locator('#preview-output').evaluate(el => el.getAnimations({subtree:true}).length),0);
 for (const width of [320,390,1280]) {
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),'Motion layout overflows at '+width);
 }
 console.log('PASS: Steady preview while typing and 320/390/1280px layout bounds');
 if (process.env.SCREENSHOT_DIR) {
  await page.setViewportSize({width:1400,height:1000});
  if (!await page.locator('body').evaluate(el => el.classList.contains('midnight'))) await page.locator('#palette').click();
  await page.goto('http://127.0.0.1:5175/fixture.html#home'); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/home.png',fullPage:true,animations:'disabled'});
  await page.goto('http://127.0.0.1:5175/fixture.html#builder'); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/builder.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/mobile.png',fullPage:true,animations:'disabled'});
 }
 } finally {await browser.close(); server.kill();}
})().catch(e => {console.error(e);server.kill();process.exitCode=1;});
