const { chromium } = require('playwright');
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
 if (process.env.SCREENSHOT_DIR) {
  await page.goto('http://127.0.0.1:5175/fixture.html#home'); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/home.png',fullPage:true,animations:'disabled'});
  await page.goto('http://127.0.0.1:5175/fixture.html#builder'); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/builder.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:process.env.SCREENSHOT_DIR+'/mobile.png',fullPage:true,animations:'disabled'});
 }
 } finally {await browser.close(); server.kill();}
})().catch(e => {console.error(e);server.kill();process.exitCode=1;});

