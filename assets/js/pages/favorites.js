/* BLauncher MOD — Favorites: local collection */
document.addEventListener('DOMContentLoaded', function () {
  const list = document.getElementById('fvlist'), qf = document.getElementById('fvq'),
    src = document.getElementById('fvsrc'), count = document.getElementById('fvcount');

  function render() {
    let all = BFX.fav.list();
    count.textContent = all.length + ' saved';
    const needle = qf.value.trim().toLowerCase();
    if (needle) all = all.filter(f => (f.name || '').toLowerCase().indexOf(needle) >= 0);
    if (src.value) all = all.filter(f => f.source === src.value || f.type === src.value);
    list.innerHTML = all.map(f =>
      '<article class="card" data-mid="' + BFX.esc(f.source) + ':' + BFX.esc(f.id) + '">' +
      '<div class="top"><img class="ic" loading="lazy" decoding="async" src="' + (f.icon ? BFX.esc(f.icon) : BFX.fallbackIcon(f.name)) + '">' +
      '<div><h3>' + BFX.esc(f.name || 'Unknown') + '</h3>' +
      '<div class="meta"><span class="badge release">saved</span><span>' + BFX.esc(f.source || f.type || '') + '</span></div></div></div>' +
      '<div class="row">' +
      '<button class="btn btn-sm btn-p" data-act="detail">Details</button>' +
      '<button class="btn btn-sm btn-gh" data-act="unfav">&#10005; Remove</button>' +
      '</div></article>').join('') ||
      '<p class="help center" style="grid-column:1/-1">No favorites yet — hit &#9733; Fav on any project card.</p>';
  }

  list.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const [source, id] = card.dataset.mid.split(':');
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'unfav') {
      BFX.fav.remove(id, source === 'curseforge' ? 'curseforge' : 'modrinth');
      BFX.toast('Removed from favorites');
      render();
    } else if (act.dataset.act === 'detail') {
      BFX.detail.open(source, id, {});
    }
  });
  document.addEventListener('blx:favorites', render);
  qf.addEventListener('input', BFX.debounce(render, 200));
  src.addEventListener('change', render);

  document.getElementById('fvclear').addEventListener('click', () => {
    const n = BFX.fav.list().length;
    if (!n) { BFX.toast('Nothing to clear'); return; }
    if (confirm('Remove all ' + n + ' favorites from this device?')) {
      const all = BFX.fav.list();
      all.forEach(f => BFX.fav.remove(f.id, f.type));
      render(); BFX.toast('Favorites cleared');
    }
  });

  render();
});
