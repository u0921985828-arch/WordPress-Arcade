/* Portal: favoritos, seguir jugando, me gusta, partidas y compartir. Datos del usuario en su navegador. */
(() => {
  const A = window.ARCADE || {}, LS = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const post = (path) => fetch(A.api + path, { method: 'POST' }).then((r) => r.json()).catch(() => ({}));
  const id = +A.id;
  /* ---------- Ficha de juego ---------- */
  if (id) {
    const recent = LS.get('arc:recent', []).filter((x) => x !== id); recent.unshift(id); LS.set('arc:recent', recent.slice(0, 18));
    const favs = new Set(LS.get('arc:favs', [])), liked = new Set(LS.get('arc:liked', []));
    const bFav = document.querySelector('[data-ax-fav]'), bLike = document.querySelector('[data-ax-like]'), bShare = document.querySelector('[data-ax-share]');
    const paint = () => { if (bFav) { bFav.classList.toggle('on', favs.has(id)); bFav.querySelector('b').textContent = favs.has(id) ? 'En favoritos' : 'Favorito'; } if (bLike) bLike.classList.toggle('on', liked.has(id)); };
    paint();
    bFav && bFav.addEventListener('click', () => { favs.has(id) ? favs.delete(id) : favs.add(id); LS.set('arc:favs', [...favs]); paint(); });
    bLike && bLike.addEventListener('click', () => { if (liked.has(id)) return; liked.add(id); LS.set('arc:liked', [...liked]); paint(); const n = bLike.querySelector('b'); n.textContent = (+n.dataset.n || 0) + 1; post('like/' + id).then((r) => { if (r.likes) n.textContent = r.likes; }); });
    bShare && bShare.addEventListener('click', async () => { const data = { title: document.title, url: location.href }; if (navigator.share) { try { await navigator.share(data); } catch (e) {} } else { try { await navigator.clipboard.writeText(location.href); bShare.querySelector('b').textContent = 'Enlace copiado'; setTimeout(() => (bShare.querySelector('b').textContent = 'Compartir'), 1800); } catch (e) {} } });
    let counted = false;
    document.addEventListener('click', (e) => { if (!counted && e.target.closest('[data-arcade-play]')) { counted = true; post('play/' + id).then((r) => { const el = document.querySelector('[data-ax-plays]'); if (el && r.plays) el.textContent = r.plays.toLocaleString('es-ES'); }); } }, true);
  }
  /* ---------- Portada: filas personales ---------- */
  const fill = (sel, ids) => { const box = document.querySelector(sel); if (!box || !ids.length) return; fetch(A.api + 'cards?ids=' + ids.join(',')).then((r) => r.json()).then((d) => { if (!d.html) return; box.querySelector('.ax-row').innerHTML = d.html; box.hidden = false; }).catch(() => {}); };
  fill('[data-ax-recent]', LS.get('arc:recent', []));
  fill('[data-ax-favs]', LS.get('arc:favs', []));
})();
