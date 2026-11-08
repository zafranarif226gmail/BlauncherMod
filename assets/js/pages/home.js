/* BLauncher MOD — Home: live stats, universal search, trending */
document.addEventListener('DOMContentLoaded', function () {
  const $ = id => document.getElementById(id);

  /* ---- live stats ---- */
  BFX.mrSearch({ limit: 1 }).then(r => {
    const el = $('stProj'); if (el) el.textContent = r.total_hits ? BFX.fmt(r.total_hits) : '—';
  }).catch(() => { const el = $('stProj'); if (el) el.textContent = '100K+'; });
  BFX.mcVersions().then(list => { const el = $('stVer'); if (el) el.textContent = list.length || '922+'; })
    .catch(() => { });

  /* ---- smooth scroll from CTA ---- */
  const cs = $('ctaSearch');
  if (cs) cs.addEventListener('click', () => $('uq').scrollIntoView({ behavior: 'smooth', block: 'center' }));

  /* ---- universal search ---- */
  let source = 'all', offset = 0, rendered = 0, currentQ = '';
  const type = $('utype'), sort = $('usort'), q = $('uq'), more = $('umore'),
    res = $('uresults'), stat = $('ustat'), ac = $('uac');
  let acOpen = false;

  function setLoading(on) { res.style.opacity = on ? '.5' : '1'; }

  function render(items, append, setup) {
    if (setup) {
      document.querySelectorAll('.cfwarn').forEach(el => { el.style.display = 'block'; el.classList.remove('hidden'); });
    } else if (!currentQ) {
      document.querySelectorAll('.cfwarn').forEach(el => el.style.display = 'none');
    }
    const html = items.filter(x => x && !x.total).map(BFX.cardHtml).join('');
    if (append) res.insertAdjacentHTML('beforeend', html);
    else res.innerHTML = html || '<p class="help center" style="grid-column:1/-1">No results yet. Type to search officially.</p>';
    BFX.bindCards(res);
  }

  function run(append) {
    const query = q.value.trim();
    currentQ = query;
    if (!append) offset = 0;
    setLoading(true);
    const qo = { query: query, index: sort.value, offset: offset, limit: 9, type: type.value, source: source };
    BFX.universalSearch(qo).then(r => {
      setLoading(false);
      if (!append) rendered = 0;
      rendered += r.items.length;
      render(r.items, append, r.setup);
      stat.textContent = query ? 'Official results live — showing ' + rendered + (r.total ? ' of ' + BFX.fmt(r.total) + ' Modrinth hits' : '') : 'Browse mode — trending below. Type to search.';
      more.style.display = r.items.length >= 9 ? 'inline-flex' : 'none';
    }).catch(() => { setLoading(false); stat.textContent = 'Network hiccup — try again.'; });
  }

  const debounced = BFX.debounce(() => { acOpen = false; ac.classList.remove('open'); run(false); }, 350);

  if (q) {
    q.addEventListener('input', BFX.debounce(() => {
      const v = q.value.trim();
      if (v.length < 2) { ac.classList.remove('open'); return; }
      BFX.mrAutocomplete(v).then(d => {
        if (q.value.trim() !== v) return;
        ac.innerHTML = (d.hits || []).map(h =>
          '<div class="item" role="option" data-q="' + BFX.esc(h.title) + '">' +
          '<img loading="lazy" src="' + (h.icon_url ? BFX.esc(h.icon_url) : BFX.fallbackIcon(h.title)) + '" alt="">' +
          '<div><b>' + BFX.esc(h.title) + '</b><small>' + BFX.esc(h.description || '').slice(0, 70) + '</small></div>' +
          '<span class="dn">' + BFX.fmt(h.downloads) + '</span></div>').join('');
        acOpen = true; ac.classList.add('open');
      }).catch(() => { });
    }, 220));
    ac.addEventListener('click', e => {
      const it = e.target.closest('.item'); if (!it) return;
      q.value = it.dataset.q; ac.classList.remove('open'); run(false);
    });
    document.addEventListener('click', e => { if (acOpen && !ac.contains(e.target) && e.target !== q) { ac.classList.remove('open'); acOpen = false; } });
  }

  [type, sort].forEach(el => el.addEventListener('change', () => { run(false); }));
  document.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-src]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); source = b.dataset.src; run(false);
    if (source === 'curseforge' && BFX.setupError) BFX.toast('CurseForge API key not configured on server — Modrinth still works fully.', 'warn');
  }));
  if (more) more.addEventListener('click', () => { offset += 9; run(true); });

  /* ---- category pills + trending ---- */
  let cat = '';
  document.querySelectorAll('.pill[data-cat]').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('.pill[data-cat]').forEach(x => x.classList.remove('on'));
    p.classList.add('on'); cat = p.dataset.cat; loadTrending();
  }));

  function loadTrending() {
    const f = $('featured'); if (!f) return;
    f.innerHTML = '<div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div>';
    BFX.mrSearch({ index: 'downloads', limit: 6, categories: cat ? [cat] : null })
      .then(r => {
        f.innerHTML = (r.hits || []).map(BFX.mapMR).map(BFX.cardHtml).join('');
        BFX.bindCards(f);
      })
      .catch(() => { f.innerHTML = '<p class="help" style="grid-column:1/-1">Modrinth unreachable right now — check connection.</p>'; });
  }
  loadTrending();

  /* initial light browse (no query) */
  run(false);
});
