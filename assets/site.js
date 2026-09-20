(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const chapters = [...document.querySelectorAll('.story-chapter')];
  const hero = $('.hero-track');
  const material = $('.material-scene');
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
  let current = 0;

  function paintPose(from, to, progress) {
    const p = ease(progress);
    const values = from.map((value, i) => value + (to[i] - value) * p);
    material.style.setProperty('--world-x', `${values[0]}px`);
    material.style.setProperty('--world-y', `${values[1]}px`);
    material.style.setProperty('--world-rotate', `${values[2]}deg`);
    material.style.setProperty('--world-scale', values[3]);
    material.style.setProperty('--world-opacity', values[4]);
  }

  function updateScroll() {
    scrollFrame = 0;
    const midpoint = innerHeight * .5;
    const visible = chapters.findIndex(chapter => {
      const rect = chapter.getBoundingClientRect();
      return rect.top <= midpoint && rect.bottom > midpoint;
    });
    current = visible >= 0 ? visible : scrollY < chapters[0].offsetTop ? 0 : chapters.length - 1;
    document.body.dataset.scene = String(current);
    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(1, rect.height - innerHeight));
      const expansion = ease(progress / .46);
      chapter.style.setProperty('--figure-scale', String(.72 + .36 * expansion));
      chapter.style.setProperty('--figure-y', `${48 * (1 - expansion)}px`);
      chapter.style.setProperty('--figure-opacity', String(.65 + .35 * expansion));
    }
    if (!motion) return;
    if (scrollY < chapters[0].offsetTop) {
      paintPose(poses[0], poses[1], scrollY / Math.max(1, hero.offsetHeight));
    } else {
      const rect = chapters[current].getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(1, rect.height - innerHeight));
      paintPose(poses[current + 1], poses[Math.min(current + 2, 4)], progress);
    }
  }
  function queueScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
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
      if (event.button !== 0 || !finePointer.matches) return;
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
    const colors = ['#c5d9d3', '#bdcddc', '#d0c6d8', '#d9cbbd'];
    context.strokeStyle = context.shadowColor = colors[current];
    context.shadowBlur = 16;
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
    points = points.slice(-40);
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
    if (!motion) clearTrail();
    if (anchor) scrollBy({top: anchor.getBoundingClientRect().top - before, behavior: 'instant'});
    updateScroll();
  }
  $('#motion-toggle').addEventListener('click', () => { requestedMotion = !requestedMotion; updateMotion(true); });
  reduced.addEventListener('change', () => updateMotion(true));
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    updateScroll();
  }
  addEventListener('resize', resize);
  // Initial fragment navigation must use the final chapter heights, without a
  // long smooth scroll racing the browser's reload position restoration.
  addEventListener('pageshow', event => {
    if (event.persisted) return;
    requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView({behavior: 'instant', block: 'start'});
      updateScroll();
    });
  });
  addEventListener('blur', () => { cancelHold(); clearTrail(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelHold(); clearTrail(); } });
  updateMotion();
  resize();
})();
