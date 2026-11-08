/* BLauncher MOD — CurseForge portal (official API via server proxy) */
document.addEventListener('DOMContentLoaded', function () {
  const $ = id => document.getElementById(id);
  const q = $('cq'), type = $('ctype'), loaderE = $('cloader'), mcv = $('cmcv'),
    sort = $('csort'), catE = $('ccat'), res = $('cresults'), more = $('cmore'),
    count = $('ccount'), stat = $('cstat'), note = $('cfnote');

  function showSetup() {
    note.style.display = 'block';
    note.innerHTML = '<strong>CurseForge API not set up on this server.</strong> GitHub Pages only hosts static files and cannot run the secure server-side proxy required by the official CurseForge API. Nothing was faked: Modrinth portal fully works meanwhile.';
    res.innerHTML = '<p class="help center" style="grid-column:1/-1">CurseForge needs a separate secure backend. Modrinth and the other static pages remain available.</p>';
    count.textContent = 'setup needed';
  }

  /* MC versions for the filter */
  BFX.mcVersions().then(list => {
    const rel = list.filter(v => v.type === 'release').slice(0, 60);
    mcv.innerHTML = '<option value="">Any MC version</option>' +
      rel.map(v => '<option value="' + BFX.esc(v.id) + '">' + BFX.esc(v.id) + '</option>').join('');
    const s = BFX.settings.get().mcVersion;
    if ([].some.call(mcv.options, o => o.value === s)) mcv.value = s;
  });

  /* categories: real ids from the official endpoint (class 6 = Mods) */
  BFX.cfCategories().then(list => {
    const cls = type.value;
    const opts = list.filter(c => String(c.gameId) === '432' && c.parentCategoryId === Number(cls))
      .map(c => '<option value="' + c.id + '">' + BFX.esc(c.name.replace(/['"]+/g, '')) + '</option>').join('');
    catE.innerHTML = '<option value="">Category: All</option>' + opts;
    stat.textContent = 'official api.curseforge.com · ' + list.length + ' categories loaded';
  }).catch(e => {
    if (e.setup) showSetup();
    catE.innerHTML = '<option value="">Category: All</option>';
  });
  type.addEventListener('change', () => {
    BFX.cfCategories().then(list => {
      const cls = type.value;
      const opts = list.filter(c => String(c.gameId) === '432' && c.parentCategoryId === Number(cls))
        .map(c => '<option value="' + c.id + '">' + BFX.esc(c.name.replace(/['"]+/g, '')) + '</option>').join('');
      catE.innerHTML = '<option value="">Category: All</option>' + opts;
      run();
    }).catch(e => { if (e.setup) showSetup(); });
  });

  const PAGE = 12;
  let offset = 0, rendered = 0;

  function run(append) {
    if (!append) { offset = 0; rendered = 0; }
    res.style.opacity = '.55';
    BFX.cfSearch({
      query: q.value.trim(), cls: type.value, loader: loaderE.value,
      mcv: mcv.value, category: catE.value, sortField: sort.value,
      offset: offset, limit: PAGE
    }).then(list => {
      res.style.opacity = '1';
      rendered += list.length;
      count.textContent = BFX.fmt(list.length ? offset + rendered : 0) + ' loaded';
      if (append) res.insertAdjacentHTML('beforeend', list.map(BFX.mapCF).map(BFX.cardHtml).join(''));
      else res.innerHTML = list.map(BFX.mapCF).map(BFX.cardHtml).join('') ||
        '<p class="help center" style="grid-column:1/-1">No projects found.</p>';
      BFX.bindCards(res);
      more.style.display = list.length >= PAGE ? 'inline-flex' : 'none';
    }).catch(e => {
      res.style.opacity = '1';
      if (e.setup) showSetup();
      else { count.textContent = 'offline'; stat.textContent = 'Connection problem — retry in a moment.'; }
    });
  }

  q.addEventListener('input', BFX.debounce(() => run(false), 380));
  [type, loaderE, mcv, sort, catE].forEach(el => el.addEventListener('change', () => run(false)));
  more.addEventListener('click', () => { offset += PAGE; run(true); });

  run(false);
});
