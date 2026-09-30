(() => {
  'use strict';
  const reader = globalThis.StoryReader;
  const $ = selector => document.querySelector(selector);
  const panel = $('#presentation-panel');
  if (!reader || !panel || !globalThis.PresentationClock || !globalThis.FilmClock || !globalThis.PresentationChoreography) return;
  const stops = [...document.querySelectorAll('[data-present-id]')].map(element => ({
    id: element.dataset.presentId, label: element.dataset.presentLabel,
    duration: Number(element.dataset.presentDuration), element,
    filmDuration: Number(element.dataset.filmDuration), hold: Number(element.dataset.filmHold),
    word: element.dataset.filmWord,
  }));
  const manualClock = new PresentationClock(stops);
  const film = new FilmClock(stops);
  let clock = manualClock;
  const isFilm = () => clock === film;
  const start = $('#presentation-start');
  const next = $('#presentation-next');
  const previous = $('#presentation-previous');
  const status = $('#presentation-status');
  const message = $('#presentation-message');
  const options = $('#presentation-options');
  const jump = $('#presentation-jump');
  const figure = $('#presentation-figure');
  const fullscreen = $('#presentation-fullscreen');
  const motionButton = $('#presentation-motion');
  const replay = $('#presentation-replay');
  const skip = $('#presentation-skip');
  const opening = $('.journey-opening');
  const bridges = [...document.querySelectorAll('[data-bridge]')];
  const dialog = $('#focus-dialog');
  const root = document.documentElement;
  const filmStart = $('#film-start');
  const transport = $('#film-transport');
  const seek = $('#film-seek');
  const time = $('#film-time');
  const effects = $('#presentation-effects');
  const clamp = x => Math.min(1, Math.max(0, x));
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  let active = false;
  let frame = 0;
  let preparing = false;
  let requestToken = 0;
  let lockedUntil = 0;
  let lastClick = -Infinity;
  let pointerStarted = -Infinity;
  let ownsFullscreen = false;
  let savedInert = [];
  let renderKey = '';
  let lastState = 'HOLD';
  let filmPrepared = false;
  let styles = new WeakMap();
  let stageHeight = innerHeight;
  const scrollExtents = new Map();
  const pressed = new Set();
  const formatTime = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  seek.max = film.duration;
  $('#film-length').textContent = formatTime(film.duration);
  for (const [id, position] of film.landings) {
    if (id === 'home') continue;
    const marker = document.createElement('i');
    marker.style.left = `${position / film.duration * 100}%`;
    $('#film-markers').append(marker);
  }

  function tell(text = '') {
    message.textContent = text;
    message.hidden = !text;
    if (active && syncControlsHeight()) render();
  }
  function stopFrame() { cancelAnimationFrame(frame); frame = 0; }
  function schedule() {
    if (active && clock.state === 'PLAYING' && !frame && !document.hidden) {
      frame = requestAnimationFrame(now => { frame = 0; clock.tick(now); render(); schedule(); });
    }
  }
  function set(element, key, value) {
    if (!styles.has(element)) styles.set(element, new Map());
    const cache = styles.get(element), text = String(value);
    if (cache.get(key) !== text) { element.style.setProperty(key, text); cache.set(key, text); }
  }
  function figureLabel(stop) {
    const index = stops.indexOf(stop);
    return index > 0 && index < stops.length - 1 ? `Figure ${index} / ${stops.length - 2} · ${stop.label}` : stop.label;
  }
  function render(seeked = false) {
    if (!active) return;
    const moving = Boolean(clock.target) && reader.motionEnabled;
    const target = clock.target || clock.current;
    const p = clock.progress;
    const choreography = PresentationChoreography.frame(target.id, p);
    const isOpening = moving && clock.current.id === 'home' && target.id === 'timing';
    const isBridge = moving && bridges.some(b => b.dataset.bridge === target.id);
    const contentOpacity = moving ? choreography.contentOpacity : 1;
    const key = `${isFilm()}:${clock.current.id}:${target.id}:${clock.state}:${preparing}:${moving}`;
    const changed = renderKey !== key;
    if (changed) {
      renderKey = key;
      stops.forEach(stop => {
        const visible = stop === target || (moving && stop === clock.current);
        stop.element.classList.toggle('presentation-visible', visible);
        // A single scene is exposed to assistive technology. Outgoing scenes
        // and non-current chapters cannot retain keyboard focus.
        stop.element.inert = stop !== target;
        if (!visible) stop.element.scrollTop = 0;
      });
      opening.classList.toggle('presentation-opening', isOpening);
      bridges.forEach(b => b.classList.toggle('presentation-bridge-active', isBridge && b.dataset.bridge === target.id));
      if (moving) target.element.scrollTop = 0;
      const text = preparing ? (isFilm() ? 'Preparing full story…' : 'Preparing figure…') : isFilm()
        ? (clock.state === 'HOLD' ? 'Story complete' : clock.state === 'PAUSED' ? 'Paused · take your time' : moving ? 'Full story · transition' : 'Full story · reading time')
        : clock.state === 'HOLD' ? 'Stopped · take your time' : clock.state === 'PAUSED' ? 'Paused' : 'Playing to next stop';
      status.textContent = `${figureLabel(target)} · ${text}`;
      next.textContent = preparing ? 'Preparing…' : isFilm() && !filmPrepared ? 'Retry play ▶' : clock.state === 'PLAYING' ? 'Pause Ⅱ' : clock.state === 'PAUSED' ? 'Resume ▶' : isFilm() ? 'Replay film ↻' : clock.index === stops.length - 1 ? 'Complete ✓' : 'Continue →';
      next.disabled = preparing || (!isFilm() && clock.state === 'HOLD' && clock.index === stops.length - 1);
      previous.disabled = clock.index === 0 && !moving;
      jump.value = target.id;
      replay.disabled = Boolean(clock.target) || clock.index === 0 || preparing;
      skip.disabled = !clock.target;
      figure.disabled = !target.element.querySelector('.focus-link');
      panel.dataset.state = clock.state;
      panel.dataset.current = clock.current.id;
      panel.dataset.target = target.id;
      panel.dataset.mode = isFilm() ? 'film' : 'presentation';
      transport.hidden = !isFilm();
      seek.disabled = preparing;
      $('#film-manual').disabled = preparing || !filmPrepared;
      if (lastState !== 'HOLD' && clock.state === 'HOLD') lockedUntil = performance.now() + 350;
      lastState = clock.state;
    }
    if (isFilm()) {
      seek.value = film.position;
      set(seek, '--film-progress', `${film.position / film.duration * 100}%`);
      const label = `${formatTime(film.position)} / ${formatTime(film.duration)}`;
      if (time.textContent !== label) {
        time.textContent = label;
        seek.setAttribute('aria-valuetext', `${label} · ${target.label}`);
      }
    }
    // Invisible incoming controls must not be reachable while their scene is masked.
    target.element.inert = moving && !choreography.interactionReady;
    set(panel, '--segment-progress', moving ? p : 1);
    set(target.element, '--p-opacity', contentOpacity);
    set(target.element, '--p-departure', 0);
    if (moving) {
      // Exchange complete, stationary underlays only while authored surfaces cover them.
      set(clock.current.element, '--p-opacity', 1 - contentOpacity);
      set(clock.current.element, '--p-departure', 0);
      if (isOpening) set(clock.current.element, '--hero-progress', 0);
    }
    // Exclusive ownership: the reader has cancelled its frame loop before here.
    ['--chapter-reveal', '--figure-expand', '--ending-reveal'].forEach(name => set(target.element, name, 1));
    set(target.element, '--entry', 0);
    set(target.element, '--entry-flash', 0);
    set(target.element, '--shards-visible', 0);
    ['--panel-x', '--panel-y', '--copy-x', '--copy-y', '--figure-x'].forEach(name => set(target.element, name, '0px'));
    set(target.element, '--hero-progress', 0);
    set(target.element, '--wash-opacity', 1);
    set(target.element, '--hero-rule', 1);
    if (isOpening) {
      const passage = choreography.followProgress;
      const exposure = choreography.followOpacity;
      set(opening, '--p-opacity', exposure);
      set(opening, '--interlude-x', `${(1 - passage * 2) * innerWidth * .3}px`);
      set(opening, '--interlude-progress', passage);
      set(opening, '--interlude-tilt', 0);
      set(opening, '--follow-pressure', 0);
      set(opening, '--follow-exit', 0);
    }
    if (isBridge) {
      const bridge = bridges.find(b => b.dataset.bridge === target.id);
      set(bridge, '--bridge-opacity', choreography.bridgeOpacity);
    }
    if (changed) syncControlsHeight();
    // Film seeks reproduce the preceding reading interval's final position.
    // Manual presentation preserves the speaker's own inspection position.
    if (moving && isFilm()) clock.current.element.scrollTop = scrollExtents.get(clock.current.id) || 0;
    renderEffects(moving, target, p, choreography);
    if (isFilm() && !clock.target && reader.motionEnabled && (clock.state === 'PLAYING' || seeked)) {
      const travel = ease((film.readingProgress - .2) / .65);
      target.element.scrollTop = (scrollExtents.get(target.id) || 0) * travel;
    }
  }

  function renderEffects(moving, target, p, shot) {
    effects.hidden = !moving;
    if (!moving) return;
    set(effects, '--fx-opacity', shot.exposure);
    // All scene channels come from the same pure frame, including the DOM masks.
    const surfaces = [effects, opening, ...bridges];
    for (const [name, value] of Object.entries(shot)) {
      if (typeof value !== 'number') continue;
      const key = `--shot-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
      surfaces.forEach(element => set(element, key, value));
    }
    const index = stops.indexOf(target);
    if (effects.dataset.target !== target.id) {
      effects.dataset.target = target.id;
      effects.dataset.shot = shot.shot;
      $('#film-slate-index').textContent = String(index).padStart(2, '0');
      $('#film-slate-word').textContent = target.word;
      $('#film-slate-caption').textContent = target.label;
      $('#film-frame-label').textContent = index <= stops.length - 2 ? `CHAPTER ${String(index).padStart(2, '0')} / 05` : 'THE RESEARCH CONTINUES';
    }
    if (shot.exposure > .001) globalThis.PresentationEffects?.render({width: innerWidth, height: stageHeight, progress: p, chapter: index, shot: shot.shot, frame: shot});
  }

  function pause(reason = '') {
    if (!active) return;
    requestToken++; preparing = false;
    const wasPlaying = clock.state === 'PLAYING';
    clock.pause(performance.now()); stopFrame(); render();
    if (wasPlaying && reason) tell(`${reason}. Resume when ready.`);
  }
  function closeMenu() { options.open = false; }
  function cancelPreparation() { requestToken++; preparing = false; }
  async function prepare(stop) {
    const img = stop.element.querySelector('.chapter-figure > picture > img');
    if (!img) return;
    img.loading = 'eager';
    // Decode the actual responsive picture, not a guessed desktop filename.
    let timeout;
    try {
      await Promise.race([
        img.decode(),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Figure preparation timed out')), 8000); }),
      ]);
      if (!img.naturalWidth) throw new Error('Figure unavailable');
    } finally { clearTimeout(timeout); }
  }
  async function navigate(kind, id) {
    if (!active || preparing || dialog.open) return;
    if (!isFilm() && kind !== 'jump' && clock.state !== 'HOLD') return;
    const destination = kind === 'jump' ? stops.find(s => s.id === id)
      : kind === 'replay' ? clock.current : stops[clock.index + 1];
    if (!destination || (kind === 'replay' && clock.index === 0)) return;
    if (isFilm()) clock.pause(performance.now());
    const token = ++requestToken;
    preparing = true; tell(); stopFrame(); render();
    try { await prepare(destination); }
    catch {
      if (token === requestToken && active) {
        preparing = false; render(); jump.value = clock.current.id;
        tell('This figure could not load. Retry Continue, choose another figure, or exit to reading.');
      }
      return;
    }
    if (!active || token !== requestToken) return;
    preparing = false;
    closeMenu();
    panel.focus({preventScroll: true});
    const now = performance.now();
    if (kind === 'jump') clock.jump(destination.id);
    else if (kind === 'replay') clock.replay(now, reader.motionEnabled);
    else clock.next(now, reader.motionEnabled);
    // Direct/reduced-motion jumps also need a fresh gesture after arrival.
    if (clock.state === 'HOLD') lockedUntil = now + 350;
    destination.element.scrollTop = 0;
    render(); schedule();
  }
  async function startFilm() {
    if (dialog.open || preparing) return;
    if (!active) enter(true);
    cancelPreparation(); stopFrame(); closeMenu();
    clock = film; film.seek(0); filmPrepared = false;
    document.body.classList.add('film-mode');
    const token = ++requestToken;
    preparing = true; tell(); render(); panel.focus({preventScroll: true});
    try { await Promise.all(stops.map(prepare)); }
    catch {
      if (active && token === requestToken) {
        preparing = false; render();
        tell('A figure could not load. Retry play, or exit to reading.');
      }
      return;
    }
    if (!active || token !== requestToken) return;
    filmPrepared = true; preparing = false;
    film.restart(performance.now()); render(); schedule();
  }
  function primary() {
    if (!active || preparing || dialog.open) return;
    if (isFilm() && !filmPrepared) { startFilm(); return; }
    if (clock.state === 'PLAYING') pause();
    else if (clock.state === 'PAUSED') { tell(); closeMenu(); clock.resume(performance.now()); render(); schedule(); }
    else if (isFilm()) { tell(); clock.restart(performance.now()); render(); schedule(); }
    else if (performance.now() >= lockedUntil) navigate('next');
  }
  function back() {
    if (!active || dialog.open) return;
    cancelPreparation(); stopFrame(); closeMenu(); tell(); clock.previous();
    render(); lockedUntil = performance.now() + 350;
    panel.focus({preventScroll: true});
  }
  function enter(fromStart = false) {
    if (active || dialog.open) return;
    const middle = innerHeight / 2;
    const nearest = stops.map(stop => {
      const r = stop.element.getBoundingClientRect();
      return {stop, distance: r.top <= middle && r.bottom >= middle ? 0 : Math.min(Math.abs(r.top - middle), Math.abs(r.bottom - middle))};
    }).sort((a, b) => a.distance - b.distance)[0].stop;
    savedInert = stops.map(s => s.element.inert);
    clock = manualClock; clock.jump(fromStart ? 'home' : nearest.id);
    active = true; styles = new WeakMap(); renderKey = ''; lastState = 'HOLD';
    reader.setPresenting(true);
    root.classList.add('presenting');
    document.body.classList.add('presentation-mode');
    panel.hidden = false; tell(); syncControlsHeight();
    render(); panel.focus({preventScroll: true});
  }
  function exit() {
    if (!active) return;
    const current = clock.current;
    cancelPreparation(); stopFrame(); closeMenu();
    if (ownsFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => tell('Use Esc to leave fullscreen.'));
    }
    ownsFullscreen = false; active = false;
    document.body.classList.remove('presentation-mode', 'film-mode'); root.classList.remove('presenting');
    effects.hidden = true;
    panel.hidden = true; opening.classList.remove('presentation-opening');
    bridges.forEach(b => b.classList.remove('presentation-bridge-active'));
    stops.forEach((s, i) => { s.element.inert = savedInert[i]; s.element.classList.remove('presentation-visible'); });
    current.element.scrollIntoView({behavior: 'instant', block: 'start'});
    reader.setPresenting(false);
    const focus = current.element.querySelector('.focus-link, .enter') || start;
    focus.focus({preventScroll: true});
    pressed.clear();
  }
  function syncControlsHeight() {
    if (!active) return false;
    const height = Math.ceil(panel.getBoundingClientRect().height);
    set(root, '--presentation-controls-height', `${height}px`);
    const resized = stageHeight !== innerHeight - height;
    stageHeight = innerHeight - height;
    const element = (clock.target || clock.current).element;
    scrollExtents.set((clock.target || clock.current).id, Math.max(0, element.scrollHeight - element.clientHeight));
    if (clock.target && isFilm()) {
      const source = clock.current.element;
      scrollExtents.set(clock.current.id, Math.max(0, source.scrollHeight - source.clientHeight));
    }
    if ((clock.target || clock.current).id === 'evidence') {
      const link = element.querySelector('.ending-intro > .enter');
      const bounds = link.getBoundingClientRect();
      set(effects, '--archive-link-x', `${bounds.left}px`);
      set(effects, '--archive-link-y', `${bounds.bottom}px`);
      set(effects, '--archive-link-width', `${bounds.width}px`);
    }
    $('#presentation-scroll-hint').textContent = isFilm() ? 'FULL STORY / PAUSE ANYWHERE' : clock.state === 'HOLD' && element.scrollHeight > element.clientHeight + 2
      ? 'SCROLL TO INSPECT THE FULL FIGURE ↓' : 'LIVE STORY / CS201';
    return resized;
  }
  function motionChanged() {
    motionButton.textContent = reader.motionEnabled ? 'Motion on' : 'Motion off';
    motionButton.setAttribute('aria-pressed', String(reader.motionEnabled));
    motionButton.disabled = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (active && !reader.motionEnabled) {
      if (isFilm()) pause();
      else { cancelPreparation(); stopFrame(); clock.finish(); }
      render();
    }
  }
  function freshClick(event) {
    const now = performance.now();
    if (event.detail > 1 || now - lastClick < 220 || (event.detail > 0 && pointerStarted < lockedUntil)) return false;
    lastClick = now; return true;
  }
  panel.addEventListener('pointerdown', () => { pointerStarted = performance.now(); });
  next.addEventListener('click', e => { if (freshClick(e)) primary(); });
  previous.addEventListener('click', back);
  start.addEventListener('click', () => enter());
  filmStart.addEventListener('click', startFilm);
  $('#film-restart').addEventListener('click', startFilm);
  $('#film-manual').addEventListener('click', () => {
    pause(); film.finish(); render(); panel.focus({preventScroll: true});
    tell('Complete figure held. Resume continues the full story.');
  });
  seek.addEventListener('pointerdown', () => pause());
  seek.addEventListener('input', () => {
    const position = Number(seek.value);
    pause(); film.seek(position); tell(); render(true);
  });
  $('#presentation-exit').addEventListener('click', exit);
  jump.addEventListener('change', () => { const id = jump.value; pause(); navigate('jump', id); });
  replay.addEventListener('click', () => navigate('replay'));
  skip.addEventListener('click', () => {
    cancelPreparation(); stopFrame(); closeMenu(); tell(); clock.finish(); render();
    lockedUntil = performance.now() + 350; panel.focus({preventScroll: true});
  });
  figure.addEventListener('click', () => {
    const button = (clock.target || clock.current).element.querySelector('.focus-link');
    if (button) { pause(); closeMenu(); reader.openFigure(button); }
  });
  // Native buttons keep native Space/Enter. Ignore key repeat for those too.
  document.addEventListener('keydown', event => {
    if (!active || dialog.open) return;
    if (event.key === 'Escape') {
      if (options.open) { event.preventDefault(); closeMenu(); options.querySelector('summary').focus(); }
      else if (!document.fullscreenElement) { event.preventDefault(); exit(); }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing) return;
    const keys = [' ', 'Enter', 'ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'];
    if (!keys.includes(event.key)) return;
    const native = event.target.closest('button,a,input,select,textarea,summary,[contenteditable="true"],[role="button"]');
    if (native?.matches('input,select,textarea')) return;
    if (event.repeat || pressed.has(event.key)) { if (!native || native.closest('#presentation-panel')) event.preventDefault(); return; }
    pressed.add(event.key);
    if (native) return;
    if (event.key === 'Enter') return;
    event.preventDefault();
    if (event.key === ' ') primary();
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') back();
    else if ((isFilm() || clock.state === 'HOLD') && performance.now() >= lockedUntil) navigate('next');
  });
  document.addEventListener('keyup', event => pressed.delete(event.key));
  options.addEventListener('toggle', () => { if (options.open) pause(); });
  dialog.addEventListener('close', () => { if (active) panel.focus({preventScroll: true}); });
  motionButton.addEventListener('click', () => $('#motion-toggle').click());
  fullscreen.hidden = !document.fullscreenEnabled;
  fullscreen.addEventListener('click', async () => {
    pause(); closeMenu();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await root.requestFullscreen();
        if (active) ownsFullscreen = true;
        else await document.exitFullscreen();
      }
    } catch { tell('Fullscreen is unavailable here. Windowed presentation is ready.'); }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Leave fullscreen' : 'Enter fullscreen';
    if (!document.fullscreenElement) ownsFullscreen = false;
    pause('Display changed');
  });
  addEventListener('blur', () => { pressed.clear(); pause('Window changed'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pressed.clear(); pause('Tab changed'); } });
  addEventListener('resize', () => { pause('Window resized'); syncControlsHeight(); if (active) render(); });
  for (const type of ['wheel', 'touchstart']) {
    document.addEventListener(type, event => {
      if (active && isFilm() && !event.target.closest('#presentation-panel')) pause();
    }, {passive: true});
  }
  // A pause message can resize the stage after its last frame. Repaint the
  // same playhead once; do not restart the playback loop while stopped.
  const layoutObserver = new ResizeObserver(() => { if (syncControlsHeight()) render(); });
  layoutObserver.observe(panel);
  stops.forEach(stop => layoutObserver.observe(stop.element));
  globalThis.StoryPresentation = {pause, motionChanged};
  motionChanged(); start.hidden = false; filmStart.hidden = false;
})();
