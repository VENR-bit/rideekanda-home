const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const grid = document.getElementById('grid');

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initialFor(title) {
  const t = (title || '').trim();
  return t ? t[0].toUpperCase() : '·';
}

function renderTile(t) {
  const iconHtml = t.icon_url
    ? `<img src="${escapeHtml(t.icon_url)}" alt="" loading="lazy" />`
    : escapeHtml(initialFor(t.title));
  const desc = t.description ? `<div class="tile-desc">${escapeHtml(t.description)}</div>` : '';
  const isExternal = t.url && !t.url.startsWith('#');
  const targetAttrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
  const href = t.url || '#';
  return `
    <a class="tile" href="${escapeHtml(href)}" ${targetAttrs}>
      <div class="tile-icon">${iconHtml}</div>
      <div class="tile-title">${escapeHtml(t.title)}</div>
      ${desc}
    </a>
  `;
}

async function loadTiles() {
  const { data, error } = await db
    .from(TILES_TABLE)
    .select('*')
    .eq('visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    grid.innerHTML = `<div class="error">Could not load tiles: ${escapeHtml(error.message)}</div>`;
    return;
  }
  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty">No tiles yet. Add some via the <a href="admin.html">admin panel</a>.</div>`;
    return;
  }
  grid.innerHTML = data.map(renderTile).join('');
}

loadTiles();
