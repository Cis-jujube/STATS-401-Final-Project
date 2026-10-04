/* Evidence companion → data film return path.
   Every figure section carries fixed, valid links back to the film (Core and/or Showcase), so the
   page works without JavaScript. When the reader arrived from the film
   (analysis.html?content=core|showcase#section), this highlights the route they came from and
   points the page's "Data film" links at the figure they were reading. No storage, no referrer. */
(function () {
  const q = new URLSearchParams(location.search).get('content');
  const route = q === 'core' || q === 'showcase' ? q : null;
  document.querySelectorAll('.film-return').forEach((nav) => {
    const links = [...nav.querySelectorAll('a[data-content]')];
    const primary = (route && links.find((a) => a.dataset.content === route)) || (route ? links[0] : null);
    links.forEach((a) => {
      a.classList.toggle('primary', a === primary);
      if (a === primary) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  });
  function update() {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const section = target && target.closest('section');
    const nav = section && section.querySelector('.film-return');
    const best = nav && (nav.querySelector('a.primary') || nav.querySelector(`a[data-content="${route || 'core'}"]`) || nav.querySelector('a[data-content]'));
    const href = best ? best.getAttribute('href') : `index.html?content=${route || 'core'}`;
    document.querySelectorAll('[data-film-back]').forEach((a) => a.setAttribute('href', href));
  }
  update();
  window.addEventListener('hashchange', update);
})();
