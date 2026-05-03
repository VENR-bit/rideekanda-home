const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginEl = document.getElementById('login');
const shellEl = document.getElementById('adminShell');
const loginForm = document.getElementById('loginForm');
const loginFlash = document.getElementById('loginFlash');
const userEmailEl = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const addForm = document.getElementById('addForm');
const tilesList = document.getElementById('tilesList');
const flashEl = document.getElementById('flash');

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function flash(msg, kind = 'ok', target = flashEl) {
  target.innerHTML = `<div class="flash ${kind}">${escapeHtml(msg)}</div>`;
  if (kind === 'ok') setTimeout(() => { target.innerHTML = ''; }, 3000);
}

function showLogin() {
  loginEl.hidden = false;
  shellEl.hidden = true;
}

function showShell(session) {
  loginEl.hidden = true;
  shellEl.hidden = false;
  userEmailEl.textContent = session.user.email;
  loadTiles();
}

async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  if (session) showShell(session); else showLogin();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Logging in…';
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Log in';
  if (error) {
    flash(error.message, 'err', loginFlash);
    return;
  }
  showShell(data.session);
});

logoutBtn.addEventListener('click', async () => {
  await db.auth.signOut();
  showLogin();
});

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('newTitle').value.trim(),
    url: document.getElementById('newUrl').value.trim(),
    icon_url: document.getElementById('newIcon').value.trim() || null,
    description: document.getElementById('newDesc').value.trim() || null,
    sort_order: parseInt(document.getElementById('newSort').value, 10) || 0,
    visible: document.getElementById('newVisible').checked,
  };
  const { error } = await db.from(TILES_TABLE).insert(payload);
  if (error) { flash(error.message, 'err'); return; }
  addForm.reset();
  document.getElementById('newVisible').checked = true;
  document.getElementById('newSort').value = 0;
  flash('Tile added.');
  loadTiles();
});

async function loadTiles() {
  const { data, error } = await db
    .from(TILES_TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) { tilesList.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`; return; }
  if (!data || data.length === 0) { tilesList.innerHTML = `<p class="empty">No tiles yet.</p>`; return; }
  tilesList.innerHTML = `
    <table class="tiles-table">
      <thead>
        <tr><th>Sort</th><th>Title</th><th>URL</th><th>Visible</th><th></th></tr>
      </thead>
      <tbody>
        ${data.map(rowHtml).join('')}
      </tbody>
    </table>
  `;
  attachRowHandlers(data);
}

function rowHtml(t) {
  return `
    <tr data-id="${t.id}" data-row>
      <td>${t.sort_order}</td>
      <td><strong>${escapeHtml(t.title)}</strong>${t.description ? `<br><span style="color:var(--muted);font-size:.8rem">${escapeHtml(t.description)}</span>` : ''}</td>
      <td class="url-col"><a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">${escapeHtml(t.url)}</a></td>
      <td>${t.visible ? '✓' : '—'}</td>
      <td>
        <div class="row-actions">
          <button data-action="edit" class="secondary">Edit</button>
          <button data-action="delete" class="danger">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function attachRowHandlers(tiles) {
  const byId = Object.fromEntries(tiles.map(t => [t.id, t]));
  tilesList.querySelectorAll('tr[data-row]').forEach(tr => {
    const id = parseInt(tr.dataset.id, 10);
    tr.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      const t = byId[id];
      if (!confirm(`Delete tile "${t.title}"?`)) return;
      const { error } = await db.from(TILES_TABLE).delete().eq('id', id);
      if (error) { flash(error.message, 'err'); return; }
      flash('Tile deleted.');
      loadTiles();
    });
    tr.querySelector('[data-action="edit"]').addEventListener('click', () => openEdit(tr, byId[id]));
  });
}

function openEdit(tr, t) {
  tr.outerHTML = `
    <tr data-id="${t.id}" data-edit-row>
      <td colspan="5">
        <form class="inline-form" data-edit-form>
          <div class="field-row">
            <div><label>Title</label><input name="title" type="text" value="${escapeHtml(t.title)}" required /></div>
            <div><label>URL</label><input name="url" type="url" value="${escapeHtml(t.url)}" required /></div>
          </div>
          <div><label>Icon URL</label><input name="icon_url" type="url" value="${escapeHtml(t.icon_url || '')}" /></div>
          <div><label>Description</label><textarea name="description" rows="2">${escapeHtml(t.description || '')}</textarea></div>
          <div class="field-row">
            <div><label>Sort order</label><input name="sort_order" type="number" value="${t.sort_order}" /></div>
            <div><label style="margin-top:24px"><input name="visible" type="checkbox" ${t.visible ? 'checked' : ''} /> Visible</label></div>
          </div>
          <div>
            <button type="submit">Save</button>
            <button type="button" class="secondary" data-cancel>Cancel</button>
          </div>
        </form>
      </td>
    </tr>
  `;
  const newTr = tilesList.querySelector(`tr[data-id="${t.id}"][data-edit-row]`);
  newTr.querySelector('[data-cancel]').addEventListener('click', loadTiles);
  newTr.querySelector('[data-edit-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const payload = {
      title: f.title.value.trim(),
      url: f.url.value.trim(),
      icon_url: f.icon_url.value.trim() || null,
      description: f.description.value.trim() || null,
      sort_order: parseInt(f.sort_order.value, 10) || 0,
      visible: f.visible.checked,
    };
    const { error } = await db.from(TILES_TABLE).update(payload).eq('id', t.id);
    if (error) { flash(error.message, 'err'); return; }
    flash('Tile updated.');
    loadTiles();
  });
}

checkSession();
