// Optional real-browser suite. Uses an existing Playwright installation and Chrome;
// Uses PRESENTATION_URL when supplied; creates no server or project dependencies.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {mkdirSync} = require('node:fs');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const output = process.env.PRESENTATION_QA_DIR || '/tmp/cs201-presentation-qa';
mkdirSync(output, {recursive: true});
const url = process.env.PRESENTATION_URL || pathToFileURL(path.resolve('index.html')).href;
const ids = ['home','timing','scores','attempt-scores','midterm-associations','platform-associations','evidence'];
let checks = 0;
function check(value, note) { assert.ok(value, note); checks++; }
(async () => {
  const browser = await chromium.launch({channel: process.env.PRESENTATION_BROWSER || 'chrome', headless: true});
  const errors = [];
  try {
    const page = await browser.newPage({viewport: {width:1440, height:900}});
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time: new Date('2026-09-29T12:00:00Z')});
    await page.goto(url);
    await page.clock.pauseAt(new Date('2026-09-29T12:00:01Z'));
    const run = ms => page.clock.runFor(ms);
    const click = id => page.locator(id).click({force: true});
    const state = () => page.locator('#presentation-panel').evaluate(e => ({state:e.dataset.state, current:e.dataset.current, target:e.dataset.target}));
    const go = async id => {
      await page.locator('#presentation-options').evaluate(e => { e.open = true; });
      await run(20); await page.selectOption('#presentation-jump',id); await run(400);
      check((await state()).current === id, `directory jump to ${id}`);
    };
    await click('#presentation-start');
    check((await state()).current === 'home', 'enter at homepage');
    await page.locator('#presentation-panel').focus();
    await page.keyboard.down('ArrowRight'); await run(1900);
    await page.keyboard.down('ArrowRight');
    check((await state()).target === 'timing', 'repeated next has no queued destination');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('Space');
    check((await state()).state === 'PAUSED', 'Space pauses in the transition');
    const before = await page.locator('.journey-opening').getAttribute('style');
    await run(120000);
    check(await page.locator('.journey-opening').getAttribute('style') === before, 'paused frame stays identical for two minutes');
    await page.screenshot({path:path.join(output,'opening-paused.png')});
    await page.keyboard.press('Space'); await run(2500);
    check((await state()).state === 'HOLD' && (await state()).current === 'timing', 'resume arrives once at the complete graph');
    await run(120000);
    check((await state()).current === 'timing', 'two minutes of HOLD cannot advance');
    await page.mouse.wheel(0,1200); await run(600);
    check((await state()).current === 'timing', 'wheel never advances presentation');
    await page.locator('#presentation-panel').focus(); await page.keyboard.press('ArrowRight'); await run(500);
    await page.keyboard.press('ArrowLeft');
    check((await state()).state === 'HOLD' && (await state()).current === 'timing','previous midway returns to source');
    await run(400); await click('#presentation-next'); await run(700);
    await page.evaluate(() => dispatchEvent(new Event('blur')));
    check((await state()).state === 'PAUSED','window blur pauses');
    await run(90000);
    check((await state()).state === 'PAUSED','returning after blur does not resume');
    await click('#presentation-next'); await run(300);
    await page.setViewportSize({width:1366,height:768}); await page.waitForTimeout(100); await run(100);
    check((await state()).state === 'PAUSED',`resize preserves and pauses transition: ${JSON.stringify(await state())}`);
    await go('scores');
    await page.locator('#scene-scores .focus-link').click({force:true});
    check(await page.locator('#focus-dialog').evaluate(e=>e.open),'real figure dialog opens');
    await page.keyboard.press('Escape');
    check(await page.locator('body').evaluate(e=>e.classList.contains('presentation-mode')),'Esc closes figure before exiting mode');
    check((await state()).state === 'HOLD','closing figure remains stopped');
    await go('attempt-scores'); await click('#presentation-next'); await run(1100);
    await page.locator('#presentation-options').evaluate(e=>{e.open=true;}); await run(20);
    await click('#presentation-figure');
    check((await state()).state === 'PAUSED','opening full figure midway pauses');
    await page.keyboard.press('Escape');
    check((await state()).state === 'PAUSED','closing mid-transition figure does not resume');
    await go('timing'); await click('#presentation-next'); await run(1400);
    await page.evaluate(()=>StoryPresentation.pause());
    await page.screenshot({path:path.join(output,'gap-paused.png')});
    await go('attempt-scores'); await click('#presentation-next'); await run(1500);
    await page.evaluate(()=>StoryPresentation.pause());
    await page.screenshot({path:path.join(output,'robustness-paused.png')});

    for (const viewport of [{width:1440,height:900},{width:1366,height:768},{width:1024,height:650},{width:390,height:844}]) {
      await page.setViewportSize(viewport); await run(100);
      for (const id of ids) {
        await go(id);
        const geometry = await page.locator(`[data-present-id="${id}"]`).evaluate(el => {
          const img=el.querySelector('.chapter-figure > picture > img');
          const cs=img && getComputedStyle(img.parentElement);
          const r=el.getBoundingClientRect();
          const p=document.querySelector('#presentation-panel').getBoundingClientRect();
          return {inert:el.inert, overflow:el.scrollWidth-el.clientWidth, bottom:r.bottom, controls:p.top,
            img:!!img, loaded:img?.naturalWidth, opacity:cs?.opacity, clip:cs?.clipPath,
            entry:el.style.getPropertyValue('--entry'), shards:el.style.getPropertyValue('--shards-visible')};
        });
        check(!geometry.inert && geometry.overflow <= 2, `${viewport.width}/${id} active scene fits horizontally`);
        check(geometry.bottom <= geometry.controls + 1, `${viewport.width}/${id} controls do not cover evidence area`);
        if (geometry.img) check(geometry.loaded > 0 && geometry.opacity === '1' && geometry.entry === '0' && geometry.shards === '0',`${viewport.width}/${id} exact complete picture at HOLD`);
        const focusable = await page.evaluate(() => [...document.querySelectorAll('[data-present-id]')].filter(e=>!e.inert).map(e=>e.dataset.presentId));
        check(focusable.length === 1 && focusable[0] === id,'only current scene is in the focus order');
        await page.screenshot({path:path.join(output,`${viewport.width}-${viewport.height}-${id}.png`)});
        if (viewport.width === 390 && geometry.img) {
          await page.locator(`[data-present-id="${id}"]`).evaluate(e=>{e.scrollTop=e.scrollHeight;});
          const end = await page.locator(`[data-present-id="${id}"] .chapter-figure > picture > img`).boundingBox();
          check(end.y + end.height <= geometry.controls + 1,'mobile internal scroll reaches the whole graph');
          await page.screenshot({path:path.join(output,`390-${id}-figure.png`)});
        }
      }
    }
    check(await page.locator('#presentation-next').isDisabled(),'ending does not loop');
    await go('platform-associations'); await click('#presentation-exit'); await run(1600);
    check(!(await page.locator('body').evaluate(e=>e.classList.contains('presentation-mode'))),'exit restores reading');
    check(await page.locator('#scene-platform-associations .focus-link').evaluate(e=>e===document.activeElement),'exit restores visible figure focus');
    const readTop = await page.locator('#scene-platform-associations').evaluate(e=>e.getBoundingClientRect().top);
    check(Math.abs(readTop) < 130,'exit returns to matching document section');
    for(let i=0;i<4;i++) { await click('#presentation-start'); check((await state()).current==='platform-associations','reenter from same chapter'); await click('#presentation-exit'); await run(500); }
    await click('#presentation-start'); await go('timing');
    // A stale decode must never defeat a newer directory choice.
    await page.locator('#scene-scores .chapter-figure > picture > img').evaluate(img => {
      const original = img.decode.bind(img);
      img.decode = () => new Promise(resolve => { window.finishDeferredFigure = async () => { await original(); resolve(); }; });
      window.restoreFigureDecode = () => { img.decode = original; };
    });
    await page.locator('#presentation-options').evaluate(e => { e.open = true; }); await run(20);
    await page.selectOption('#presentation-jump','scores'); await run(20);
    await page.selectOption('#presentation-jump','attempt-scores'); await run(400);
    check((await state()).current === 'attempt-scores', 'latest directory selection wins during preparation');
    await page.evaluate(async () => { await window.finishDeferredFigure(); window.restoreFigureDecode(); }); await run(400);
    check((await state()).current === 'attempt-scores', 'stale decode cannot overwrite the latest selection');
    await go('timing'); await click('#presentation-next'); await run(400);
    await page.locator('#presentation-next').focus(); await page.keyboard.down('Enter'); await run(300);
    check((await state()).state === 'PAUSED', 'native Enter pauses once');
    await page.keyboard.down('Enter'); await run(300); await page.keyboard.down('Enter');
    check((await state()).state === 'PAUSED', 'holding Enter does not toggle pause/resume');
    await page.keyboard.up('Enter'); await run(300); await page.keyboard.press('Enter');
    check((await state()).state === 'PLAYING', 'fresh Enter resumes');
    await go('timing');
    // Broken responsive resource must retain the current readable source scene.
    const src = await page.locator('#scene-scores .chapter-figure > picture').evaluate(p => {
      const img=p.querySelector('img'), source=p.querySelector('source');
      const original={src:img.getAttribute('src'),srcset:source.getAttribute('srcset')};
      img.src='assets/missing-presentation-test.svg'; source.srcset='assets/missing-presentation-test.svg'; return original;
    });
    await click('#presentation-next'); await run(8500);
    check((await state()).current==='timing' && (await state()).state==='HOLD','resource failure keeps current graph');
    check(await page.locator('#presentation-message').isVisible(),'resource error has visible recovery advice');
    await page.locator('#scene-scores .chapter-figure > picture').evaluate((p,src)=>{p.querySelector('img').src=src.src;p.querySelector('source').srcset=src.srcset;},src);
    await click('#presentation-next'); await run(3500);
    check((await state()).current==='scores','resource retry succeeds');
    await page.emulateMedia({reducedMotion:'reduce'}); await run(100); await go('timing');
    await click('#presentation-next'); await run(30);
    check((await state()).state==='HOLD' && (await state()).current==='scores','reduced motion jumps directly');
    await click('#presentation-next'); await run(30);
    check((await state()).current==='scores','rapid click at reduced-motion arrival cannot skip another graph');
    await page.emulateMedia({reducedMotion:'no-preference'}); await run(100);
    await go('home');
    for (const id of ids.slice(1)) {
      await click('#presentation-next'); await run(4800);
      check((await state()).current === id && (await state()).state === 'HOLD', `complete animated route reaches ${id}`);
    }
    await page.evaluate(() => {
      window.presentationScheduledFrames = 0;
      const request = requestAnimationFrame;
      window.requestAnimationFrame = callback => { window.presentationScheduledFrames++; return request(callback); };
    });
    await run(120000);
    check(await page.evaluate(()=>window.presentationScheduledFrames) === 0, 'HOLD schedules no animation frames');
    await page.emulateMedia({reducedMotion:'reduce'}); await run(100);
    await click('#presentation-exit'); await run(500);
    check(await page.locator('#motion-toggle').isDisabled(),'reading reduced-motion preference retained');
    check(errors.length===0,`no page errors: ${errors.join(', ')}`);

    const noJs = await browser.newPage({javaScriptEnabled:false,viewport:{width:1440,height:900}});
    await noJs.goto(url);
    check(await noJs.locator('.story-chapter').count()===5,'JS off retains all five charts');
    check(!(await noJs.locator('#presentation-start').isVisible()),'JS off hides unavailable entry');
    check(!(await noJs.locator('#presentation-interludes').isVisible()),'JS off hides decorative layers');
    await noJs.close();
    console.log(`PASS: ${checks} real-browser assertions; screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
