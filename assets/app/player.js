/* Player: one clock drives every scene, caption, particle and transition.
   Two modes:
   • Presenter — the full story. Each beat plays its animation, then HOLDS on the finished
     frame (the stage keeps breathing) until the speaker continues with → / Space / a clicker.
     "Auto" plays straight through instead.
   • Loop — a beat-cut highlight reel (reel.js) that repeats seamlessly. Uneven rhythm: short
     flurries, speed ramps and holds. Optionally locked to the viewer's own audio file.
   Everything is a pure function of the playhead, so pausing, scrubbing and deep links are exact. */
(function () {
  const F = window.Film, P = F.particles;
  const scenes = F.scenes;
  const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));
  const TRANS_IN = 1.25, TRANS_OUT = 0.75, HOLD_LEAD = 0.5; // hold before the caption starts to fade

  // ── story timeline ───────────────────────────────────────────────
  let acc = 0;
  scenes.forEach((s, i) => {
    s.index = i; s.start = acc; acc += s.duration; s.end = acc;
    const m = /^(\d+)\s*·\s*(.+)$/.exec(s.title);
    s.it = m ? { num: m[1], word: m[2] } : null; // chapter intertitle
  });
  const TOTAL = acc;
  const beats = [];
  scenes.forEach((s) => s.beats.forEach((b, j) => {
    const next = s.beats[j + 1];
    beats.push({ scene: s, j, at: s.start + b.at, end: next ? s.start + next.at : s.end, beat: b });
  }));
  const sceneAt = (T) => { for (let i = scenes.length - 1; i >= 0; i--) if (T >= scenes[i].start) return scenes[i]; return scenes[0]; };
  const beatIndexAt = (T) => { let k = 0; beats.forEach((b, i) => { if (T >= b.at) k = i; }); return k; };

  // ── loop reel timeline (in beats; seconds depend on the tempo) ────
  const REEL = F.reel;
  const WARP = { linear: (p) => p, out: F.ease.out, in: F.ease.in, inOut: F.ease.inOut };
  function retime() {
    const bl = 60 / REEL.bpm; let b = 0;
    REEL.shots.forEach((sh, i) => {
      sh.index = i; sh.sc = byId[sh.scene]; sh.startBeat = b;
      sh.start = b * bl; sh.dur = sh.beats * bl; sh.end = sh.start + sh.dur; b += sh.beats;
    });
    REEL.beatLen = bl; REEL.totalBeats = b; REEL.len = b * bl;
  }
  retime();
  const shotAt = (R) => { for (let i = REEL.shots.length - 1; i >= 0; i--) if (R >= REEL.shots[i].start) return REEL.shots[i]; return REEL.shots[0]; };
  const wrap = (v) => ((v % REEL.len) + REEL.len) % REEL.len;

  const S = { mode: 'presenter', T: 0, R: 0, playing: false, speed: 1, auto: false, held: false, scene: null, started: false };
  F.player = S;
  const isLoop = () => S.mode === 'loop';
  const LEN = () => (isLoop() ? REEL.len : TOTAL);
  const POS = () => (isLoop() ? S.R : S.T);

  // smoothed lens alpha per homework, shared by all scenes
  F.lensA = Object.fromEntries(F.HW.map((h) => [h, 1]));
  F.la = (h) => F.lensA[h];

  // ── DOM ──────────────────────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const film = $('#film'), scenesEl = $('#scenes'), cap = $('#caption');
  const capK = cap.querySelector('.cap-kicker'), capT = cap.querySelector('.cap-title'), capB = cap.querySelector('.cap-body'), capC = cap.querySelector('.cap-credit');
  const playBtn = $('.t-play'), timeEl = $('.t-time'), track = $('.t-track'), segsEl = $('.t-segs'), head = $('.t-head'), hoverEl = $('.t-hover');
  const pauseCard = $('.pause-card'), keysCard = $('.keys-card'), wipe = $('.wipe'), flash = $('.flash'), chapterLabel = $('.chapter-label');
  const poster = $('.poster'), bigPlay = $('.big-play');
  const itEl = $('.intertitle'), itNum = $('.it-num'), itWord = $('.it-word'), itLine = $('.it-line');
  const lbTop = $('.lb-top'), lbBot = $('.lb-bot'), osd = $('.osd'), seekOsd = $('.seek-osd'), vhs = $('.vhs'), vhsTc = $('.vhs-tc');
  const glowCursor = $('.glow-cursor'), glowAurora = $('.glow-aurora'), chip = $('.continue-chip');
  const modeBtns = [...document.querySelectorAll('.t-modes button')], autoBtn = $('.t-auto'), musicBtn = $('.t-music'), musicCard = $('.music-card');

  F.computeLayout();
  P.init($('#particles'));
  P.resize();
  P.mouseS.x = F.layout.W / 2; P.mouseS.y = F.layout.H / 2;

  // film grain texture (generated once, animated by CSS)
  {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d'), img = g.createImageData(160, 160), rr = F.rng(7);
    for (let i = 0; i < img.data.length; i += 4) { const v = rr() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    $('.grain').style.backgroundImage = `url(${c.toDataURL()})`;
  }

  // mount scenes
  scenes.forEach((s) => {
    const el = document.createElement('section');
    el.className = 'scene'; el.id = 'scene-' + s.id; el.setAttribute('aria-label', s.title);
    scenesEl.appendChild(el);
    s.el = el;
    s.mount(el);
    s.resize && s.resize(F.layout);
  });

  // ── scrubber: chapters in Presenter, shots in Loop ────────────────
  const plain = (h) => (h || '').replace(/<[^>]+>/g, '');
  let segEls = [], segItems = [], segGeom = [];
  function buildTrack() {
    segsEl.innerHTML = '';
    segItems = isLoop()
      ? REEL.shots.map((sh) => ({ start: sh.start, dur: sh.dur, label: sh.sc.title, sub: plain(sh.say) }))
      : scenes.map((s) => ({ start: s.start, dur: s.duration, label: s.title, ticks: s.beats.slice(1).map((b) => b.at / s.duration) }));
    segEls = segItems.map((it) => {
      const seg = document.createElement('div'); seg.className = 't-seg'; seg.style.flex = `${it.dur} 1 0`;
      seg.appendChild(document.createElement('b'));
      (it.ticks || []).forEach((f) => { const tick = document.createElement('i'); tick.className = 't-tick'; tick.style.left = `${f * 100}%`; seg.appendChild(tick); });
      segsEl.appendChild(seg); return seg;
    });
    segsEl.classList.toggle('reel', isLoop());
    measureTrack();
  }
  function measureTrack() { segGeom = segEls.map((e) => [e.offsetLeft, e.offsetWidth]); }
  const segIndexAt = (v) => { for (let i = segItems.length - 1; i >= 0; i--) if (v >= segItems[i].start) return i; return 0; };
  function tFromX(clientX) {
    const x = clientX - track.getBoundingClientRect().left;
    for (let i = 0; i < segItems.length; i++) {
      const [l, w] = segGeom[i];
      if (x <= l + w + 1.5 || i === segItems.length - 1) return segItems[i].start + F.clamp((x - l) / w) * segItems[i].dur;
    }
    return 0;
  }
  function xFromT(v) {
    const i = segIndexAt(v), it = segItems[i], g = segGeom[i] || [0, 0];
    return g[0] + g[1] * F.clamp((v - it.start) / it.dur);
  }
  function labelAt(v) {
    if (isLoop()) { const sh = shotAt(v); return { title: sh.sc.title, sub: plain(sh.say) }; }
    const s = sceneAt(v), b = beats[beatIndexAt(v)];
    return { title: s.title, sub: plain(b.beat.title) };
  }
  let dragging = false;
  track.addEventListener('pointerdown', (e) => { dragging = true; track.setPointerCapture(e.pointerId); if (S.playing) setPlaying(false); seek(tFromX(e.clientX), true); });
  track.addEventListener('pointermove', (e) => {
    const v = tFromX(e.clientX), l = labelAt(v);
    hoverEl.innerHTML = `${l.title}<small>${F.time(v)}${l.sub ? ' · ' + l.sub : ''}</small>`;
    hoverEl.style.left = `${e.clientX - track.getBoundingClientRect().left}px`;
    if (dragging) seek(v, true);
  });
  track.addEventListener('pointerup', () => (dragging = false));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); seek(POS() + (e.key === 'ArrowRight' ? 5 : -5), true); }
  });

  // ── transport ────────────────────────────────────────────────────
  const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
  function setPlaying(v, fromUser) {
    if (v && !isLoop() && S.T >= TOTAL - 0.05) S.T = 0;
    const wasStarted = S.started;
    S.playing = v; S.started = S.started || v;
    if (v) S.held = false;
    playBtn.innerHTML = v ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute('aria-label', v ? 'Pause' : 'Play');
    document.body.classList.toggle('paused', !v);
    poster.hidden = v || S.started;
    if (fromUser && wasStarted) pop(v ? ICON_PLAY : ICON_PAUSE);
    if (isLoop()) (v ? audioPlay() : audioPause());
    updatePauseCard(); poke();
  }
  /** Big centred icon that pops and fades, like a video player's on-screen display. */
  function pop(icon) {
    osd.innerHTML = icon;
    osd.classList.remove('pop'); void osd.offsetWidth; osd.classList.add('pop');
  }
  let seekTimer = 0;
  function seek(v, show) {
    if (isLoop()) { S.R = wrap(v); audioSeek(S.R); } else S.T = F.clamp(v, 0, TOTAL - 0.001);
    S.held = false; poke();
    // scrubbing away from the poster dismisses it: the viewer has started exploring
    if (!S.started && POS() > 0.5) { S.started = true; poster.hidden = true; }
    updatePauseCard();
    if (show) {
      const l = labelAt(POS());
      seekOsd.innerHTML = `<b>${F.time(POS())}</b> ${l.title}${l.sub ? ` · <span>${l.sub}</span>` : ''}`;
      // ride above the playhead, like a video player's scrub preview
      const r = track.getBoundingClientRect(), w = seekOsd.offsetWidth || 300, L = F.layout;
      seekOsd.style.left = F.clamp(r.left + xFromT(POS()), w / 2 + 12, L.W - w / 2 - 12) + 'px';
      seekOsd.classList.add('show');
      clearTimeout(seekTimer); seekTimer = setTimeout(() => seekOsd.classList.remove('show'), 900);
    }
  }
  function seekBeat(dir) {
    const i = beatIndexAt(S.T), b = beats[i];
    if (dir > 0) seek(i + 1 < beats.length ? beats[i + 1].at + 0.001 : TOTAL - 0.001, true);
    else seek(S.T - b.at > 1.2 || i === 0 ? b.at + 0.001 : beats[i - 1].at + 0.001, true);
  }
  function seekShot(dir) {
    const n = REEL.shots.length, sh = shotAt(S.R);
    const back = dir < 0 && S.R - sh.start > 0.8 ? 0 : dir;
    const to = REEL.shots[(sh.index + back + n) % n];
    // land just after the cut so a paused frame already shows its phrase
    seek(to.start + (S.playing ? 0.001 : Math.min(0.5, to.dur * 0.5)), true);
  }
  function seekScene(dir) {
    if (isLoop()) return seekShot(dir * 3);
    const s = sceneAt(S.T);
    const i = F.clamp(s.index + dir + (dir < 0 && S.T - s.start > 1.5 ? 1 : 0), 0, scenes.length - 1);
    seek(scenes[i].start + 0.001, true);
  }
  /** Presenter clicker / → : continue a held frame; otherwise go to the next beat and play it
      (it will hold again at its end). In Auto or Loop mode it simply jumps. */
  function advance() {
    if (isLoop()) return seekShot(1);
    if (S.held) return setPlaying(true, true);
    stepBeat(1);
  }
  function retreat() { if (isLoop()) return seekShot(-1); stepBeat(-1); }
  function stepBeat(dir) {
    const wasPlaying = S.playing;
    if (dir < 0 && S.held) seek(beats[Math.max(0, beatIndexAt(S.T) - 1)].at + 0.001, true); // held: back to the previous chart
    else seekBeat(dir);
    if (!S.auto) { if (!wasPlaying) setPlaying(true); }
    else if (!wasPlaying) S.T = Math.min(S.T + 1.6, TOTAL - 0.01); // paused in Auto: land where the caption is readable
  }
  F.userTookWheel = () => { if (S.playing) setPlaying(false); };
  F.play = () => setPlaying(true);
  F.seek = (v) => seek(v, true);

  playBtn.addEventListener('click', () => setPlaying(!S.playing, true));
  bigPlay.addEventListener('click', () => { setMode('presenter'); setPlaying(true, true); });
  $('.pm-loop').addEventListener('click', () => { setMode('loop'); seek(0); setPlaying(true, true); });
  chip.addEventListener('click', () => setPlaying(true, true));
  $('.t-prev').addEventListener('click', retreat);
  $('.t-next').addEventListener('click', advance);
  modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  autoBtn.addEventListener('click', () => { S.auto = !S.auto; autoBtn.setAttribute('aria-pressed', String(S.auto)); if (S.auto && S.held) setPlaying(true); });
  const speedBtn = $('.t-speed'), SPEEDS = [1, 1.5, 2, 0.5];
  speedBtn.addEventListener('click', () => {
    S.speed = SPEEDS[(SPEEDS.indexOf(S.speed) + 1) % SPEEDS.length]; speedBtn.textContent = S.speed + '×';
    if (M.audio) M.audio.playbackRate = S.speed;
  });
  $('.t-keys').addEventListener('click', () => { keysCard.hidden = !keysCard.hidden; musicCard.hidden = true; });
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}));
  $('.t-full').addEventListener('click', toggleFull);
  pauseCard.querySelector('h3 button').addEventListener('click', (e) => {
    const open = pauseCard.classList.toggle('collapsed') === false;
    e.currentTarget.setAttribute('aria-expanded', String(open));
    e.currentTarget.textContent = open ? 'Hide ▾' : 'How to read ▴';
  });

  function setMode(m) {
    if (m === S.mode) return;
    S.mode = m; S.held = false;
    document.body.dataset.mode = m;
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    if (m !== 'loop') { audioPause(); musicCard.hidden = true; }
    else if (S.playing) audioPlay();
    buildTrack();
    track.setAttribute('aria-valuemax', Math.round(LEN()));
    lastCapKey = ''; itKey = ''; lastShot = -1; S.scene = null;
    scenes.forEach((s) => setStyle(s.el, '', '', '50% 50%', 'none'));
    if (history.replaceState && S.started) { try { history.replaceState(null, '', m === 'loop' ? '#loop' : location.pathname + location.search); } catch (e) { /* ignore */ } }
    updatePauseCard(); poke();
  }

  // homework lens chips
  document.querySelectorAll('.lens button').forEach((b) => b.addEventListener('click', () => F.set('lens', b.dataset.hw || null)));
  const syncLens = () => document.querySelectorAll('.lens button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.hw || null) === F.state.lens)));
  F.on('lens', syncLens); syncLens();

  // click empty stage = play/pause, like a video (with a ripple where you clicked)
  film.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('button, a, input, label, .hit, [data-interactive], .ctrls, .pause-card, .keys-card, .music-card, .transport, .hud-top, .poster')) return;
    if (t.matches('svg.viz, canvas, .scene, .html-layer, .backdrop, #scenes, #film, .caption, .caption *, .intertitle, .intertitle *')) {
      const r = document.createElement('i'); r.className = 'ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      film.appendChild(r); setTimeout(() => r.remove(), 800);
      setPlaying(!S.playing, true);
    }
  });
  // wheel / trackpad scrubs the film, like a scroll-driven story
  film.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.target.closest('.music-card, .keys-card')) return;
    e.preventDefault();
    if (S.playing) setPlaying(false);
    seek(POS() + (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 0.12 : 0.0042), true);
  }, { passive: false });
  // touch swipe scrubs on phones
  let touchY = null;
  film.addEventListener('touchstart', (e) => { if (!e.target.closest('.transport, .hud-top, .ctrls, .music-card')) touchY = e.touches[0].clientY; }, { passive: true });
  film.addEventListener('touchmove', (e) => { if (touchY === null) return; const y = e.touches[0].clientY; if (S.playing) setPlaying(false); seek(POS() + (touchY - y) * 0.02, true); touchY = y; }, { passive: true });
  film.addEventListener('touchend', () => (touchY = null));

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.matches && e.target.matches('input')) return; // typing a tempo, dragging a slider
    const k = e.key;
    if (k === ' ' || k === 'k') { e.preventDefault(); setPlaying(!S.playing, true); }
    else if (k === 'ArrowRight' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); e.shiftKey ? seek(POS() + 5, true) : advance(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); e.shiftKey ? seek(POS() - 5, true) : retreat(); }
    else if (k === ']') seekScene(1);
    else if (k === '[') seekScene(-1);
    else if (k === '.') { setPlaying(false); seek(POS() + 1 / 30, true); }
    else if (k === ',') { setPlaying(false); seek(POS() - 1 / 30, true); }
    else if (k === 'h') document.body.classList.toggle('hide-ui');
    else if (k === 'f') toggleFull();
    else if (k === 'p') setMode('presenter');
    else if (k === 'l') setMode(isLoop() ? 'presenter' : 'loop');
    else if (k === 'a') autoBtn.click();
    else if (k === '?') keysCard.hidden = !keysCard.hidden;
    else if (k === 'Escape') { keysCard.hidden = true; musicCard.hidden = true; F.set('selected', null); }
    else if (k === 'Home') seek(0, true);
    else if (k === 'End') seek(LEN() - 0.01, true);
    else if (/^[1-9]$/.test(k) && !isLoop() && scenes[+k - 1]) seek(scenes[+k - 1].start + 0.001, true);
  });

  // idle: hide chrome while the film plays untouched
  let idleTimer = 0;
  function poke() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (S.playing && !dragging && musicCard.hidden) document.body.classList.add('idle'); }, 2600);
  }
  window.addEventListener('pointermove', poke, { passive: true });

  window.addEventListener('resize', () => {
    if (!window.innerWidth || !window.innerHeight) return; // hidden pane / minimised: keep the last layout
    F.computeLayout(); P.resize();
    scenes.forEach((s) => s.resize && s.resize(F.layout));
    placeCaption(); lastCapKey = ''; itKey = ''; measureTrack();
  });

  // ── soundtrack (Loop mode): the viewer's own local file drives the reel clock ──
  const M = { audio: null, url: null, offset: 0, taps: [], section: false }; // section: loop exactly one reel length of the track
  function audioPlay() { if (M.audio && isLoop()) { M.audio.playbackRate = S.speed; const p = M.audio.play(); if (p) p.catch(() => {}); } }
  function audioPause() { if (M.audio) M.audio.pause(); }
  function audioSeek(R) {
    if (!M.audio || !isFinite(M.audio.duration)) return;
    const cyc = M.section ? 0 : Math.max(0, Math.floor((M.audio.currentTime - M.offset) / REEL.len));
    M.audio.currentTime = F.clamp(cyc * REEL.len + R + M.offset, 0, Math.max(0, M.audio.duration - 0.05));
  }
  function setTempo(bpm) {
    const R0 = S.R / REEL.len; // keep the same place in the reel
    REEL.bpm = F.clamp(bpm, 50, 220); retime();
    S.R = wrap(R0 * REEL.len);
    musicCard.querySelector('.mc-bpm').value = REEL.bpm.toFixed(1).replace(/\.0$/, '');
    if (isLoop()) { buildTrack(); track.setAttribute('aria-valuemax', Math.round(LEN())); }
  }
  musicBtn.addEventListener('click', () => { musicCard.hidden = !musicCard.hidden; keysCard.hidden = true; poke(); });
  musicCard.querySelector('input[type=file]').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    if (M.audio) { M.audio.pause(); URL.revokeObjectURL(M.url); }
    M.url = URL.createObjectURL(file);
    M.audio = new Audio(M.url); M.audio.loop = true; M.audio.preload = 'auto';
    musicCard.querySelector('.mc-name').textContent = file.name;
    musicBtn.setAttribute('aria-pressed', 'true');
    // the reel was cut to one song: recognise it and lock to the 32 bars the edit follows
    const song = REEL.song && REEL.song.match.test(file.name) ? REEL.song : null;
    M.section = !!song;
    if (song) { setTempo(song.bpm); setOffset(song.start); }
    musicCard.querySelector('.mc-sync').textContent = song
      ? `Synced: ${song.title}, bars 104–135 (${F.time(song.start)}–${F.time(song.start + REEL.len)}), looping with the reel.`
      : 'Set the tempo and the time of a downbeat to lock the cuts to this track.';
    S.R = 0;
    M.audio.addEventListener('loadedmetadata', () => { M.audio.currentTime = Math.min(M.offset, M.audio.duration || 0); }, { once: true });
    if (S.playing) audioPlay();
  });
  musicCard.querySelector('.mc-bpm').addEventListener('change', (e) => setTempo(parseFloat(e.target.value) || 120));
  musicCard.querySelector('.mc-tap').addEventListener('click', () => {
    const now = performance.now() / 1000;
    if (M.taps.length && now - M.taps[M.taps.length - 1] > 2) M.taps = [];
    M.taps.push(now); if (M.taps.length > 9) M.taps.shift();
    if (M.taps.length >= 3) { const d = d3.median(M.taps.slice(1).map((t, i) => t - M.taps[i])); setTempo(60 / d); }
  });
  const offIn = musicCard.querySelector('.mc-off');
  function setOffset(v) { M.offset = Math.max(0, v); offIn.value = M.offset.toFixed(2); if (M.audio && isFinite(M.audio.duration)) audioSeek(S.R); }
  offIn.addEventListener('change', () => setOffset(parseFloat(offIn.value) || 0));
  musicCard.querySelectorAll('.mc-nudge').forEach((b) => b.addEventListener('click', () => setOffset(M.offset + parseFloat(b.dataset.d))));
  musicCard.querySelector('.mc-clear').addEventListener('click', () => {
    if (M.audio) { M.audio.pause(); URL.revokeObjectURL(M.url); }
    M.audio = null; M.section = false; musicBtn.setAttribute('aria-pressed', 'false'); musicCard.querySelector('.mc-name').textContent = 'Choose a track…';
    musicCard.querySelector('.mc-sync').textContent = '';
  });

  // ── captions ─────────────────────────────────────────────────────
  function placeCaption() {
    const c = F.layout.caption;
    cap.style.left = c.x + 'px'; cap.style.width = c.w + 'px';
    document.documentElement.style.setProperty('--cap-w', c.w + 'px');
    if (F.layout.narrow) { cap.style.top = 'auto'; cap.style.bottom = (F.layout.H - c.y - c.h) + 'px'; }
    else { cap.style.bottom = 'auto'; cap.style.top = '0px'; }
  }
  placeCaption();
  /** Wrap each word of the title in a span, preserving inline markup like <em>. */
  function splitWords(html) {
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
            else { const sp = document.createElement('span'); sp.className = 'w'; sp.textContent = part; frag.appendChild(sp); }
          });
          n.replaceWith(frag);
        } else if (n.nodeName === 'BR') { /* keep */ } else walk(n);
      });
    };
    walk(tmp); return tmp.innerHTML;
  }
  let lastCapKey = '', words = [], kickerText = '', kickerShown = '';
  /** Swap caption content; its height is measured here once, never per frame. */
  function setCaption(key, mode, kicker, title, body, credit, align) {
    lastCapKey = key;
    cap.dataset.mode = mode || '';
    kickerText = kicker || ''; kickerShown = '';
    capT.innerHTML = splitWords(title || '');
    capB.innerHTML = body || '';
    capC.innerHTML = credit || ''; capC.hidden = !credit;
    words = [...capT.querySelectorAll('.w')];
    if (!F.layout.narrow) {
      const c = F.layout.caption, h = cap.offsetHeight;
      cap.style.top = Math.max(c.y, c.y + (c.h - h) * (align ?? 0.46)) + 'px';
    }
  }
  function animateCaption(tb, out, slam, bodyDelay) {
    const kt = F.decode(kickerText, F.seg(tb, 0, 0.75), Math.floor(tb * 30));
    if (kt !== kickerShown) { capK.textContent = kt; kickerShown = kt; }
    capK.style.setProperty('--k', F.seg(tb, 0, 0.7, F.ease.outExpo));
    capK.style.opacity = kickerText ? F.seg(tb, 0, 0.3) * (1 - out) : 0;
    words.forEach((w, i) => {
      const p = F.seg(tb, 0.08 + i * slam, 0.08 + i * slam + 0.75, F.ease.outExpo);
      w.style.opacity = p * (1 - out);
      w.style.transform = `translateY(${(1 - p) * 0.42}em) scale(${1 + (1 - p) * 0.08})`;
      w.style.filter = p < 0.99 ? `blur(${(1 - p) * 10}px)` : 'none';
    });
    const pb = F.seg(tb, bodyDelay, bodyDelay + 0.85, F.ease.out);
    capB.style.opacity = pb * (1 - out);
    capB.style.transform = `translateY(${(1 - pb) * 12}px)`;
    capC.style.opacity = F.seg(tb, 1.4, 2.4) * (1 - out);
  }
  function renderCaption(s, t) {
    const bi = s.beats.reduce((k, b, j) => (t >= b.at ? j : k), 0);
    const b = s.beats[bi], next = s.beats[bi + 1];
    const key = s.id + ':' + bi;
    if (key !== lastCapKey) {
      setCaption(key, s.captionMode, b.kicker ?? s.kicker ?? '', b.title, b.body, b.credit, s.captionAlign);
      if (s.onBeat) s.onBeat(bi);
    }
    const raw = t - b.at, bdur = (next ? next.at : s.duration) - b.at;
    // the first beat of a chapter waits for its intertitle to land
    const tb = raw - (bi === 0 && s.it ? 0.95 : 0);
    const isLast = s.index === scenes.length - 1 && !next;
    const out = isLast ? 0 : F.seg(raw, bdur - 0.45, bdur - 0.02, F.ease.in);
    const slam = s.captionMode === 'hero' ? 0.11 : 0.055;
    animateCaption(tb, out, slam, 0.45 + words.length * slam * 0.6);
  }
  function renderReelCaption(sh, el) {
    const key = 'reel:' + sh.index;
    if (key !== lastCapKey) setCaption(key, 'reel', sh.sc.it ? sh.sc.title : '', sh.say || '', '', '', 0.5);
    const next = REEL.shots[(sh.index + 1) % REEL.shots.length];
    const out = next.say === sh.say && sh.say ? 0 : F.seg(el, sh.dur - 0.16, sh.dur, F.ease.in);
    animateCaption(el * 1.6, out, 0.045, 9);
  }

  // ── chapter intertitle: slams in centre-stage, then settles behind the caption ──
  let itKey = '', itBox = { w: 0, h: 0 }, itWordShown = '';
  function renderIntertitle(s, t, active) {
    if (!active || !s.it) { itEl.style.opacity = 0; return; }
    const L = F.layout;
    if (itKey !== s.id) {
      itKey = s.id; itNum.textContent = s.it.num;
      itBox = { w: itNum.offsetWidth, h: itNum.offsetHeight };
    }
    itEl.style.opacity = 1;
    const p = F.seg(t, 0, 0.55, F.ease.outExpo), q = F.seg(t, 1.05, 1.95, F.ease.inOut);
    const cx = L.narrow ? L.W / 2 : L.chart.x + L.chart.w / 2, cy = L.narrow ? L.chart.y + L.chart.h / 2 : L.top + (L.H - L.top - L.bottom) / 2;
    const k = L.narrow ? 0.42 : 0.56;
    const sx = L.caption.x + (itBox.w * k) / 2 - itBox.w * k * 0.06;
    const sy = L.narrow ? L.caption.y + (itBox.h * k) / 2 - 18 : L.caption.y + L.caption.h * 0.16;
    const x = F.lerp(cx, sx, q), y = F.lerp(cy, sy, q), sc = F.lerp(1.2 - 0.2 * p, k, q);
    itNum.style.transform = `translate(${x - itBox.w / 2}px, ${y - itBox.h / 2}px) scale(${sc})`;
    itNum.style.opacity = p * F.lerp(0.95, 0.075, q);
    const wp = p * (1 - F.seg(t, 0.95, 1.35));
    const wt = F.decode(s.it.word, F.seg(t, 0.05, 0.75), Math.floor(t * 30));
    if (wt !== itWordShown) { itWord.textContent = wt; itWordShown = wt; }
    itWord.style.opacity = wp;
    itWord.style.letterSpacing = `${F.lerp(1.1, 0.55, p)}em`;
    itWord.style.transform = `translate(${cx}px, ${cy + itBox.h * 0.5 + 18}px) translateX(-50%)`;
    const lw = L.W * 0.6 * p;
    itLine.style.width = lw + 'px';
    itLine.style.transform = `translate(${cx - lw / 2}px, ${cy + itBox.h * 0.46}px)`;
    itLine.style.opacity = p * (1 - F.seg(t, 0.8, 1.25));
  }

  // ── pause card + continue chip ───────────────────────────────────
  function updatePauseCard() {
    const s = S.scene || scenes[0];
    pauseCard.querySelector('.pc-how').innerHTML = s.howto || '';
    pauseCard.classList.toggle('show', !S.playing && S.started);
    chip.hidden = !(S.held && !S.playing && !isLoop());
  }

  // ── scene transitions (story) ────────────────────────────────────
  function focusOf(s) {
    const L = F.layout, f = s.focus ? s.focus() : null;
    return f || [L.chart.x + L.chart.w / 2, L.chart.y + L.chart.h / 2];
  }
  function setStyle(el, op, tf, origin, clip) {
    el.style.opacity = op; el.style.transform = tf || ''; el.style.transformOrigin = origin || '50% 50%';
    el.style.clipPath = clip || 'none'; el.style.webkitClipPath = clip || 'none';
  }
  const still = (s) => setStyle(s.el, 1, '', '50% 50%', 'none');
  function applyTransition(s, pIn, pOut) {
    const el = s.el, L = F.layout;
    let op = 1, tf = '', clip = 'none', origin = '50% 50%';
    if (pOut > 0) {
      // zoom-through: the outgoing scene rushes toward the camera around its focal point
      const [fx, fy] = focusOf(s);
      origin = `${fx}px ${fy}px`; op = 1 - pOut; tf = `scale(${1 + 0.55 * pOut * pOut})`;
    } else if (pIn < 1) {
      const kind = s.enter || 'rise';
      if (kind === 'rise') { op = pIn; tf = `translateY(${(1 - pIn) * 46}px)`; }
      else if (kind === 'zoom') { op = pIn; tf = `scale(${1.12 - 0.12 * pIn})`; }
      else if (kind === 'wipe') { clip = `inset(0 ${(1 - pIn) * 100}% 0 0)`; }
      else if (kind === 'iris') { clip = `circle(${pIn * 140}% at 62% 50%)`; op = F.clamp(pIn * 3); }
      else if (kind === 'blinds') {
        // venetian-blind reveal: ten horizontal slats open top to bottom, one polygon
        const n = 10, pts = [];
        for (let i = 0; i < n; i++) {
          const q = F.ease.out(F.clamp(pIn * 1.7 - (i / n) * 0.7)), y0 = (i / n) * 100, h = (100 / n) * q + (q > 0 ? 0.05 : 0);
          pts.push(`0% ${y0.toFixed(2)}%`, `100% ${y0.toFixed(2)}%`, `100% ${(y0 + h).toFixed(2)}%`, `0% ${(y0 + h).toFixed(2)}%`);
        }
        clip = `polygon(${pts.join(',')})`;
      }
      else op = pIn;
    }
    setStyle(el, op, tf, origin, clip);
    if (s.enter === 'wipe' && pIn < 1 && pOut === 0) { wipe.style.opacity = Math.sin(Math.PI * pIn); wipe.style.transform = `translateX(${pIn * L.W}px)`; }
  }

  // ── story frame ──────────────────────────────────────────────────
  let lastCut = -1;
  function renderStory(dt) {
    const s = sceneAt(S.T), t = S.T - s.start;
    if (S.scene !== s) {
      S.scene = s;
      glowAurora.style.setProperty('--tint', s.tint || 'rgba(57,135,229,.10)');
      // file:// pages have an opaque origin; some browsers refuse replaceState there
      if (history.replaceState && S.started) { try { history.replaceState(null, '', '#' + s.id); } catch (e) { /* keep playing */ } }
      updatePauseCard();
    }
    setLabel(s.title);

    // rewind montage (requested by a scene): hard cuts through earlier scenes, played backwards
    const Mo = s.montage, inMontage = !!Mo && t < Mo.dur;
    let cut = null;
    if (inMontage) {
      const n = Mo.cuts.length, cd = Mo.dur / n, i = Math.min(n - 1, Math.floor(t / cd));
      const [id, ct] = Mo.cuts[i];
      cut = { scene: byId[id], t: Math.max(0.01, ct - (t - i * cd) * 1.8) };
      if (i !== lastCut) { lastCut = i; cut.scene.onBeat && cut.scene.onBeat(-1); }
    } else lastCut = -1;

    const prev = s.index > 0 ? scenes[s.index - 1] : null;
    const pIn = s.index === 0 ? 1 : Mo ? F.seg(t, Mo.dur, Mo.dur + 1.1, F.ease.inOut) : F.seg(t, 0, TRANS_IN, F.ease.inOut);
    const pOut = prev && !Mo ? F.seg(t, 0, TRANS_OUT, F.ease.in) : 1;
    wipe.style.opacity = 0;
    const env = { dt, T: S.T, playing: S.playing };
    scenes.forEach((sc) => {
      const isCut = !!cut && sc === cut.scene;
      const isCur = sc === s && !inMontage;
      const isPrev = sc === prev && pOut < 1 && !isCut;
      sc.el.classList.toggle('on', isCut || isCur || isPrev);
      if (isCut) { still(sc); sc.render(cut.t, { ...env, enter: 1, montage: true }); }
      else if (isCur) { applyTransition(sc, pIn, 0); sc.render(t, { ...env, enter: pIn }); }
      else if (isPrev) { applyTransition(sc, 1, pOut); sc.render(sc.duration - 0.001, { ...env, enter: 1, leaving: pOut }); }
    });

    // cut flashes and letterbox bars
    let fl = 0, lb = 0;
    if (inMontage) {
      const n = Mo.cuts.length, cd = Mo.dur / n;
      fl = 0.35 * Math.max(0, 1 - (t % cd) / 0.12);
      lb = F.seg(t, 0, 0.35);
    } else if (Mo) {
      fl = 0.95 * Math.max(0, 1 - Math.abs(t - Mo.dur - 0.08) / 0.5);
      lb = 1 - F.seg(t, Mo.dur + 0.2, Mo.dur + 1.2);
    } else if (s.index > 0) {
      fl = (s.flash ? 0.9 : 0.3) * Math.sin(Math.PI * F.clamp(t / 0.75)) * (t < 0.75 ? 1 : 0);
      lb = Math.sin(Math.PI * F.seg(t, 0, 2.1, F.ease.linear));
    }
    flash.style.opacity = fl;
    setBars(lb);
    vhs.style.opacity = inMontage ? 1 : 0;
    if (cut) vhsTc.textContent = F.time(cut.scene.start + cut.t);

    renderIntertitle(s, t, !inMontage);

    let o;
    if (cut) o = P.resolve(cut.scene, cut.t, S.T, null);
    else if (Mo) { const [id, ct] = Mo.cuts[Mo.cuts.length - 1]; o = P.resolve(s, t, S.T, { scene: byId[id], t: Math.max(0.01, ct - (Mo.dur / Mo.cuts.length) * 1.8) }); }
    else o = P.resolve(s, t, S.T, prev ? { scene: prev, t: prev.duration } : null);
    P.draw(o, S.T);
    renderCaption(s, t);
  }

  // ── loop frame: shots on a beat grid ─────────────────────────────
  let lastShot = -1;
  function renderLoop(dt) {
    const n = REEL.shots.length, bl = REEL.beatLen;
    const sh = shotAt(S.R), el = S.R - sh.start, u = F.clamp(el / sh.dur);
    const prevSh = REEL.shots[(sh.index - 1 + n) % n];
    const t = sh.from + (sh.to - sh.from) * (WARP[sh.warp] || WARP.linear)(u);
    const cut = sh.cut || (prevSh.scene !== sh.scene ? 'cut' : 'none');
    if (sh.index !== lastShot) {
      lastShot = sh.index;
      sh.sc.onBeat && sh.sc.onBeat(-1); // the director's view: clear viewer overrides
      sh.sc.snap && sh.sc.snap();
      glowAurora.style.setProperty('--tint', sh.sc.tint || 'rgba(57,135,229,.10)');
      S.scene = sh.sc; updatePauseCard();
    }
    setLabel(sh.sc.title);

    // cut styles: punch-in, whip pan, or a particle morph with a short cross-dissolve
    const p = F.seg(el, 0, cut === 'whip' ? 0.3 : 0.4, F.ease.outExpo), xf = F.seg(el, 0, 0.45);
    const outgoing = prevSh.sc !== sh.sc && ((cut === 'morph' && xf < 1) || (cut === 'whip' && el < 0.24));
    const env = { dt, T: S.R, playing: S.playing, enter: 1, reel: true };
    let fl = 0;
    wipe.style.opacity = 0;
    scenes.forEach((sc) => {
      const isCur = sc === sh.sc, isPrev = outgoing && sc === prevSh.sc;
      sc.el.classList.toggle('on', isCur || isPrev);
      if (isCur) {
        if (cut === 'cut') setStyle(sc.el, 1, `scale(${1 + 0.06 * (1 - p)})`);
        else if (cut === 'whip') setStyle(sc.el, F.clamp(p * 2.2), `translateX(${(1 - p) * 16}%)`);
        else if (cut === 'morph' && prevSh.sc !== sh.sc) setStyle(sc.el, xf, '');
        else still(sc);
        sc.render(t, env);
      } else if (isPrev) {
        const q = cut === 'whip' ? F.seg(el, 0, 0.22, F.ease.in) : xf;
        setStyle(sc.el, 1 - q, cut === 'whip' ? `translateX(${-q * 16}%)` : '');
        sc.render(prevSh.to, env);
      }
    });
    if (cut === 'cut') fl = 0.5 * Math.max(0, 1 - el / 0.16);
    if (cut === 'whip') { fl = 0.25 * Math.max(0, 1 - el / 0.2); wipe.style.opacity = Math.sin(Math.PI * p) * 0.9; wipe.style.transform = `translateX(${(1 - p) * F.layout.W}px)`; }

    // the beat: a pulse on every beat, stronger on each bar's downbeat
    const bi = Math.floor(S.R / bl + 1e-6), ph = S.R - bi * bl;
    const pulse = Math.exp(-ph / 0.09) * (bi % 32 === 0 ? 1.8 : bi % 4 === 0 ? 1 : 0.5); // phrase > bar > beat
    flash.style.opacity = Math.max(fl, 0.09 * pulse);
    setBars(0.55 + 0.25 * pulse * (bi % 4 === 0 ? 1 : 0));
    vhs.style.opacity = 0;
    renderIntertitle(sh.sc, 0, false);

    // particles travel from where the previous shot left them
    const blendBeats = sh.blend ?? (cut === 'morph' ? 3 : cut === 'whip' ? 1 : cut === 'cut' ? 0.7 : Math.abs(sh.from - prevSh.to) > 0.05 ? 0.6 : 0);
    const tau = blendBeats ? el / (blendBeats * bl) : 1;
    const o = tau < 1
      ? P.crossfade({ scene: prevSh.sc, t: prevSh.to }, { scene: sh.sc, t }, S.R, tau, 0.45, cut === 'morph' ? 1 : 0.35)
      : P.resolve(sh.sc, t, S.R, null);
    o.glow = Math.max(o.glow, 0.35 * pulse);
    P.draw(o, S.R, 0.3);
    renderReelCaption(sh, el);
  }

  // the chapter label decodes on the wall clock whenever it changes (paused frames resolve too)
  let lastLabel = '', labelTitle = '', labelT0 = 0;
  function setLabel(title) {
    if (title !== labelTitle) { labelTitle = title; labelT0 = F.wallT || 0; }
    const e = (F.wallT || 0) - labelT0;
    const label = F.decode(title, F.seg(e, 0, 0.8), Math.floor(e * 30));
    if (label !== lastLabel) { chapterLabel.textContent = label; lastLabel = label; }
  }
  function setBars(v) { lbTop.style.transform = `scaleY(${v})`; lbBot.style.transform = `scaleY(${v})`; }

  // ── main loop ────────────────────────────────────────────────────
  let last = performance.now(), lastMx = -1, lastMy = -1, frameNo = 0;
  function frame(now) {
    requestAnimationFrame(frame); // schedule first: one bad frame must never stop the film
    const dt = Math.min(0.05, (now - last) / 1000); last = now; frameNo++;
    F.wallT = now / 1000;
    // clock
    if (isLoop()) {
      if (M.audio && !M.audio.paused) {
        // the music is the clock; in section mode the track loops with the reel, bar for bar
        if (M.section && M.audio.currentTime >= M.offset + REEL.len) M.audio.currentTime -= REEL.len;
        S.R = wrap(M.audio.currentTime - M.offset);
      }
      else if (S.playing) S.R = wrap(S.R + dt * S.speed);
    } else if (S.playing) {
      const prevT = S.T;
      let T = S.T + dt * S.speed;
      if (!S.auto) {
        const stop = beats.find((b) => !b.beat.noStop && prevT < b.end - HOLD_LEAD && T >= b.end - HOLD_LEAD);
        if (stop) { T = stop.end - HOLD_LEAD; S.T = T; S.held = true; setPlaying(false); }
      }
      if (T >= TOTAL) { T = TOTAL - 0.001; setPlaying(false); }
      S.T = T;
    }
    for (const h of F.HW) F.lensA[h] = F.approach(F.lensA[h], F.lensAlpha(h), dt, 8);
    const L = F.layout;

    // cursor light + parallax source (smoothed); both glows move on the compositor only
    const mx = P.mouse.x > -1e3 ? P.mouse.x : L.W / 2, my = P.mouse.y > -1e3 ? P.mouse.y : L.H / 2;
    P.mouseS.x = F.approach(P.mouseS.x, mx, dt, 4); P.mouseS.y = F.approach(P.mouseS.y, my, dt, 4);
    if (Math.abs(P.mouseS.x - lastMx) > 0.5 || Math.abs(P.mouseS.y - lastMy) > 0.5) {
      lastMx = P.mouseS.x; lastMy = P.mouseS.y;
      glowCursor.style.transform = `translate3d(${lastMx.toFixed(1)}px, ${lastMy.toFixed(1)}px, 0)`;
    }
    if (frameNo % 2 === 0) { // slow aurora drift of the scene tint
      const w = F.wallT;
      glowAurora.style.transform = `translate3d(${(L.W * (0.72 + 0.09 * Math.sin(w * 0.11))).toFixed(1)}px, ${(L.H * (0.32 + 0.12 * Math.cos(w * 0.083))).toFixed(1)}px, 0)`;
    }

    if (isLoop()) renderLoop(dt); else renderStory(dt);

    // transport
    const v = POS(), len = LEN();
    timeEl.textContent = `${isLoop() ? '⟳ ' : ''}${F.time(v)} / ${F.time(len)}`;
    const cur = segIndexAt(v);
    segEls.forEach((e, i) => {
      const it = segItems[i];
      e.firstChild.style.transform = `scaleX(${F.clamp((v - it.start) / it.dur)})`;
      e.classList.toggle('cur', i === cur);
    });
    head.style.left = xFromT(v) + 'px';
    track.setAttribute('aria-valuenow', Math.round(v));
  }

  // ── start ────────────────────────────────────────────────────────
  track.setAttribute('aria-valuemin', 0);
  const params = new URLSearchParams(location.search);
  const wantLoop = params.has('loop') || location.hash === '#loop';
  const hashScene = scenes.find((s) => '#' + s.id === location.hash);
  if (wantLoop) S.mode = 'loop';
  document.body.dataset.mode = S.mode;
  modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
  if (!wantLoop && params.has('t')) S.T = F.clamp(parseFloat(params.get('t')) || 0, 0, TOTAL - 0.01);
  else if (!wantLoop && hashScene) S.T = hashScene.start + (hashScene.landing ?? 2.2);
  if (params.has('auto')) { S.auto = true; autoBtn.setAttribute('aria-pressed', 'true'); }
  buildTrack();
  track.setAttribute('aria-valuemax', Math.round(LEN()));
  // a deep link opens paused on that frame; otherwise the poster waits for Play (?autoplay skips it)
  S.started = POS() > 1;
  setPlaying(false);
  requestAnimationFrame(frame);
  const go = () => {
    P.invalidate(); itKey = ''; // re-measure the intertitle once web fonts are in
    scenes.forEach((s) => s.resize && s.resize(F.layout)); // text metrics changed with the web fonts
    measureTrack(); lastCapKey = '';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && params.has('autoplay') && POS() < 1) setPlaying(true);
    else { poster.hidden = S.started; updatePauseCard(); }
  };
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]).then(go);
  else go();
})();
