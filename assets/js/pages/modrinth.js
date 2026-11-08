/* BLauncher MOD — Modrinth portal: search, filters, categories, autocomplete */
document.addEventListener('DOMContentLoaded', function () {
  const $ = id => document.getElementById(id);
  const q = $('mq'), type = $('mtype'), loaderE = $('mloader'), mcv = $('mmcv'),
    idx = $('mindex'), catBox = $('mcats'), res = $('mresults'),
    more = $('mmore'), count = $('mcount'), stat = $('mstat'), ac = $('mac');

  const params = new URLSearchParams(location.search);
  if (params.get('loader')) loaderE.value = params.get('loader');
  if (params.get('query')) q.value = params.get('query');

  /* categories (real Modrinth categories, displayed as OR-filters) */
  const CATS = ['adventure', 'decoration', 'equipment', 'food', 'gameplay', 'library', 'magic',
    'minigame', 'optimization', 'social', 'storage', 'technology', 'transportation',
    'utility', 'worldgen'];
  let cats = [];
  catBox.innerHTML = CATS.map(c => '<button class="pill" data-c="' + c + '">' + c + '</button>').join('');
  catBox.addEventListener('click', e => {
    const b = e.target.closest('.pill'); if (!b) return;
    const c = b.dataset.c;
    if (cats.includes(c)) { cats = cats.filter(x => x !== c); b.classList.remove('on'); }
    else { if (cats.length >= 3) { BFX.toast('Max 3 categories filter (official facet limit-ish)', 'warn'); return; } cats.push(c); b.classList.add('on'); }
    run();
  });

  /* MC versions from official source */
  BFX.mcVersions().then(list => {
    const rel = list.filter(v => v.type === 'release').slice(0, 60);
    mcv.innerHTML = '<option value="">Any MC version</option>' +
      rel.map(v => '<option value="' + BFX.esc(v.id) + '" data-time="' + v.time + '">' + BFX.esc(v.id) + '</option>').join('');
    const s = BFX.settings.get().mcVersion;
    if ([].some.call(mcv.options, o => o.value === s)) mcv.value = s;
  });

  const PAGE = 12;
  let offset = 0, rendered = 0;

  function run(append) {
    if (!append) { offset = 0; rendered = 0; }
    res.style.opacity = '.55';
    BFX.mrSearch({
      query: q.value.trim(), type: type.value, loader: loaderE.value,
      mcv: mcv.value, categories: cats, index: idx.value, offset: offset, limit: PAGE
    }).then(r => {
      res.style.opacity = '1';
      const hits = (r.hits || []).map(BFX.mapMR);
      rendered += hits.length;
      total = r.total_hits || 0;
      count.textContent = BFX.fmt(total) + ' results';
      stat.textContent = 'official Modrinth API · page ' + (1 + Math.ceil(rendered / PAGE));
      if (append) res.insertAdjacentHTML('beforeend', hits.map(BFX.cardHtml).join(''));
      else res.innerHTML = hits.map(BFX.cardHtml).join('') || '<p class="help center" style="grid-column:1/-1">Nothing found. Try fewer filters.</p>';
      BFX.bindCards(res);
      more.style.display = rendered < total ? 'inline-flex' : 'none';
    }).catch(() => { res.style.opacity = '1'; stat.textContent = 'Connection problem — retry.'; });
  }
  let total = 0;

  const rerun = BFX.debounce(() => run(false), 350);
  if (q) {
    q.addEventListener('input', BFX.debounce(() => {
      const v = q.value.trim();
      if (v.length < 2) { ac.classList.remove('open'); return; }
      BFX.mrAutocomplete(v).then(d => {
        if (q.value.trim() !== v) return;
        ac.innerHTML = (d.hits || []).map(h =>
          '<div class="item" role="option" data-q="' + BFX.esc(h.title) + '">' +
          '<img loading="lazy" src="' + (h.icon_url ? BFX.esc(h.icon_url) : BFX.fallbackIcon(h.title)) + '" alt="">' +
          '<div><b>' + BFX.esc(h.title) + '</b><small>' + BFX.esc((h.description || '').slice(0, 70)) + '</small></div>' +
          '<span class="dn">' + BFX.fmt(h.downloads) + '</span></div>').join('');
        ac.classList.add('open');
      }).catch(() => { });
    }, 220));
    q.addEventListener('input', rerun);
    ac.addEventListener('click', e => {
      const it = e.target.closest('.item'); if (!it) return;
      q.value = it.dataset.q; ac.classList.remove('open'); run(false);
    });
    document.addEventListener('click', e => { if (!ac.contains(e.target) && e.target !== q) ac.classList.remove('open'); });
  }
  [type, loaderE, mcv, idx].forEach(el => el.addEventListener('change', () => run(false)));
  more.addEventListener('click', () => { offset += PAGE; run(true); });

  run(false);
});
