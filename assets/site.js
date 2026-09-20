(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const cards = [...document.querySelectorAll('[data-card]')];
  const copies = [...document.querySelectorAll('[data-copy]')];
  const links = [...document.querySelectorAll('[data-index]')];
  const names = ['Timing', 'Retries', 'First to best', 'Actual attempt scores'];
  const journey = $('#journey');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  let current = 0;
  let requestedMotion = true;
  let motion = !reduced.matches;
  let departureTimer;
  function showScene(index) {
    if (index === current) return;
    clearTimeout(departureTimer);
    cards.forEach(card => card.classList.remove('departing'));
    cards[current].classList.add('departing');
    current = index;
    document.body.dataset.scene = String(index);
    cards.forEach((card, i) => {
      card.classList.toggle('active', i === index);
      card.setAttribute('aria-hidden', String(i !== index));
      copies[i].hidden = i !== index;
      copies[i].classList.toggle('entering', i === index);
      links[i].setAttribute('aria-pressed', String(i === index));
    });
    $('#scene-counter').textContent = `0${index + 1} / 04 · ${names[index]}`;
    $('#scene-progress').style.width = `${(index + 1) * 25}%`;
    $('#previous').disabled = index === 0;
    $('#next').disabled = index === 3;
    departureTimer = setTimeout(() => cards.forEach(card => card.classList.remove('departing')), 1000);
  }
  function scrollState() {
    const range = Math.max(1, journey.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, (scrollY - journey.offsetTop) / range));
    showScene(Math.min(3, Math.floor(progress * 4)));
    document.body.classList.toggle('reading-details', scrollY > journey.offsetTop + journey.offsetHeight);
    $('.deck').style.setProperty('--expand', String(.92 + .08 * Math.min(1, (progress * 4 % 1) * 3)));
  }
  function goTo(index) {
    index = Math.max(0, Math.min(3, index));
    const range = Math.max(1, journey.offsetHeight - innerHeight);
    window.scrollTo({top: journey.offsetTop + (index + .15) / 4 * range, behavior: 'instant'});
    showScene(index);
  }
  links.forEach((button, index) => button.addEventListener('click', () => goTo(index)));
  $('#previous').disabled = true;
  $('#previous').addEventListener('click', () => goTo(current - 1));
  $('#next').addEventListener('click', () => goTo(current + 1));
  let scrollFrame = 0;
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; scrollState(); });
  }, {passive: true});
  const dialog = $('#focus-dialog');
  function openFocus() {
    const source = cards[current].querySelector('img');
    $('#focus-image').src = innerWidth <= 700 ? cards[current].querySelector('source').srcset : source.src;
    $('#focus-image').alt = source.alt;
    $('#focus-title').textContent = `Figure 0${current + 1} / ${names[current]}`;
    $('#focus-note').textContent = copies[current].querySelector('p').textContent;
    if (!dialog.open) dialog.showModal();
  }
  $('#open-focus').addEventListener('click', openFocus);
  $('#close-focus').addEventListener('click', () => dialog.close());
  const hold = $('#hold-focus');
  let holdFrame = 0;
  function cancelHold() {
    cancelAnimationFrame(holdFrame);
    holdFrame = 0;
    hold.style.setProperty('--hold', '0');
  }
  hold.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    cancelHold();
    hold.setPointerCapture(event.pointerId);
    const start = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - start) / 900);
      hold.style.setProperty('--hold', String(progress));
      if (progress < 1) holdFrame = requestAnimationFrame(step);
      else { cancelHold(); openFocus(); }
    };
    holdFrame = requestAnimationFrame(step);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(name => hold.addEventListener(name, cancelHold));
  hold.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openFocus(); }
  });
  const canvas = $('#cursor-light');
  const context = canvas.getContext('2d');
  let points = [];
  let trailFrame = 0;
  function clearTrail() {
    cancelAnimationFrame(trailFrame);
    trailFrame = 0;
    points = [];
    context.clearRect(0, 0, innerWidth, innerHeight);
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    scrollState();
  }
  function drawTrail(now) {
    points = points.filter(point => now - point.time < 550);
    context.clearRect(0, 0, innerWidth, innerHeight);
    const colors = ['#c5d9d3', '#bdcddc', '#d0c6d8', '#d9cbbd'];
    context.strokeStyle = colors[current];
    context.shadowColor = colors[current];
    context.shadowBlur = 18;
    context.lineCap = 'round';
    for (let i = 1; i < points.length; i++) {
      const age = 1 - (now - points[i].time) / 550;
      context.globalAlpha = age * .7;
      context.lineWidth = 2 + age * 5;
      context.beginPath();
      context.moveTo(points[i - 1].x, points[i - 1].y);
      context.lineTo(points[i].x, points[i].y);
      context.stroke();
    }
    context.globalAlpha = 1;
    trailFrame = points.length ? requestAnimationFrame(drawTrail) : 0;
  }
  addEventListener('pointermove', event => {
    if (!motion || !finePointer.matches || innerWidth <= 700) return;
    $('.depth-title').style.setProperty('--tilt-x', `${(event.clientY / innerHeight - .5) * -10}deg`);
    $('.depth-title').style.setProperty('--tilt-y', `${(event.clientX / innerWidth - .5) * 12}deg`);
    points.push({x: event.clientX, y: event.clientY, time: performance.now()});
    points = points.slice(-40);
    if (!trailFrame) trailFrame = requestAnimationFrame(drawTrail);
  }, {passive: true});
  function updateMotion() {
    motion = requestedMotion && !reduced.matches;
    document.body.classList.toggle('motion-off', !motion);
    document.documentElement.style.scrollBehavior = motion ? 'smooth' : 'auto';
    $('#motion-toggle').setAttribute('aria-pressed', String(motion));
    $('#motion-toggle span').textContent = reduced.matches ? 'Reduced motion' : `Motion ${motion ? 'on' : 'off'}`;
    $('#motion-toggle').disabled = reduced.matches;
    if (!motion) clearTrail();
  }
  $('#motion-toggle').addEventListener('click', () => {
    requestedMotion = !requestedMotion;
    updateMotion();
    if (motion) {
      $('.bell').classList.remove('ring');
      requestAnimationFrame(() => $('.bell').classList.add('ring'));
    }
  });
  reduced.addEventListener('change', updateMotion);
  addEventListener('resize', resize);
  addEventListener('blur', () => { cancelHold(); clearTrail(); });
  document.addEventListener('visibilitychange', () => { document.body.classList.toggle('document-hidden', document.hidden); if (document.hidden) { cancelHold(); clearTrail(); } });
  updateMotion();
  resize();
})();
