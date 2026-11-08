/* BLauncher MOD — Upload: validated submission form + live status */
document.addEventListener('DOMContentLoaded', function () {
  const F = document.getElementById('upForm');
  const v = id => document.getElementById(id);
  const title = v('fTitle'), type = v('fType'), author = v('fAuthor'), link = v('fLink'),
    mcv = v('fMcv'), loader = v('fLoader'), desc = v('fDesc'), file = v('fFile'),
    image = v('fImage'), agree = v('fAgree'), preview = v('upPreview');

  /* MC version options (official) */
  BFX.mcVersions().then(list => {
    const rel = list.filter(x => x.type === 'release').slice(0, 40);
    mcv.innerHTML = '<option value="">Select version…</option>' +
      rel.map(x => '<option value="' + BFX.esc(x.id) + '">MC ' + BFX.esc(x.id) + '</option>').join('');
  });

  /* file metadata validation */
  let fileMeta = null;
  file.addEventListener('change', () => {
    const f = file.files[0], e = v('eFile'), info = v('fFileInfo');
    e.textContent = '';
    if (!f) { fileMeta = null; info.textContent = 'Only metadata is stored during review — hosting goes to official platforms.'; return; }
    if (!/\.(jar|zip|mrpack)$/i.test(f.name)) { e.textContent = 'Invalid type: choose .jar, .zip or .mrpack'; file.value = ''; fileMeta = null; return; }
    if (f.size > 50 * 1024 * 1024) { e.textContent = 'Max 50 MB'; file.value = ''; fileMeta = null; return; }
    fileMeta = { name: f.name, size: f.size };
    info.innerHTML = '<span class="ok">OK: ' + BFX.esc(f.name) + ' · ' + BFX.fmtBytes(f.size) + '</span>';
  });

  /* image validation + compression preview */
  let imgData = '';
  image.addEventListener('change', () => {
    const f = image.files[0], e = v('eImage'), info = v('fImgInfo');
    e.textContent = ''; imgData = '';
    if (!f) { preview.style.display = 'none'; info.textContent = 'Auto-compressed and previewed. Stored only in this browser until approved.'; return; }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { e.textContent = 'Use JPG, PNG or WEBP'; image.value = ''; return; }
    if (f.size > 6 * 1024 * 1024) { e.textContent = 'Max 6 MB before compression'; image.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const maxW = 720, scale = Math.min(1, maxW / im.width);
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * scale); c.height = Math.round(im.height * scale);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        imgData = c.toDataURL('image/jpeg', 0.62);
        if (imgData.length > 700000) { e.textContent = 'Image too large after compression — try a smaller screenshot'; return; }
        preview.src = imgData; preview.style.display = 'block';
        info.innerHTML = '<span class="ok">Ready: compressed to ' + BFX.fmtBytes(imgData.length) + '</span>';
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  });

  /* my submissions panel */
  function myPanel() {
    const l = BFX.subs.list(), pend = l.filter(s => s.status === 'pending'),
      ap = l.filter(s => s.status === 'approved'), rj = l.filter(s => s.status === 'rejected');
    document.getElementById('stPending').textContent = pend.length + ' pending';
    document.querySelectorAll('.count-pill')[1].textContent = ap.length + ' approved';
    document.querySelectorAll('.count-pill')[2].textContent = rj.length + ' rejected';
    document.getElementById('stNote').textContent = l.length ? 'Tap a card to view its status.' : 'Your submission statuses appear live here.';
    document.getElementById('mySubs').innerHTML = l.slice(0, 8).map(s =>
      '<div class="vrow"><span class="vid">' + BFX.esc(s.id.slice(0, 8)) + '</span>' +
      '<span class="vmeta"><b style="font-size:.78rem">' + BFX.esc(s.title) + '</b>' +
      '<span class="badge ' + BFX.esc(s.status) + '" style="color:' + (s.status === 'pending' ? 'var(--amber)' : s.status === 'approved' ? 'var(--emerald)' : 'var(--danger)') + ';">' + s.status + '</span>' +
      '<span>' + BFX.ago(s.ts) + '</span></span>' +
      '<span class="act">' + (s.status === 'pending' ? '<button class="btn btn-sm btn-gh" data-cancel="' + s.id + '">Cancel</button>' : '') + '</span>' +
      '</div>').join('') + (l.length ? '<p class="help">Older entries are in the Admin Publish dashboard.</p>' : '');
  }
  document.getElementById('mySubs').addEventListener('click', e => {
    const b = e.target.closest('[data-cancel]'); if (!b) return;
    BFX.subs.remove(b.dataset.cancel); myPanel(); BFX.toast('Submission withdrawn');
  });
  document.addEventListener('blx:subs', myPanel);
  myPanel();

  /* validate + submit */
  function validate() {
    let ok = true;
    const need = (el, id, msg) => {
      const e = v(id); e.textContent = msg || '';
      if (msg) { el.classList.add('shake'); if (ok) el.focus(); ok = false; }
      else el.classList.remove('shake');
    };
    need(title, 'eTitle', title.value.trim().length >= 3 ? '' : 'Title must be 3+ characters');
    need(type, 'eType', type.value ? '' : 'Pick a project type');
    need(author, 'eAuthor', author.value.trim().length >= 2 ? '' : 'Creator name (2+ chars)');
    if (link.value.trim() && !/^https?:\/\/.+/i.test(link.value.trim())) { v('eLink').textContent = 'Link must start with http(s)://'; ok = false; } else v('eLink').textContent = '';
    need(mcv, 'eMcv', mcv.value ? '' : 'Target Minecraft version required');
    need(desc, 'eDesc', desc.value.trim().length >= 30 ? '' : 'Describe your project (30+ chars)');
    v('eFile').textContent = (fileMeta || !file.value) ? '' : 'Check the selected build file';
    v('eImage').textContent = '';
    need(agree, 'eAgree', agree.checked ? '' : 'Confirm ownership & rules');
    return ok;
  }

  F.addEventListener('submit', ev => {
    ev.preventDefault();
    if (!validate()) { BFX.toast('Please fix the highlighted fields', 'bad'); return; }
    if (BFX.subs.ensureNotDup(title.value.trim() + desc.value.trim())) { BFX.toast('This exact submission is already in the queue', 'warn'); return; }
    const id = 'SUB-' + Date.now().toString(36).toUpperCase();
    BFX.subs.add({
      id, status: 'pending', ts: Date.now(),
      title: title.value.trim(), type: type.value, author: author.value.trim(),
      link: link.value.trim(), mcv: mcv.value, loader: loader.value,
      desc: desc.value.trim(), image: imgData,
      file: fileMeta
    });
    BFX.toast('Submitted! Status: PENDING — watch the "My submissions" panel.', 'warn');
    F.reset(); preview.style.display = 'none'; imgData = ''; fileMeta = null;
    myPanel();
  });
});
