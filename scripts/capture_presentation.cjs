// Capture the actual browser output of an already-authorized HTTP preview.
// Reuses the host's Playwright and Chrome; starts no service or extra product clock.
const {chromium} = require('playwright');
const {mkdirSync, writeFileSync} = require('node:fs');
const path = require('node:path');

const url = process.env.PRESENTATION_URL;
if (!url || !/^https?:\/\//.test(url)) throw new Error('Set PRESENTATION_URL to the existing HTTP preview.');
const output = path.resolve(process.env.PRESENTATION_QA_DIR || 'design/previews/2026-09-30');
mkdirSync(output, {recursive: true});

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: {width: 1440, height: 900},
      recordVideo: {dir: output, size: {width: 1440, height: 900}},
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    // QA instrumentation only: sample presented frame intervals without
    // changing the product clock. Do not treat virtual test ticks as FPS.
    await page.addInitScript(() => {
      window.capturePerformance = {intervals: [], longTasks: []};
      let previous = 0;
      const sample = now => {
        const panel = document.querySelector('#presentation-panel');
        if (panel?.dataset.state === 'PLAYING') {
          if (previous) window.capturePerformance.intervals.push({
            ms: now - previous, chapter: panel.dataset.target,
          });
          previous = now;
        } else previous = 0;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      new PerformanceObserver(list => {
        if (document.querySelector('#presentation-panel')?.dataset.state === 'PLAYING') {
          window.capturePerformance.longTasks.push(...list.getEntries().map(entry => entry.duration));
        }
      }).observe({entryTypes: ['longtask']});
    });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#film-start').click();
    await page.waitForFunction(() => document.querySelector('#presentation-panel').dataset.state === 'PLAYING');
    // Real elapsed playback; virtual clocks are used only by the separate tests.
    await page.waitForFunction(() => document.querySelector('#presentation-panel').dataset.state === 'HOLD', null, {timeout: 120000});
    await page.screenshot({path: path.join(output, 'film-ending.png')});
    const performanceSample = await page.evaluate(() => window.capturePerformance);
    const video = page.video();
    await context.close();
    await video.saveAs(path.join(output, 'full-story.webm'));

    // Deterministic paused frames make the transient design inspectable.
    const stills = await browser.newPage({viewport: {width: 1440, height: 900}});
    stills.on('pageerror', error => errors.push(error.message));
    await stills.goto(url);
    await stills.locator('#film-start').click();
    await stills.waitForFunction(() => document.querySelector('#presentation-panel').dataset.state === 'PLAYING');
    const stops = await stills.locator('[data-present-id]').evaluateAll(elements => elements.map(element => ({
      id: element.dataset.presentId,
      duration: Number(element.dataset.filmDuration),
      hold: Number(element.dataset.filmHold),
    })));
    const seek = position => stills.locator('#film-seek').evaluate((slider, position) => {
      slider.value = position;
      slider.dispatchEvent(new Event('input', {bubbles: true}));
    }, position);
    let offset = 0;
    for (const stop of stops) {
      if (stop.duration) {
        for (const progress of [.12, .20, .35, .52, .70, .88]) {
          await seek(offset + stop.duration * progress);
          await stills.screenshot({path: path.join(output, `${stop.id}-${Math.round(progress * 100)}.png`)});
        }
      }
      offset += stop.duration;
      await seek(offset + 100);
      await stills.screenshot({path: path.join(output, `${stop.id}-hold.png`)});
      offset += stop.hold;
    }
    await stills.close();
    writeFileSync(path.join(output, 'capture.json'), JSON.stringify({
      url, browser: browser.version(), viewport: {width: 1440, height: 900},
      durationMs: offset, video: 'full-story.webm', timing: 'real elapsed playback', errors,
      performance: performanceSample,
    }, null, 2) + '\n');
    if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
    console.log(`Captured real playback and paused frames: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
