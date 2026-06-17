import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_NAME, APP_TAGLINE } from './config.js';

const CONFIG_OK = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 40;
const supabase = CONFIG_OK ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const app = document.querySelector('#app');

const state = {
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: false,
  lastError: ''
};

const routes = [
  '/', '/login', '/register', '/dashboard', '/dashboard/profile', '/dashboard/projects', '/dashboard/skills',
  '/dashboard/experience', '/dashboard/education', '/dashboard/certificates', '/dashboard/settings', '/admin',
  '/admin/users', '/admin/messages'
];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value = '') {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'user';
}

function path() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

function go(to) {
  window.history.pushState({}, '', to);
  render();
}

function setLoading(value) {
  state.loading = value;
}

function toast(message, type = 'success') {
  const box = document.createElement('div');
  box.className = `toast ${type}`;
  box.textContent = message;
  document.body.appendChild(box);
  Object.assign(box.style, {
    position: 'fixed', right: '18px', bottom: '18px', padding: '12px 14px', borderRadius: '14px',
    background: type === 'error' ? '#fee2e2' : '#dcfce7', color: type === 'error' ? '#991b1b' : '#166534',
    border: '1px solid rgba(0,0,0,.08)', zIndex: 9999, fontWeight: 800, boxShadow: '0 18px 40px rgba(0,0,0,.12)'
  });
  setTimeout(() => box.remove(), 2600);
}

function publicUrl(username) {
  return `${window.location.origin}/u/${username}`;
}

function nav() {
  const authLinks = state.user
    ? `<a href="/dashboard" data-link>Dashboard</a>${state.isAdmin ? '<a href="/admin" data-link>Admin</a>' : ''}<button class="link-btn" data-action="logout">Logout</button>`
    : '<a href="/login" data-link>Login</a><a class="btn primary" href="/register" data-link>Mulai Gratis</a>';
  return `
    <header class="navbar no-print">
      <div class="nav-inner">
        <a class="brand" href="/" data-link><span class="logo">P</span><span>${APP_NAME}</span></a>
        <nav class="nav-links">
          <a href="/" data-link>Home</a>
          ${authLinks}
        </nav>
      </div>
    </header>`;
}

function shell(content) {
  app.innerHTML = `${nav()}${content}<footer class="footer no-print">${APP_NAME} © ${new Date().getFullYear()} — Portfolio builder siap deploy.</footer>`;
  bindGlobal();
}

function configWarning() {
  if (CONFIG_OK) return '';
  return `<div class="alert warning"><b>Config belum diisi.</b> Buka <code>config.js</code>, lalu isi SUPABASE_URL dan SUPABASE_ANON_KEY. Tanpa itu login/database belum bisa jalan.</div>`;
}

async function init() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    state.session = data.session || null;
    state.user = data.session?.user || null;
    if (state.user) await hydrateUser();
    supabase.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      state.user = session?.user || null;
      state.profile = null;
      state.isAdmin = false;
      if (state.user) await hydrateUser();
      render();
    });
  }
  render();
}

async function hydrateUser() {
  if (!supabase || !state.user) return;
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', state.user.id).maybeSingle();
  state.profile = profile || null;
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', state.user.id).maybeSingle();
  state.isAdmin = Boolean(admin);
}

function bindGlobal() {
  document.querySelectorAll('[data-link]').forEach(el => {
    el.addEventListener('click', e => {
      const href = el.getAttribute('href');
      if (!href || href.startsWith('http')) return;
      e.preventDefault();
      go(href);
    });
  });
  document.querySelectorAll('[data-action="logout"]').forEach(btn => btn.addEventListener('click', logout));
}

async function logout() {
  if (supabase) await supabase.auth.signOut();
  state.session = null; state.user = null; state.profile = null; state.isAdmin = false;
  go('/');
}

function landing() {
  shell(`
    <main class="container">
      ${configWarning()}
      <section class="hero">
        <div>
          <span class="eyebrow">Portfolio SaaS siap jual</span>
          <h1>Bikin link portofolio dan PDF profesional tanpa ribet.</h1>
          <p>${APP_TAGLINE} User cukup isi data, pilih publikasi, lalu dapat link seperti <b>/u/username</b> untuk dikirim ke HRD atau calon klien.</p>
          <div class="actions">
            <a class="btn primary" href="/register" data-link>Buat Portofolio</a>
            <a class="btn ghost" href="/login" data-link>Login</a>
          </div>
        </div>
        <div class="hero-card">
          <div class="preview-window">
            <div class="preview-top"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
            <div class="preview-body">
              <div class="avatar">👤</div>
              <h2>Nama Profesional</h2>
              <p class="muted">Accounting Staff • Informatics Student • Web Builder</p>
              <div class="pill-row"><span class="pill">Project</span><span class="pill">Skill</span><span class="pill">Experience</span><span class="pill">PDF</span></div>
            </div>
          </div>
        </div>
      </section>
      <section class="grid grid-3">
        <div class="card"><h3>Untuk user</h3><p class="muted">Edit profil, project, skill, pengalaman, pendidikan, dan sertifikat sendiri.</p></div>
        <div class="card"><h3>Untuk bisnis kamu</h3><p class="muted">Satu aplikasi bisa melayani banyak user lewat URL /u/username.</p></div>
        <div class="card"><h3>Untuk HRD</h3><p class="muted">Link publik rapi dan ada mode print/export PDF.</p></div>
      </section>
    </main>`);
}

function authPage(mode) {
  const isLogin = mode === 'login';
  shell(`
    <main class="container auth-wrap">
      <div class="card auth-card">
        ${configWarning()}
        <h2>${isLogin ? 'Login' : 'Register'}</h2>
        <p class="muted">${isLogin ? 'Masuk ke dashboard portofolio.' : 'Buat akun dan mulai bangun portofolio.'}</p>
        <form class="form" id="authForm">
          <div class="field"><label>Email</label><input class="input" name="email" type="email" required /></div>
          <div class="field"><label>Password</label><input class="input" name="password" type="password" minlength="6" required /></div>
          ${isLogin ? '' : '<div class="field"><label>Nama lengkap</label><input class="input" name="full_name" required /></div>'}
          <button class="btn primary" type="submit">${isLogin ? 'Login' : 'Register'}</button>
        </form>
        <p class="muted">${isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'} <a href="${isLogin ? '/register' : '/login'}" data-link>${isLogin ? 'Register' : 'Login'}</a></p>
      </div>
    </main>`);
  document.querySelector('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!supabase) return toast('Config Supabase belum diisi.', 'error');
    const form = Object.fromEntries(new FormData(e.target).entries());
    setLoading(true);
    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      : await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.full_name } } });
    setLoading(false);
    if (result.error) return toast(result.error.message, 'error');
    state.session = result.data.session;
    state.user = result.data.user;
    if (state.user) await ensureProfile(form.full_name || form.email.split('@')[0]);
    await hydrateUser();
    go('/dashboard');
  });
}

async function ensureProfile(fullName = '') {
  if (!supabase || !state.user) return;
  const { data: existing } = await supabase.from('profiles').select('id').eq('user_id', state.user.id).maybeSingle();
  if (existing) return;
  const base = slugify(fullName || state.user.email?.split('@')[0]);
  const username = `${base}-${String(state.user.id).slice(0, 4)}`;
  await supabase.from('profiles').insert({
    user_id: state.user.id,
    username,
    full_name: fullName || 'Nama Lengkap',
    headline: 'Professional Portfolio',
    bio: 'Tulis ringkasan singkat tentang dirimu, pengalaman, dan keahlian utama.',
    email_public: state.user.email,
    is_published: false,
    template_id: 'classic'
  });
}

function requireAuth() {
  if (!state.user) { go('/login'); return false; }
  return true;
}

function dashboardShell(active, content) {
  shell(`
    <main class="container layout">
      <aside class="card sidebar no-print">
        <h3>Dashboard</h3>
        <div class="menu">
          ${menuLink('/dashboard', 'Ringkasan', active)}
          ${menuLink('/dashboard/profile', 'Profil', active)}
          ${menuLink('/dashboard/projects', 'Project', active)}
          ${menuLink('/dashboard/skills', 'Skill', active)}
          ${menuLink('/dashboard/experience', 'Pengalaman', active)}
          ${menuLink('/dashboard/education', 'Pendidikan', active)}
          ${menuLink('/dashboard/certificates', 'Sertifikat', active)}
          ${menuLink('/dashboard/settings', 'Pengaturan', active)}
        </div>
      </aside>
      <section>${content}</section>
    </main>`);
}

function menuLink(href, label, active) {
  return `<a href="${href}" data-link class="${active === href ? 'active' : ''}">${label}</a>`;
}

async function dashboardHome() {
  if (!requireAuth()) return;
  await ensureProfile(state.user.email?.split('@')[0]);
  await hydrateUser();
  const p = state.profile;
  const url = p ? publicUrl(p.username) : '-';
  dashboardShell('/dashboard', `
    <div class="grid">
      <div class="card">
        <h2>Ringkasan Portofolio</h2>
        <p class="muted">Kelola data portofolio dari menu kiri. Setelah siap, aktifkan publish di Pengaturan.</p>
        ${p ? `<div class="alert ${p.is_published ? 'success' : 'warning'}">Status: <b>${p.is_published ? 'Published' : 'Draft'}</b></div>` : ''}
        <div class="actions">
          <a class="btn primary" href="/dashboard/profile" data-link>Edit Profil</a>
          ${p ? `<a class="btn ghost" href="/u/${p.username}" data-link>Lihat Link Publik</a><button class="btn" data-copy="${url}">Copy Link</button>` : ''}
        </div>
      </div>
      ${p ? `<div class="card"><h3>Link kamu</h3><p><code>${escapeHtml(url)}</code></p><p class="muted">Bagikan link ini ke HRD, klien, atau bio media sosial.</p></div>` : ''}
    </div>`);
  bindCopy();
}

function bindCopy() {
  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(btn.dataset.copy);
    toast('Link disalin.');
  }));
}

async function profilePage() {
  if (!requireAuth()) return;
  await ensureProfile(state.user.email?.split('@')[0]);
  await hydrateUser();
  const p = state.profile || {};
  dashboardShell('/dashboard/profile', `
    <div class="card">
      <h2>Edit Profil</h2>
      <form class="form" id="profileForm">
        ${input('Username', 'username', p.username, true)}
        ${input('Nama Lengkap', 'full_name', p.full_name, true)}
        ${input('Headline', 'headline', p.headline)}
        ${textarea('Bio', 'bio', p.bio)}
        ${input('Lokasi', 'location', p.location)}
        ${input('Email publik', 'email_public', p.email_public, false, 'email')}
        ${input('Nomor WhatsApp/HP', 'phone_public', p.phone_public)}
        ${input('URL Foto Profil', 'photo_url', p.photo_url)}
        ${input('Website', 'website_url', p.website_url)}
        ${input('LinkedIn', 'linkedin_url', p.linkedin_url)}
        ${input('GitHub', 'github_url', p.github_url)}
        ${input('Instagram', 'instagram_url', p.instagram_url)}
        <button class="btn primary" type="submit">Simpan Profil</button>
      </form>
    </div>`);
  document.querySelector('#profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.username = slugify(data.username);
    const { error } = await supabase.from('profiles').update(data).eq('user_id', state.user.id);
    if (error) return toast(error.message, 'error');
    await hydrateUser();
    toast('Profil disimpan.');
  });
}

function input(label, name, value = '', required = false, type = 'text') {
  return `<div class="field"><label>${label}</label><input class="input" type="${type}" name="${name}" value="${escapeHtml(value || '')}" ${required ? 'required' : ''}/></div>`;
}
function textarea(label, name, value = '') {
  return `<div class="field"><label>${label}</label><textarea name="${name}">${escapeHtml(value || '')}</textarea></div>`;
}

const tableConfigs = {
  projects: { title: 'Project', route: '/dashboard/projects', fields: [
    ['title','Judul','text',true], ['role','Role','text'], ['tech_stack','Tech Stack','text'], ['demo_url','Demo URL','text'], ['repo_url','Repo URL','text'], ['image_url','Image URL','text'], ['description','Deskripsi','textarea']
  ]},
  skills: { title: 'Skill', route: '/dashboard/skills', fields: [
    ['name','Nama Skill','text',true], ['level','Level','select'], ['category','Kategori','text']
  ]},
  experiences: { title: 'Pengalaman', route: '/dashboard/experience', fields: [
    ['company','Perusahaan/Organisasi','text',true], ['role','Posisi','text',true], ['start_date','Mulai','date'], ['end_date','Selesai','date'], ['description','Deskripsi','textarea']
  ]},
  educations: { title: 'Pendidikan', route: '/dashboard/education', fields: [
    ['school','Sekolah/Kampus','text',true], ['degree','Jurusan/Gelar','text'], ['start_year','Tahun Mulai','number'], ['end_year','Tahun Selesai','number'], ['description','Deskripsi','textarea']
  ]},
  certificates: { title: 'Sertifikat', route: '/dashboard/certificates', fields: [
    ['title','Judul Sertifikat','text',true], ['issuer','Penerbit','text'], ['issued_year','Tahun','number'], ['credential_url','Credential URL','text'], ['description','Deskripsi','textarea']
  ]}
};

async function crudPage(table) {
  if (!requireAuth()) return;
  await hydrateUser();
  const cfg = tableConfigs[table];
  const { data = [], error } = await supabase.from(table).select('*').eq('user_id', state.user.id).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) return dashboardShell(cfg.route, `<div class="alert error">${escapeHtml(error.message)}</div>`);
  dashboardShell(cfg.route, `
    <div class="grid">
      <div class="card">
        <h2>Kelola ${cfg.title}</h2>
        <form class="form" id="crudForm">
          <input type="hidden" name="id" />
          ${cfg.fields.map(fieldInput).join('')}
          <div class="field"><label>Urutan</label><input class="input" type="number" name="sort_order" value="0" /></div>
          <div class="actions"><button class="btn primary" type="submit">Simpan</button><button class="btn ghost" type="button" id="resetForm">Reset</button></div>
        </form>
      </div>
      <div class="card">
        <h3>Daftar ${cfg.title}</h3>
        ${data.length ? `<div class="list">${data.map(row => rowCard(table, row)).join('')}</div>` : '<div class="empty">Belum ada data.</div>'}
      </div>
    </div>`);
  const form = document.querySelector('#crudForm');
  document.querySelector('#resetForm').addEventListener('click', () => form.reset());
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const id = payload.id; delete payload.id;
    payload.user_id = state.user.id;
    payload.sort_order = Number(payload.sort_order || 0);
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    const result = id ? await supabase.from(table).update(payload).eq('id', id).eq('user_id', state.user.id) : await supabase.from(table).insert(payload);
    if (result.error) return toast(result.error.message, 'error');
    toast('Data disimpan.');
    crudPage(table);
  });
  document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
    const row = data.find(x => x.id === btn.dataset.edit);
    if (!row) return;
    form.id.value = row.id;
    cfg.fields.forEach(([name]) => { if (form[name]) form[name].value = row[name] || ''; });
    form.sort_order.value = row.sort_order || 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Hapus data ini?')) return;
    const { error: delError } = await supabase.from(table).delete().eq('id', btn.dataset.delete).eq('user_id', state.user.id);
    if (delError) return toast(delError.message, 'error');
    toast('Data dihapus.');
    crudPage(table);
  }));
}

function fieldInput([name, label, type, required]) {
  if (type === 'textarea') return `<div class="field"><label>${label}</label><textarea name="${name}" ${required ? 'required' : ''}></textarea></div>`;
  if (type === 'select') return `<div class="field"><label>${label}</label><select name="${name}"><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option></select></div>`;
  return `<div class="field"><label>${label}</label><input class="input" type="${type}" name="${name}" ${required ? 'required' : ''}/></div>`;
}

function rowCard(table, row) {
  const title = row.title || row.name || row.company || row.school || 'Data';
  const meta = row.role || row.level || row.degree || row.issuer || '';
  return `<div class="item"><h3>${escapeHtml(title)}</h3><div class="item-meta">${escapeHtml(meta)}</div><p class="muted">${escapeHtml(row.description || row.tech_stack || row.category || '')}</p><div class="actions"><button class="btn" data-edit="${row.id}">Edit</button><button class="btn danger" data-delete="${row.id}">Hapus</button></div></div>`;
}

async function settingsPage() {
  if (!requireAuth()) return;
  await hydrateUser();
  const p = state.profile || {};
  dashboardShell('/dashboard/settings', `
    <div class="grid">
      <div class="card">
        <h2>Pengaturan Publikasi</h2>
        <form class="form" id="settingsForm">
          <div class="field"><label>Status Publish</label><select name="is_published"><option value="true" ${p.is_published ? 'selected' : ''}>Published</option><option value="false" ${!p.is_published ? 'selected' : ''}>Draft</option></select></div>
          <div class="field"><label>Template</label><select name="template_id"><option value="classic">Classic</option><option value="modern" ${p.template_id === 'modern' ? 'selected' : ''}>Modern</option></select></div>
          <button class="btn primary" type="submit">Simpan Pengaturan</button>
        </form>
      </div>
      <div class="card">
        <h3>PDF</h3><p class="muted">Buka halaman publik, lalu klik Export PDF. Browser akan membuka dialog print/save as PDF.</p>
        ${p.username ? `<a class="btn ghost" href="/u/${p.username}/pdf" data-link>Buka Versi PDF</a>` : ''}
      </div>
    </div>`);
  document.querySelector('#settingsForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.is_published = data.is_published === 'true';
    const { error } = await supabase.from('profiles').update(data).eq('user_id', state.user.id);
    if (error) return toast(error.message, 'error');
    await hydrateUser(); toast('Pengaturan disimpan.');
  });
}

async function loadPublic(username, forPdf = false) {
  if (!supabase) return shell(`<main class="container">${configWarning()}</main>`);
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
  if (error || !profile) return notFound('Portofolio tidak ditemukan.');
  const allowed = profile.is_published || state.user?.id === profile.user_id || state.isAdmin;
  if (!allowed) return notFound('Portofolio masih draft.');
  const [projects, skills, experiences, educations, certificates] = await Promise.all([
    loadRows('projects', profile.user_id), loadRows('skills', profile.user_id), loadRows('experiences', profile.user_id), loadRows('educations', profile.user_id), loadRows('certificates', profile.user_id)
  ]);
  shell(`
    <main class="container public-hero">
      <section class="card public-card">
        <div class="photo">${profile.photo_url ? `<img src="${escapeHtml(profile.photo_url)}" alt="Foto profil"/>` : initials(profile.full_name)}</div>
        <div>
          <h1 class="public-title">${escapeHtml(profile.full_name)}</h1>
          <p class="muted"><b>${escapeHtml(profile.headline || '')}</b></p>
          <p>${escapeHtml(profile.bio || '')}</p>
          <div class="pill-row">${[profile.location, profile.email_public, profile.phone_public].filter(Boolean).map(x => `<span class="pill">${escapeHtml(x)}</span>`).join('')}</div>
          <div class="actions no-print"><button class="btn primary" onclick="window.print()">Export PDF</button>${profile.website_url ? `<a class="btn ghost" href="${escapeHtml(profile.website_url)}" target="_blank" rel="noopener">Website</a>` : ''}${profile.linkedin_url ? `<a class="btn ghost" href="${escapeHtml(profile.linkedin_url)}" target="_blank" rel="noopener">LinkedIn</a>` : ''}${profile.github_url ? `<a class="btn ghost" href="${escapeHtml(profile.github_url)}" target="_blank" rel="noopener">GitHub</a>` : ''}</div>
        </div>
      </section>
      ${publicSection('Skill', skills.map(s => `<span class="pill">${escapeHtml(s.name)}${s.level ? ' • ' + escapeHtml(s.level) : ''}</span>`).join(''), true)}
      ${publicSection('Project', projects.map(projectCard).join(''))}
      ${publicSection('Pengalaman', experiences.map(experienceCard).join(''))}
      ${publicSection('Pendidikan', educations.map(educationCard).join(''))}
      ${publicSection('Sertifikat', certificates.map(certificateCard).join(''))}
      ${forPdf ? '' : contactSection()}
      ${profile.is_premium ? '' : '<div class="watermark no-print">Made with PortoLink</div>'}
    </main>`);
  const contactForm = document.querySelector('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.portfolio_user_id = profile.user_id;
      const { error: msgErr } = await supabase.from('contact_messages').insert(data);
      if (msgErr) return toast(msgErr.message, 'error');
      e.target.reset();
      toast('Pesan berhasil dikirim.');
    });
  }
  if (forPdf) setTimeout(() => window.print(), 700);
}

async function loadRows(table, userId) {
  const { data } = await supabase.from(table).select('*').eq('user_id', userId).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  return data || [];
}
function initials(name = 'P') { return escapeHtml(String(name).split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase() || 'P'); }
function publicSection(title, content, inline = false) { return `<section class="card" style="margin-top:18px"><h2>${title}</h2>${content ? `<div class="${inline ? 'pill-row' : 'list'}">${content}</div>` : '<div class="empty">Belum ada data.</div>'}</section>`; }

function contactSection() {
  return `<section class="card no-print" style="margin-top:18px"><h2>Kirim Pesan</h2><form class="form" id="contactForm"><div class="grid grid-2"><div class="field"><label>Nama</label><input class="input" name="name" required /></div><div class="field"><label>Email</label><input class="input" type="email" name="email" required /></div></div><div class="field"><label>Pesan</label><textarea name="message" required></textarea></div><button class="btn primary" type="submit">Kirim Pesan</button></form></section>`;
}

function projectCard(p) { return `<div class="item"><h3>${escapeHtml(p.title)}</h3><div class="item-meta">${escapeHtml([p.role, p.tech_stack].filter(Boolean).join(' • '))}</div><p>${escapeHtml(p.description || '')}</p><div class="actions no-print">${p.demo_url ? `<a class="btn ghost" href="${escapeHtml(p.demo_url)}" target="_blank" rel="noopener">Demo</a>` : ''}${p.repo_url ? `<a class="btn ghost" href="${escapeHtml(p.repo_url)}" target="_blank" rel="noopener">Repo</a>` : ''}</div></div>`; }
function experienceCard(x) { return `<div class="item"><h3>${escapeHtml(x.role)}</h3><div class="item-meta">${escapeHtml(x.company)} • ${escapeHtml([x.start_date, x.end_date || 'Sekarang'].filter(Boolean).join(' - '))}</div><p>${escapeHtml(x.description || '')}</p></div>`; }
function educationCard(x) { return `<div class="item"><h3>${escapeHtml(x.school)}</h3><div class="item-meta">${escapeHtml([x.degree, x.start_year, x.end_year].filter(Boolean).join(' • '))}</div><p>${escapeHtml(x.description || '')}</p></div>`; }
function certificateCard(x) { return `<div class="item"><h3>${escapeHtml(x.title)}</h3><div class="item-meta">${escapeHtml([x.issuer, x.issued_year].filter(Boolean).join(' • '))}</div><p>${escapeHtml(x.description || '')}</p>${x.credential_url ? `<a class="btn ghost no-print" href="${escapeHtml(x.credential_url)}" target="_blank" rel="noopener">Lihat Credential</a>` : ''}</div>`; }

async function adminPage(kind = 'users') {
  if (!requireAuth()) return;
  await hydrateUser();
  if (!state.isAdmin) return shell(`<main class="container"><div class="alert error">Akses ditolak. Tambahkan UID akunmu ke tabel admin_users.</div></main>`);
  if (kind === 'messages') return adminMessages();
  const { data = [], error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const rows = data.map(p => `<tr><td><b>${escapeHtml(p.full_name)}</b><br><span class="muted">/u/${escapeHtml(p.username)}</span></td><td>${p.is_published ? '<span class="badge green">Published</span>' : '<span class="badge">Draft</span>'}</td><td>${p.is_premium ? '<span class="badge blue">Premium</span>' : '<span class="badge">Free</span>'}</td><td><div class="actions"><button class="btn" data-admin-toggle="publish" data-id="${p.id}" data-value="${!p.is_published}">${p.is_published ? 'Draft' : 'Publish'}</button><button class="btn warning" data-admin-toggle="premium" data-id="${p.id}" data-value="${!p.is_premium}">${p.is_premium ? 'Set Free' : 'Premium'}</button><a class="btn ghost" href="/u/${p.username}" data-link>Lihat</a></div></td></tr>`).join('');
  shell(`
    <main class="container layout">
      <aside class="card sidebar"><h3>Admin</h3><div class="menu">${menuLink('/admin/users','Users','/admin/users')}${menuLink('/admin/messages','Messages','')}</div></aside>
      <section class="card"><h2>Admin Users</h2>${error ? `<div class="alert error">${escapeHtml(error.message)}</div>` : ''}<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Publish</th><th>Paket</th><th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Belum ada user.</td></tr>'}</tbody></table></div></section>
    </main>`);
  document.querySelectorAll('[data-admin-toggle]').forEach(btn => btn.addEventListener('click', async () => {
    const field = btn.dataset.adminToggle === 'publish' ? 'is_published' : 'is_premium';
    const value = btn.dataset.value === 'true';
    const { error: upErr } = await supabase.from('profiles').update({ [field]: value }).eq('id', btn.dataset.id);
    if (upErr) return toast(upErr.message, 'error');
    toast('Data user diperbarui.'); adminPage('users');
  }));
}

async function adminMessages() {
  const { data = [], error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
  const rows = data.map(m => `<tr><td><b>${escapeHtml(m.name)}</b><br>${escapeHtml(m.email)}</td><td>${escapeHtml(m.message)}</td><td>${new Date(m.created_at).toLocaleString('id-ID')}</td></tr>`).join('');
  shell(`
    <main class="container layout">
      <aside class="card sidebar"><h3>Admin</h3><div class="menu">${menuLink('/admin/users','Users','')}${menuLink('/admin/messages','Messages','/admin/messages')}</div></aside>
      <section class="card"><h2>Pesan Masuk</h2>${error ? `<div class="alert error">${escapeHtml(error.message)}</div>` : ''}<div class="table-wrap"><table class="table"><thead><tr><th>Pengirim</th><th>Pesan</th><th>Tanggal</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Belum ada pesan.</td></tr>'}</tbody></table></div></section>
    </main>`);
}

function notFound(message = 'Halaman tidak ditemukan.') {
  shell(`<main class="container"><div class="card"><h2>404</h2><p class="muted">${escapeHtml(message)}</p><a class="btn primary" href="/" data-link>Kembali</a></div></main>`);
}

function render() {
  const p = path();
  if (p === '/') return landing();
  if (p === '/login') return authPage('login');
  if (p === '/register') return authPage('register');
  if (p === '/dashboard') return dashboardHome();
  if (p === '/dashboard/profile') return profilePage();
  if (p === '/dashboard/projects') return crudPage('projects');
  if (p === '/dashboard/skills') return crudPage('skills');
  if (p === '/dashboard/experience') return crudPage('experiences');
  if (p === '/dashboard/education') return crudPage('educations');
  if (p === '/dashboard/certificates') return crudPage('certificates');
  if (p === '/dashboard/settings') return settingsPage();
  if (p === '/admin' || p === '/admin/users') return adminPage('users');
  if (p === '/admin/messages') return adminPage('messages');
  const publicMatch = p.match(/^\/u\/([a-zA-Z0-9-]+)(\/pdf)?$/);
  if (publicMatch) return loadPublic(publicMatch[1], Boolean(publicMatch[2]));
  notFound();
}

window.addEventListener('popstate', render);
init();
