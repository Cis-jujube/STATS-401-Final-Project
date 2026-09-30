// Run against an already-authorized HTTP preview. This suite starts no server.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {mkdirSync} = require('node:fs');
const path = require('node:path');
const url = process.env.PRESENTATION_URL;
assert.ok(url && /^https?:\/\//.test(url), 'Set PRESENTATION_URL to the existing HTTP preview.');
const output = process.env.PRESENTATION_QA_DIR || '/tmp/cs201-film-qa';
mkdirSync(output, {recursive:true});
let checks = 0;
const check = (value, label) => {assert.ok(value, label); checks++;};
(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const errors = [];
  try {
    for (const [width, height] of [[1440,900],[1366,768],[1024,650],[390,844]]) {
      const page = await browser.newPage({viewport:{width,height}});
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install({time:new Date('2026-09-30T08:00:00Z')});
      await page.goto(url);
      await page.clock.pauseAt(new Date('2026-09-30T08:00:01Z'));
      const run = ms => page.clock.runFor(ms);
      const click = id => page.locator(id).click({force:true});
      const state = () => page.locator('#presentation-panel').evaluate(e => ({...e.dataset}));
      const position = () => page.locator('#film-seek').inputValue();
      const seek = async value => {
        await page.locator('#film-seek').evaluate((e, value) => {e.value = value; e.dispatchEvent(new Event('input', {bubbles:true}));}, value);
      };
      await page.screenshot({path:path.join(output,`${width}-entry.png`)});
      await click('#film-start');
      await page.waitForFunction(() => document.querySelector('#presentation-panel').dataset.state === 'PLAYING');
      check((await state()).mode === 'film', 'one button starts the film');
      check(await page.locator('#film-seek').getAttribute('max') === '70100', 'complete 70.1-second edit');
      await run(4500); await click('#presentation-next');
      check((await state()).state === 'PAUSED' && (await state()).target === 'timing', 'opening pauses mid-frame');
      const paused = await position();
      const image = await page.locator('#presentation-energy').evaluate(e => e.toDataURL());
      await page.evaluate(() => {
        const request = requestAnimationFrame;
        window.filmFrames = 0;
        window.requestAnimationFrame = callback => {window.filmFrames++; return request(callback);};
      });
      await run(120000);
      check(await position() === paused, 'pause does not consume reading or transition time');
      check(await page.locator('#presentation-energy').evaluate(e => e.toDataURL()) === image, 'optical field remains frozen');
      check(await page.evaluate(() => window.filmFrames) === 0, 'paused film schedules no frames');
      await page.screenshot({path:path.join(output,`${width}-opening.png`)});
      await seek(24800);
      check((await state()).current === 'scores' && (await state()).target === 'scores', 'seek directly into graph reading');
      check((await state()).state === 'PAUSED', 'seeking remains paused');
      await click('#presentation-next'); await run(4000);
      check((await state()).target === 'attempt-scores', 'full playback advances after the reading interval');
      await click('#film-manual');
      check((await state()).current === 'attempt-scores' && (await state()).state === 'PAUSED', 'explanation button lands on a complete figure');
      await run(120000);
      check((await state()).current === 'attempt-scores', 'explanation waits indefinitely');
      const stops = await page.locator('[data-present-id]').evaluateAll(elements => elements.map(e => ({id:e.dataset.presentId, duration:Number(e.dataset.filmDuration), hold:Number(e.dataset.filmHold)})));
      let offset = 0;
      for (const [index, stop] of stops.entries()) {
        if (stop.duration) {
          if (width === 1440 || width === 390) {
            // Sample before foreground coverage: a prior tall scene must not
            // inherit a different scroll position from seek history.
            await seek(offset - 10);
            await seek(offset + stop.duration * .02);
            const arrival = await page.screenshot();
            await seek(70000);
            await seek(offset + stop.duration * .02);
            check(arrival.equals(await page.screenshot()), `${width}: ${stop.id} early transition is independent of seek history`);
          }
          await seek(offset + stop.duration * .44);
          const underlay = await page.locator(`[data-present-id="${stop.id}"]`).evaluate(element => ({
            inert: element.inert,
            entry: element.style.getPropertyValue('--entry'),
            shards: element.style.getPropertyValue('--shards-visible'),
          }));
          check(underlay.inert, `${stop.id}: masked chart actions remain outside focus order`);
          check(underlay.entry === '0' && underlay.shards === '0', `${stop.id}: complete evidence has stationary geometry beneath its mask`);
          if (width === 1440 || width === 390) {
            const frozen = await page.screenshot();
            await seek(offset + stop.duration * .99);
            await seek(offset + stop.duration * .44);
            check(frozen.equals(await page.screenshot()), `${width}: ${stop.id} reverse seek restores the same rendered pixels`);
          }
          await page.screenshot({path:path.join(output,`${width}-transition-${stop.id}.png`)});
        }
        offset += stop.duration;
        await seek(offset + Math.min(500, stop.hold / 2));
        const layout = await page.locator(`[data-present-id="${stop.id}"]`).evaluate(e => {
          const img = e.querySelector('.chapter-figure > picture > img');
          return {client:e.clientWidth, scroll:e.scrollWidth, height:e.clientHeight, bottom:e.getBoundingClientRect().bottom, top:document.querySelector('#presentation-panel').getBoundingClientRect().top, opacity:getComputedStyle(e).opacity, decoded:!img || img.naturalWidth > 0};
        });
        check(layout.scroll <= layout.client + 1, `${width}: ${stop.id} has no horizontal overflow`);
        check(layout.height > 250 && Math.abs(layout.bottom - layout.top) < 2, 'transport stays outside the figure');
        check(layout.opacity === '1' && layout.decoded, 'complete evidence is opaque and decoded');
        check(!await page.locator(`[data-present-id="${stop.id}"]`).evaluate(element => element.inert), 'complete evidence restores keyboard access');
        check(await page.locator('#presentation-effects').isHidden(), 'all transient surfaces leave the complete figure');
        await page.screenshot({path:path.join(output,`${width}-figure-${stop.id}.png`)});
        if (width < 701 && index === 4) {
          await click('#presentation-next'); await run(stop.hold * .8);
          check(await page.locator(`[data-present-id="${stop.id}"]`).evaluate(e => e.scrollTop > 0), 'mobile film reveals tall figure during reading');
          // The previous click leaves the pointer over the transport, whose
          // wheel events intentionally do not count as inspecting the figure.
          await page.mouse.move(width / 2, height / 3);
          await page.mouse.wheel(0,-100); await run(50);
          check((await state()).state === 'PAUSED', 'manual inspection pauses camera');
        }
        offset += stop.hold;
      }
      const stackStart = stops.slice(0, stops.findIndex(stop => stop.id === 'attempt-scores'))
        .reduce((sum, stop) => sum + stop.duration + stop.hold, 0);
      await seek(stackStart + 1200);
      await run(1000); await click('#presentation-next'); await run(100);
      await page.evaluate(() => dispatchEvent(new Event('blur')));
      const blurred = await position();
      await page.screenshot();
      const projection = await page.locator('#presentation-energy').evaluate(canvas => ({
        bitmap: canvas.height,
        expected: Math.round(canvas.getBoundingClientRect().height * Math.min(devicePixelRatio, 1.5)),
      }));
      check(projection.bitmap === projection.expected, 'pause message reprojects Canvas to the resized stage');
      await run(1000);
      check(await position() === blurred, 'pause geometry refresh does not advance the film');
      await seek(70000); await click('#presentation-next'); await run(200);
      check((await state()).state === 'HOLD' && (await state()).current === 'evidence', 'film reaches ending and stops');
      await run(1000); await click('#presentation-next'); await run(100);
      check((await state()).current === 'home' && (await state()).state === 'PLAYING', 'replay starts a fresh film');
      await page.evaluate(() => dispatchEvent(new Event('blur')));
      check((await state()).state === 'PAUSED', 'blur pauses even during reading time');
      await click('#presentation-exit');
      check(!await page.locator('body').evaluate(e => e.classList.contains('film-mode')), 'exit restores reading');
      await page.close();
    }
    // Motion preference removes optics without removing the complete sequence.
    const page = await browser.newPage({reducedMotion:'reduce'});
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time:new Date('2026-09-30T08:00:00Z')});
    await page.goto(url); await page.clock.pauseAt(new Date('2026-09-30T08:00:01Z'));
    await page.locator('#film-start').click({force:true});
    await page.waitForFunction(() => document.querySelector('#presentation-panel').dataset.state === 'PLAYING');
    await page.clock.runFor(4000);
    check(await page.locator('#presentation-effects').evaluate(e => getComputedStyle(e).display) === 'none', 'reduced motion has no optical transitions');
    check(await page.locator('#scene-timing').evaluate(e => getComputedStyle(e).opacity) === '1', 'reduced motion shows complete target');
    await page.clock.runFor(68000);
    check(await page.locator('#presentation-panel').getAttribute('data-state') === 'HOLD', 'reduced-motion film still completes');
    await page.close();
    // Full-film preparation must fail visibly and ignore a late completion after exit.
    const recovery = await browser.newPage();
    recovery.on('pageerror', error => errors.push(error.message));
    await recovery.goto(url);
    await recovery.locator('#scene-scores .chapter-figure > picture > img').evaluate(img => {
      window.restoreFilmDecode = img.decode.bind(img);
      img.decode = () => Promise.reject(new Error('deliberate decode failure'));
    });
    await recovery.locator('#film-start').click({force:true});
    await recovery.waitForFunction(() => document.querySelector('#presentation-message').textContent.includes('Retry play'));
    check(await recovery.locator('#presentation-panel').getAttribute('data-state') === 'PAUSED', 'failed full preparation remains paused');
    await recovery.locator('#scene-scores .chapter-figure > picture > img').evaluate(img => {img.decode = window.restoreFilmDecode;});
    await recovery.locator('#presentation-next').click({force:true});
    await recovery.waitForFunction(() => document.querySelector('#presentation-panel').dataset.state === 'PLAYING');
    check(await recovery.locator('#presentation-panel').getAttribute('data-mode') === 'film', 'retry prepares and starts the complete film');
    await recovery.locator('#presentation-exit').click({force:true});
    await recovery.locator('#scene-scores .chapter-figure > picture > img').evaluate(img => {
      img.decode = () => new Promise(resolve => {window.finishFilmDecode = resolve;});
    });
    await recovery.locator('#film-start').click({force:true});
    check(await recovery.locator('#presentation-next').isDisabled(), 'preparation disables playback');
    await recovery.locator('#presentation-exit').click({force:true});
    await recovery.evaluate(() => window.finishFilmDecode());
    check(await recovery.locator('#presentation-panel').isHidden(), 'late preparation cannot reopen an exited film');
    await recovery.close();
    check(errors.length === 0, `no browser errors: ${errors.join('; ')}`);
    console.log(`PASS: ${checks} full-story browser assertions. Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
