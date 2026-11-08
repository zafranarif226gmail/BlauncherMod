/* BLauncher MOD — Publish: SHA-256 gated review dashboard */
document.addEventListener('DOMContentLoaded', function () {
  const DEFAULT_SHA = '020963bd2e1c9d87b586f783621f6015c7f1c0dc5d24bfc68a57d5fa547e7377';
  /* sha256('BLAUNCHER-ADMIN-2026|blx') — documented in README.md, computed at build time */

  let tab = 'pending', unlocked = false;

  function sha(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
      .then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''));
  }

  const S = BFX.settings.get();
  const storedHash = S.adminHash || DEFAULT_SHA;
  const gate = document.getElementById('gate'), dash = document.getElementById('dash');

  function unlockUI(st) {
    unlocked = st;
    gate.style.display = st ? 'none' : 'block';
    dash.style.display = st ? 'block' : 'none';
    if (st) renderQueue();
  }

  if (sessionStorage.getItem('blx_admin') === '1') unlockUI(true);

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.addEventListener('click', doLogin);
  document.getElementById('pw').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  function doLogin() {
    const pw = document.getElementById('pw').value;
    document.getElementById('pwErr').textContent = pw ? '' : 'Enter the admin password';
    if (!pw) return;
    loginBtn.disabled = true;
    sha(pw + '|blx').then(h => {
      loginBtn.disabled = false;
      if (h === storedHash) {
        sessionStorage.setItem('blx_admin', '1');
        unlockUI(true); BFX.toast('Welcome back, admin.');
      } else {
        document.getElementById('pwErr').textContent = 'Wrong password. Try again.';
      }
    });
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('blx_admin'); unlockUI(false); document.getElementById('pw').value = '';
  });

  document.getElementById('chPass').addEventListener('click', () => {
    const n = prompt('New admin password (min 8 chars):');
    if (!n || n.length < 8) { if (n !== null) BFX.toast('Min 8 characters', 'bad'); return; }
    sha(n + '|blx').then(h => {
      BFX.settings.save({ adminHash: h });
      BFX.toast('Admin password updated (this device).');
    });
  });

  document.querySelectorAll('.tab[data-st]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-st]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); tab = b.dataset.st; renderQueue();
  }));

  function counts() {
    const l = BFX.subs.list();
    const c = st => l.filter(s => s.status === st).length;
    document.getElementById('dPending').textContent = c('pending') + ' pending';
    document.getElementById('dApproved').textContent = c('approved') + ' approved';
    document.getElementById('dRejected').textContent = c('rejected') + ' rejected';
    return l;
  }

  function renderQueue() {
    if (!unlocked) return;
    const l = counts(), box = document.getElementById('queue');
    const rows = l.filter(s => s.status === tab);
    box.innerHTML = rows.length ? rows.map(BFX.subCard).map(x => x)
      .map((html, i) => {
        const s = rows[i];
        return html.replace('</article>', '<div class="row">' +
          (s.status !== 'approved' ? '<button class="btn btn-sm btn-p" data-ap="' + s.id + '">Approve</button>' : '') +
          (s.status !== 'rejected' ? '<button class="btn btn-sm btn-gh" data-rj="' + s.id + '">Reject</button>' : '') +
          '<a class="btn btn-sm btn-gh" href="/special.html" target="_blank" rel="noopener">Preview</a>' +
          '<button class="btn btn-sm btn-gh" data-del="' + s.id + '">Delete</button></div></article>');
      }).join('') : '<p class="help center" style="grid-column:1/-1">Nothing in ' + tab + ' right now.</p>';
  }

  document.getElementById('queue').addEventListener('click', e => {
    const ap = e.target.closest('[data-ap]'), rj = e.target.closest('[data-rj]'), del = e.target.closest('[data-del]');
    if (ap) { BFX.subs.update(ap.dataset.ap, { status: 'approved' }); BFX.toast('Approved and published in Special.'); }
    else if (rj) { BFX.subs.update(rj.dataset.rj, { status: 'rejected' }); BFX.toast('Rejected.'); }
    else if (del) { BFX.subs.remove(del.dataset.del); BFX.toast('Submission deleted.'); }
    renderQueue();
  });
  document.addEventListener('blx:subs', () => { if (unlocked) renderQueue(); });
});
