(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const chapters = [...document.querySelectorAll('.story-chapter')];
  const figures = [...document.querySelectorAll('.chapter-figure')];
  const hero = $('.hero-track');
  const material = $('.material-scene');
  const opening = $('.journey-opening');
  const evidence = $('#evidence');
  const progressLine = $('.reading-progress');
  const styleValues = new WeakMap();
  function setStyle(element, name, value) {
    const values = styleValues.get(element) || new Map();
    if (values.get(name) === value) return;
    element.style.setProperty(name, value);
    values.set(name, value);
    styleValues.set(element, values);
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const desktop = matchMedia('(min-width: 701px)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const poses = [
    [-100, 0, -12, 1.05, .95],
    [-390, -80, -28, 1.4, .30],
    [100, -150, 16, 1.55, .30],
    [-70, 100, -16, 1.45, .26],
    [230, -70, 22, 1.35, .30],
  ];
  let requestedMotion = true;
  let motion = !reduced.matches;
  let scrollFrame = 0;

  function paintPose(from, to, progress) {
    const p = ease(progress);
    const v = from.map((value, i) => value + (to[i] - value) * p);
    setStyle(material, 'transform', `translate3d(${v[0].toFixed(2)}px,${v[1].toFixed(2)}px,0) rotate(${v[2].toFixed(3)}deg) scale(${v[3].toFixed(4)})`);
    setStyle(material, 'opacity', v[4].toFixed(4));
  }

  let lastFrameTime = 0;
  let visualScroll = scrollY;
  function updateScroll(now = performance.now()) {
    scrollFrame = 0;
    // Read all geometry before touching styles. CSS transforms do not affect
    // these outer tracks, so the measurements remain independent of animation.
    const y = scrollY;
    const height = innerHeight;
    const rects = chapters.map(chapter => chapter.getBoundingClientRect());
    const figureRects = desktop.matches ? null : figures.map(figure => figure.getBoundingClientRect());
    const heroRect = hero.getBoundingClientRect();
    const openingRect = opening.getBoundingClientRect();
    const evidenceTop = evidence.getBoundingClientRect().top;
    const documentHeight = document.documentElement.scrollHeight;
    const elapsed = Math.min(64, Math.max(1, now - (lastFrameTime || now - 16)));
    lastFrameTime = now;
    // Ease decorative movement only; actual document scrolling stays native.
    visualScroll = motion ? visualScroll + (y - visualScroll) * (1 - Math.exp(-elapsed / 65)) : y;
    if (Math.abs(y - visualScroll) < .25) visualScroll = y;
    const delta = y - visualScroll;
    const surface = heroRect.bottom > 90 || evidenceTop < 70 ? 'paper' : 'dark';
    if (document.body.dataset.surface !== surface) document.body.dataset.surface = surface;
    setStyle(progressLine, 'transform', `scaleX(${clamp(y / Math.max(1, documentHeight - height)).toFixed(5)})`);
    const heroProgress = motion ? ease(-(heroRect.top + delta) / Math.max(1, heroRect.height - height)) : 0;
    setStyle(hero, '--hero-progress', heroProgress.toFixed(4));
    setStyle(hero, '--hero-rule', motion ? Math.max(.08, heroProgress).toFixed(4) : '1');
    setStyle(opening, '--interlude-x', motion ? `${((clamp((openingRect.top + delta) / height) - .3) * 80).toFixed(2)}px` : '0px');
    chapters.forEach((chapter, i) => {
      const reveal = motion ? ease((height - rects[i].top - delta) / (height * .95)) : 1;
      setStyle(chapter, '--chapter-reveal', reveal.toFixed(4));
      const figureReveal = motion && figureRects
        ? ease((height - figureRects[i].top - delta) / (height * .65)) : reveal;
      setStyle(chapter, '--entry', (1 - figureReveal).toFixed(4));
      setStyle(chapter, '--entry-flash', (4 * figureReveal * (1 - figureReveal)).toFixed(4));
      setStyle(chapter, '--copy-x', `${(-70 * (1 - reveal)).toFixed(2)}px`);
      setStyle(chapter, '--copy-y', `${(30 * (1 - reveal)).toFixed(2)}px`);
    });
    if (motion) {
      // Adjacent intervals share their endpoint: no midpoint pose resets.
      const anchors = [0, ...rects.map(rect => rect.top + y)];
      let segment = 0;
      while (segment < anchors.length - 2 && visualScroll > anchors[segment + 1]) segment++;
      paintPose(poses[segment], poses[segment + 1],
        (visualScroll - anchors[segment]) / Math.max(1, anchors[segment + 1] - anchors[segment]));
    }
    if (visualScroll !== y && !document.hidden) queueScroll();
  }
  function queueScroll() {
    if (!scrollFrame && !document.hidden) scrollFrame = requestAnimationFrame(updateScroll);
  }
  addEventListener('scroll', queueScroll, {passive: true});

  const dialog = $('#focus-dialog');
  function openFocus(button) {
    const image = button.closest('.story-chapter').querySelector('img');
    const file = button.dataset.figure + (desktop.matches ? '' : '-mobile');
    $('#focus-image').src = `assets/story/${file}.svg`;
    $('#focus-image').alt = image.alt;
    $('#focus-title').textContent = button.dataset.title;
    $('#focus-note').textContent = button.dataset.note;
    if (!dialog.open) dialog.showModal();
  }
  $('#close-focus').addEventListener('click', () => dialog.close());
  let holdFrame = 0;
  let heldButton = null;
  function cancelHold() {
    cancelAnimationFrame(holdFrame);
    holdFrame = 0;
    heldButton?.style.setProperty('--hold', '0');
    heldButton = null;
  }
  document.querySelectorAll('.focus-link').forEach(button => {
    button.addEventListener('click', () => openFocus(button));
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !finePointer.matches || !motion) return;
      cancelHold();
      heldButton = button;
      button.setPointerCapture(event.pointerId);
      const start = performance.now();
      function step(now) {
        const progress = clamp((now - start) / 900);
        button.style.setProperty('--hold', String(progress));
        if (progress < 1) holdFrame = requestAnimationFrame(step);
        else { cancelHold(); openFocus(button); }
      }
      holdFrame = requestAnimationFrame(step);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(event => button.addEventListener(event, cancelHold));
  });

  const canvas = $('#cursor-light');
  const context = canvas.getContext('2d');
  let points = [];
  let trailFrame = 0;
  function clearTrail() {
    cancelAnimationFrame(trailFrame);
    trailFrame = 0;
    points = [];
    context?.clearRect(0, 0, innerWidth, innerHeight);
  }
  function drawTrail(now) {
    if (!context) return;
    points = points.filter(point => now - point.time < 550);
    context.clearRect(0, 0, innerWidth, innerHeight);
    context.strokeStyle = '#e9a48d';
    context.shadowBlur = 0;
    context.lineCap = 'round';
    for (let i = 1; i < points.length; i++) {
      const age = 1 - (now - points[i].time) / 550;
      context.globalAlpha = age * .6;
      context.lineWidth = 2 + age * 4;
      context.beginPath();
      context.moveTo(points[i - 1].x, points[i - 1].y);
      context.lineTo(points[i].x, points[i].y);
      context.stroke();
    }
    context.globalAlpha = 1;
    trailFrame = points.length ? requestAnimationFrame(drawTrail) : 0;
  }
  addEventListener('pointermove', event => {
    if (!motion || !context || !finePointer.matches || !desktop.matches) return;
    points.push({x: event.clientX, y: event.clientY, time: performance.now()});
    points = points.slice(-20);
    if (!trailFrame) trailFrame = requestAnimationFrame(drawTrail);
  }, {passive: true});

  function updateMotion(preservePosition = false) {
    const anchor = preservePosition ? document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.chapter-stage,.hero-stage,section') : null;
    const before = anchor?.getBoundingClientRect().top;
    motion = requestedMotion && !reduced.matches;
    document.body.classList.toggle('motion-ready', motion);
    document.body.classList.toggle('motion-off', !motion);
    document.documentElement.style.scrollBehavior = motion ? 'smooth' : 'auto';
    $('#motion-toggle').setAttribute('aria-pressed', String(motion));
    $('#motion-toggle span').textContent = reduced.matches ? 'Reduced motion' : `Motion ${motion ? 'on' : 'off'}`;
    $('#motion-toggle').disabled = reduced.matches;
    if (!motion) { cancelHold(); clearTrail(); }
    if (anchor) scrollBy({top: anchor.getBoundingClientRect().top - before, behavior: 'instant'});
    visualScroll = scrollY;
    queueScroll();
  }
  $('#motion-toggle').addEventListener('click', () => { requestedMotion = !requestedMotion; updateMotion(true); });
  reduced.addEventListener('change', () => updateMotion(true));
  function resize() {
    const ratio = 1;
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    queueScroll();
  }
  addEventListener('resize', resize);
  // Initial fragment navigation must use the final chapter heights, without a
  // long smooth scroll racing the browser's reload position restoration.
  addEventListener('pageshow', event => {
    if (event.persisted) return;
    requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView({behavior: 'instant', block: 'start'});
      visualScroll = scrollY;
      queueScroll();
    });
  });
  addEventListener('blur', () => { cancelHold(); clearTrail(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelHold(); clearTrail(); cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
    else { visualScroll = scrollY; queueScroll(); }
  });
  updateMotion();
  resize();
})();
