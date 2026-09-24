/* Portal: favoritos, seguir jugando, me gusta, partidas, compartir, carrusel, búsqueda, orden y anuncios. Datos del usuario en su navegador. */
(() => {
  const A = window.ARCADE || {}, LS = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const post = (path) => fetch(A.api + path, { method: 'POST' }).then((r) => r.json()).catch(() => ({}));
  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const id = +A.id;
  /* ---------- Ficha de juego ---------- */
  if (id) {
    const recent = LS.get('arc:recent', []).filter((x) => x !== id); recent.unshift(id); LS.set('arc:recent', recent.slice(0, 18));
    const favs = new Set(LS.get('arc:favs', [])), liked = new Set(LS.get('arc:liked', []));
    const bFav = $('[data-ax-fav]'), bLike = $('[data-ax-like]'), bShare = $('[data-ax-share]');
    const paint = () => { if (bFav) { bFav.classList.toggle('on', favs.has(id)); bFav.setAttribute('aria-pressed', favs.has(id)); bFav.querySelector('b').textContent = favs.has(id) ? 'En favoritos' : 'Favorito'; } if (bLike) { bLike.classList.toggle('on', liked.has(id)); bLike.setAttribute('aria-pressed', liked.has(id)); } };
    paint();
    bFav && bFav.addEventListener('click', () => { favs.has(id) ? favs.delete(id) : favs.add(id); LS.set('arc:favs', [...favs]); paint(); });
    bLike && bLike.addEventListener('click', () => { if (liked.has(id)) return; liked.add(id); LS.set('arc:liked', [...liked]); paint(); post('like/' + id); });
    bShare && bShare.addEventListener('click', async () => { const data = { title: document.title, url: location.href }; if (navigator.share) { try { await navigator.share(data); } catch (e) {} } else { try { await navigator.clipboard.writeText(location.href); bShare.querySelector('b').textContent = 'Copiado'; setTimeout(() => (bShare.querySelector('b').textContent = 'Compartir'), 1800); } catch (e) {} } });
    let counted = false;
    document.addEventListener('click', (e) => { if (!counted && e.target.closest('[data-arcade-play]')) { counted = true; post('play/' + id).then((r) => { const el = $('[data-ax-plays]'); if (el && r.plays) { el.textContent = r.plays.toLocaleString('es-ES'); if (r.plays >= 10) { const w = $('[data-ax-plays-wrap]'); if (w) w.hidden = false; } } }); } }, true);
  }
  /* ---------- Filas personales (portada) y Mis juegos ---------- */
  const fill = (box, ids) => { if (!box || !ids.length) return Promise.resolve(false); return fetch(A.api + 'cards?ids=' + ids.join(',')).then((r) => r.json()).then((d) => { if (!d.html) return false; box.querySelector('.ax-row,.ax-grid').innerHTML = d.html; box.hidden = false; lazyAds(box); return true; }).catch(() => false); };
  const favIds = LS.get('arc:favs', []), recIds = LS.get('arc:recent', []);
  const none = $('[data-ax-none]');
  Promise.all([fill($('[data-ax-recent]'), recIds), fill($('[data-ax-favs]'), favIds)]).then((r) => { if (none) none.hidden = r.some(Boolean); });
  /* ---------- Carrusel ---------- */
  $$('[data-ax-carousel]').forEach((c) => {
    const track = $('.ax-slides', c), slides = $$('.ax-slide', c), dots = $$('.ax-dots button', c);
    if (slides.length < 2) { const d = $('.ax-dots', c); if (d) d.hidden = true; return; }
    let cur = 0, timer = 0, paused = false;
    const go = (i) => { cur = (i + slides.length) % slides.length; track.scrollTo({ left: slides[cur].offsetLeft - track.offsetLeft, behavior: 'smooth' }); };
    const mark = () => dots.forEach((d, i) => d.setAttribute('aria-selected', i === cur));
    track.addEventListener('scroll', () => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== cur) { cur = i; mark(); } }, { passive: true });
    dots.forEach((d, i) => d.addEventListener('click', () => { paused = true; go(i); cur = i; mark(); }));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => { clearTimeout(timer); if (reduce) return; timer = setTimeout(() => { if (!paused && !document.hidden) go(cur + 1); tick(); }, 6000); };
    ['pointerdown', 'focusin', 'mouseenter'].forEach((ev) => c.addEventListener(ev, () => (paused = true)));
    c.addEventListener('mouseleave', () => (paused = false));
    tick();
  });
  /* ---------- Ordenar listados ---------- */
  const grid = $('[data-ax-sortable]');
  $$('.ax-sort button').forEach((b) => b.addEventListener('click', () => {
    if (!grid) return;
    $$('.ax-sort button').forEach((x) => x.classList.toggle('on', x === b));
    const k = b.dataset.sort, cards = $$(':scope > .ax-card', grid), ads = $$(':scope > .ax-ad', grid);
    cards.sort((a, c) => (k === 'az' ? a.dataset.t.localeCompare(c.dataset.t, 'es') : k === 'new' ? c.dataset.d - a.dataset.d : c.dataset.p - a.dataset.p));
    cards.forEach((el, i) => { grid.appendChild(el); if ((i + 1) % 15 === 0 && ads.length && i + 1 < cards.length) grid.appendChild(ads.shift()); });
  }));
  /* ---------- Búsqueda con sugerencias ---------- */
  const form = $('[data-ax-search]'), inp = form && $('input[type=search]', form), box = form && $('.ax-sugg', form);
  let index = null, loading = null, sel = -1;
  const load = () => loading || (loading = fetch(A.api + 'index').then((r) => r.json()).then((d) => (index = (Array.isArray(d) ? d : []).map((g) => Object.assign(g, { n: norm(g.t) })))).catch(() => (index = [])));
  const esc = (t) => String(t).replace(/[&<>"']/g, (m) => '&#' + m.charCodeAt(0) + ';');
  const render = () => {
    const q = norm(inp.value.trim()); sel = -1;
    if (!q || !index) { box.hidden = true; return; }
    const hits = index.filter((g) => g.n.includes(q) || norm(g.g).includes(q)).sort((a, b) => (b.n.startsWith(q) - a.n.startsWith(q)) || a.n.localeCompare(b.n)).slice(0, 8);
    box.innerHTML = hits.length ? hits.map((g) => `<a href="${esc(g.u)}" role="option">${g.i ? `<img src="${esc(g.i)}" alt="" loading="lazy">` : ''}<span>${esc(g.t)}</span><small>${esc(g.g || '')}</small></a>`).join('') : '<p>Sin resultados. Pulsa Intro para buscar en todo el sitio.</p>';
    box.hidden = false;
  };
  if (inp && box) {
    inp.addEventListener('focus', load);
    inp.addEventListener('input', () => { if (index) render(); else load().then(render); });
    inp.addEventListener('keydown', (e) => {
      const items = $$('a', box); if (box.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((a, i) => a.classList.toggle('on', i === sel)); }
      else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); location.href = items[sel].href; }
      else if (e.key === 'Escape') box.hidden = true;
    });
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) box.hidden = true; });
  }
  const find = $('[data-ax-find]');
  find && find.addEventListener('click', () => { if (!inp) return; scrollTo({ top: 0, behavior: 'smooth' }); inp.focus(); });
  /* ---------- Anuncios: se piden al acercarse a la pantalla y nunca si están ocultos ---------- */
  const pushAd = (ins) => { if (ins.dataset.axPushed || !ins.offsetWidth) return; ins.dataset.axPushed = 1; try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {} };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); pushAd(e.target); } }), { rootMargin: '300px 0px' }) : null;
  function lazyAds(root) { $$('[data-ax-ad] ins.adsbygoogle', root).forEach((ins) => (io ? io.observe(ins) : pushAd(ins))); }
  lazyAds(document);
  /* ---------- Preferencias de privacidad (CMP de Google) ---------- */
  const cb = $('[data-ax-consent]');
  if (cb) {
    const ready = () => { cb.hidden = false; };
    window.googlefc = window.googlefc || {}; window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({ CONSENT_DATA_READY: ready });
    cb.addEventListener('click', () => { try { window.googlefc.showRevocationMessage(); } catch (e) {} });
  }
})();
