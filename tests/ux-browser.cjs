const assert = require('node:assert/strict');
module.exports = async function checkUx(browser) {
 const context = await browser.newContext({reducedMotion:'reduce',viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});
 const page = await context.newPage();
 try {
  await page.goto('http://127.0.0.1:5175/fixture.html#home');
  assert((await page.locator('.hero-copy').innerText()).includes('Free. No account.'));
  assert((await page.locator('.hero-copy').innerText()).includes('You paste it into the AI'));
  await page.getByRole('button',{name:'IT & operations',exact:true}).click();
  assert(await page.locator('#it-example').isVisible());
  await page.getByRole('button',{name:'Real estate',exact:true}).click();
  assert(await page.locator('#estate-example').isVisible());
  for (const width of [360,768,1280]) {
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),'Homepage overflow at '+width);
   if (width===360) assert(await page.locator('#estate-example [href="#builder/listing"]').evaluate(el=>el.getBoundingClientRect().top<window.innerHeight*2),'Real-estate template is below the first two screens');
  }
  for (const theme of ['light','dark']) {
   const dark = await page.locator('body').evaluate(el => el.classList.contains('midnight'));
   if (dark !== (theme === 'dark')) await page.locator('#palette').click();
   const failures = await page.evaluate(() => {
    const rgb = color => color.match(/[\d.]+/g).slice(0,3).map(Number);
    const lum = color => rgb(color).map(v => {v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
    const failures=[];
    for (const el of document.querySelectorAll('.hero-copy > p, .hero-copy .eyebrow, .process > .eyebrow, .trust-badge, .example-after p, .power-grid p, .home-faq summary, header nav a, .example-links .primary')) {
     if (!el.getClientRects().length) continue;
     let ancestor=el; while (ancestor && ['rgba(0, 0, 0, 0)','transparent'].includes(getComputedStyle(ancestor).backgroundColor)) ancestor=ancestor.parentElement;
     const style=getComputedStyle(el); const fg=lum(style.color); const bg=lum(getComputedStyle(ancestor ?? document.body).backgroundColor);
     const ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
     if (ratio<4.5) failures.push({text:el.textContent.trim().slice(0,40),ratio});
    }
    return failures;
   });
   assert.deepEqual(failures,[],theme+' text contrast failures');
  }
  const started=Date.now();
  await page.getByRole('link',{name:'Make a prompt',exact:true}).click();
  assert(await page.locator('#template-browser').evaluate(el=>el.open),'New visitor does not see templates');
  await page.locator('#template-search').fill('listing');
  await page.locator('[data-template=listing]').click();
  const values={subject:'Oak Lane home',facts:'Three bedrooms, two bathrooms, a fenced yard',audience:'Buyers asking about viewings',action:'Arrange a viewing',destination:'Reply to this email',limit:'150'};
  for (const [key,value] of Object.entries(values)) {
   const field=page.locator('#var-'+key);
   if (!await field.isVisible()) await page.locator(`[data-question=${key}] > summary`).click();
   assert((await field.getAttribute('placeholder')).startsWith('Example:'));
   await field.fill(value);
  }
  await page.locator('#copy').click();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Paste it into the AI'));
  assert((await page.locator('#toast').innerText()).includes('Paste it into the AI'));
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert(copied.includes('Oak Lane home') && copied.includes('Do not invent features'));
  assert(Date.now()-started<60000,'Scripted creation/copy workflow exceeded 60 seconds');
  await page.locator('#finish-stage > summary').click();
  await page.locator('#save-prompt').click();
  for (const key of ['summary','incident','project','listing','inquiry','openhouse']) {
   await page.goto('http://127.0.0.1:5175/fixture.html#builder/'+key);
   const names={summary:'Summary and action items',incident:'Incident update',project:'Project plan',listing:'Write a listing description',inquiry:'Reply to a buyer or seller inquiry',openhouse:'Open house follow-up email'};
   await page.waitForFunction(name=>document.querySelector('#replace-dialog').open || document.querySelector('#prompt-name').value===name,names[key]);
   if (await page.locator('#replace-dialog').isVisible()) await page.locator('#replace-confirm').click();
   await page.waitForFunction(key=>document.querySelector('#selected-template').textContent.includes('Template:'),key);
   assert.equal(await page.locator('#prompt-name').inputValue(),names[key]);
  }
  await page.locator('#copy').click();
  assert.equal(await page.locator('#unfinished-confirm').innerText(),'Copy anyway');
  await page.locator('#unfinished-cancel').click();
  await page.locator('#download').click();
  assert.equal(await page.locator('#unfinished-confirm').innerText(),'Save anyway');
  await page.locator('#unfinished-cancel').click();
  await page.locator('#extra-options').evaluate(el=>el.open=true);
  await page.locator('#new-profile').evaluate(el=>el.click());
  assert.equal(await page.locator('#profile-heading').innerText(),'My details');
  assert((await page.locator('#profile-dialog').ariaSnapshot()).includes('Facts and tone you want in every prompt'));
  await page.keyboard.press('Escape');
  await page.locator('#view-preview').focus(); await page.keyboard.press('Enter');
  assert(await page.locator('#preview').isVisible());
  await page.locator('#view-editor').focus(); await page.keyboard.press('Enter');
  assert(await page.locator('#canvas').isVisible());
  for (const width of [360,768,1280]) {
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Builder overflow at '+width);
  }
  console.log('PASS: Plain-language landing, audience examples, AA text contrast, gallery, scripted quick copy, deep links, dialog wording, keyboard and accessible dialog names');
  if (process.env.SCREENSHOT_DIR) {
   await page.goto('http://127.0.0.1:5175/fixture.html#home');
   await page.setViewportSize({width:1280,height:900});
   await page.screenshot({path:process.env.SCREENSHOT_DIR+'/ux-home.png',fullPage:true});
   if (process.env.UPDATE_HOMEPAGE_SCREENSHOT) await page.screenshot({path:'ReadME_Assets/home.png',fullPage:true});
   await page.setViewportSize({width:360,height:900});
   await page.screenshot({path:process.env.SCREENSHOT_DIR+'/ux-home-mobile.png',fullPage:true});
  }
 } finally {await context.close();}
};
