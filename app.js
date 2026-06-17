import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const app = document.querySelector('#app');
const toastEl = document.querySelector('#toast');
const state = { user: null, profile: null, portfolio: null, tab: 'overview', editing: {} };
const demoKey = 'portolink_demo_data_v1';

const demoData = {
  profile: {
    id: 'demo-profile', username: 'erdinus', full_name: 'Erdinus', headline: 'Informatics Student & Accounting Staff', bio: 'Saya menggabungkan pengalaman akuntansi, administrasi, dan pengembangan web untuk membantu bisnis bekerja lebih rapi dan efisien.', photo_url: '', location: 'Yogyakarta, Indonesia', email_public: 'erdinus@example.com', phone_public: '', linkedin_url: '', github_url: 'https://github.com/erdthedev', instagram_url: '', website_url: '', template_id: 'clean-blue', is_published: true, is_premium: false
  },
  skills: [
    { id: crypto.randomUUID(), name: 'Accounting', level: 'Advanced' },
    { id: crypto.randomUUID(), name: 'Administration', level: 'Advanced' },
    { id: crypto.randomUUID(), name: 'Web Development', level: 'Intermediate' }
  ],
  projects: [
    { id: crypto.randomUUID(), title: 'UangKu', description: 'Aplikasi pencatatan keuangan pribadi berbasis web app, Supabase, dan PWA.', image_url: '', demo_url: 'https://uangku-vercel.vercel.app/', repo_url: '', tags: 'Finance, Supabase, Vercel' }
  ],
  experiences: [
    { id: crypto.randomUUID(), role: 'Accounting Staff', company: 'PT Lingkar Organik', start_date: '2024', end_date: 'Sekarang', description: 'Mengelola data administrasi, pencatatan transaksi, dan dukungan operasional.' }
  ],
  educations: [
    { id: crypto.randomUUID(), school: 'S1 Informatika', degree: 'Informatics', year: 'Sekarang', description: 'Fokus pada pengembangan web, database, dan sistem informasi.' }
  ],
  certificates: []
};

function getDemo() {
  const stored = localStorage.getItem(demoKey);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(demoKey, JSON.stringify(demoData));
  return structuredClone(demoData);
}
function setDemo(data) { localStorage.setItem(demoKey, JSON.stringify(data)); }
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 3200);
}
function path() { return window.location.pathname; }
function nav(to) { history.pushState({}, '', to); render(); }
window.addEventListener('popstate', render);
window.nav = nav;
window.printPortfolio = () => window.print();

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function initials(name = 'P') { return name.split(' ').filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase() || 'P'; }
function link(url, label) { return url ? `<a class="btn small ghost" href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>` : ''; }
function csvTags(tags = '') { return tags.split(',').map(x => x.trim()).filter(Boolean); }

async function getSessionUser() {
  if (!hasSupabase) return JSON.parse(localStorage.getItem('portolink_demo_user') || 'null');
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function signOut() {
  if (hasSupabase) await supabase.auth.signOut();
  localStorage.removeItem('portolink_demo_user');
  state.user = null;
  state.profile = null;
  nav('/');
}
window.signOut = signOut;

async function signIn(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const email = form.get('email');
  const password = form.get('password');
  if (!hasSupabase) {
    localStorage.setItem('portolink_demo_user', JSON.stringify({ id: 'demo-user', email }));
    toast('Mode demo aktif. Isi config Supabase untuk database asli.');
    nav('/dashboard');
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return toast(error.message);
  nav('/dashboard');
}
window.signIn = signIn;

async function signUp(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const email = form.get('email');
  const password = form.get('password');
  const username = String(form.get('username') || '').toLowerCase().replace(/[^a-z0-9_\-]/g, '');
  const full_name = form.get('full_name');
  if (!username || username.length < 3) return toast('Username minimal 3 karakter.');
  if (!hasSupabase) {
    const data = getDemo();
    data.profile.username = username;
    data.profile.full_name = full_name || username;
    setDemo(data);
    localStorage.setItem('portolink_demo_user', JSON.stringify({ id: 'demo-user', email }));
    toast('Akun demo dibuat.');
    nav('/dashboard');
    return;
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return toast(error.message);
  if (data.user) {
    const { error: insertError } = await supabase.from('profiles').insert({ user_id: data.user.id, username, full_name, headline: 'Professional Portfolio', is_published: true });
    if (insertError) toast(insertError.message);
  }
  toast('Registrasi berhasil. Kalau email confirmation aktif, cek email dulu.');
  nav('/login');
}
window.signUp = signUp;

async function loadMyPortfolio() {
  const user = await getSessionUser();
  state.user = user;
  if (!user) return null;
  if (!hasSupabase) return getDemo();
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const [projects, skills, experiences, educations, certificates] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('skills').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('experiences').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('educations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('certificates').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);
  return { profile, projects: projects.data || [], skills: skills.data || [], experiences: experiences.data || [], educations: educations.data || [], certificates: certificates.data || [] };
}

async function loadPublicPortfolio(username) {
  if (!hasSupabase) {
    const data = getDemo();
    if (data.profile.username !== username) return null;
    return data;
  }
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('username', username).eq('is_published', true).maybeSingle();
  if (error || !profile) return null;
  const userId = profile.user_id;
  const [projects, skills, experiences, educations, certificates] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('skills').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('experiences').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('educations').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('certificates').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  ]);
  return { profile, projects: projects.data || [], skills: skills.data || [], experiences: experiences.data || [], educations: educations.data || [], certificates: certificates.data || [] };
}

function landing() {
  app.innerHTML = `
  <header class="topbar">
    <div class="container nav">
      <button class="brand" onclick="nav('/')"><span class="logo">P</span><span>PortoLink</span></button>
      <nav class="navlinks">
        <a href="#fitur">Fitur</a><a href="#harga">Harga</a><a href="#cara">Cara Kerja</a>
        <button class="btn ghost" onclick="nav('/login')">Login</button>
        <button class="btn primary" onclick="nav('/register')">Mulai Gratis</button>
      </nav>
    </div>
  </header>
  <main>
    <section class="hero"><div class="container hero-grid">
      <div>
        <span class="badge">Portfolio builder + PDF export</span>
        <h1>Bikin link portofolio profesional tanpa deploy sendiri.</h1>
        <p>PortoLink membantu mahasiswa, fresh graduate, freelancer, dan job seeker membuat portofolio online yang bisa dibagikan ke HRD, klien, atau perusahaan.</p>
        <div class="hero-actions"><button class="btn primary" onclick="nav('/register')">Buat Portofolio</button><button class="btn" onclick="nav('/u/erdinus')">Lihat Demo</button></div>
      </div>
      <div class="hero-card">
        <div class="browserbar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        <div class="preview">
          <div class="avatar">E</div><h3>Erdinus</h3><p>Informatics Student & Accounting Staff</p>
          <div class="chips"><span class="chip">Accounting</span><span class="chip">Admin</span><span class="chip">Web Dev</span></div>
          <div class="mini-project"><strong>UangKu</strong><p>Aplikasi pencatatan keuangan pribadi berbasis Supabase dan Vercel.</p></div>
        </div>
      </div>
    </div></section>
    <section id="fitur" class="section"><div class="container"><div class="section-title"><div><h2>Fitur utama</h2><p class="lead">Fokus ke fitur yang benar-benar bisa dijual.</p></div></div>
      <div class="cards"><div class="card"><h3>Link publik</h3><p>Setiap user punya halaman seperti /u/username yang bisa dikirim ke HRD.</p></div><div class="card"><h3>Dashboard edit</h3><p>User bisa tambah skill, project, pengalaman, pendidikan, dan sertifikat.</p></div><div class="card"><h3>Export PDF</h3><p>Halaman portofolio bisa dicetak atau disimpan sebagai PDF untuk lamaran kerja.</p></div></div>
    </div></section>
    <section id="harga" class="section"><div class="container"><div class="section-title"><div><h2>Paket jualan</h2><p class="lead">Bisa kamu pakai untuk mulai cari pembeli pertama.</p></div></div>
      <div class="pricing"><div class="card"><h3>Free</h3><div class="price">Rp0</div><p>1 template, 3 project, watermark.</p></div><div class="card"><h3>Pro</h3><div class="price">Rp29rb</div><p>Tanpa watermark, export PDF, lebih banyak project.</p></div><div class="card"><h3>Dibantu Buatkan</h3><div class="price">Rp99rb+</div><p>Kamu inputkan data klien dan siap kirim link.</p></div></div>
    </div></section>
    <section id="cara" class="section"><div class="container"><div class="cards"><div class="card"><h3>1. Daftar</h3><p>User buat akun dan pilih username.</p></div><div class="card"><h3>2. Isi data</h3><p>Tambah profil, skill, project, pengalaman, dan kontak.</p></div><div class="card"><h3>3. Share</h3><p>Bagikan link atau export PDF.</p></div></div></div></section>
  </main><footer class="footer">© ${new Date().getFullYear()} PortoLink. Built for portfolio business MVP.</footer>`;
}

function authPage(type) {
  const isLogin = type === 'login';
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <button class="brand" onclick="nav('/')"><span class="logo">P</span><span>PortoLink</span></button>
    <h1>${isLogin ? 'Login' : 'Buat akun'}</h1><p class="muted">${hasSupabase ? 'Gunakan akun Supabase Auth.' : 'Mode demo aktif karena config Supabase masih kosong.'}</p>
    <form class="form" onsubmit="${isLogin ? 'signIn' : 'signUp'}(event)">
      ${!isLogin ? '<div class="field"><label>Nama lengkap</label><input class="input" name="full_name" placeholder="Nama kamu" required></div><div class="field"><label>Username</label><input class="input" name="username" placeholder="contoh: erdinus" required></div>' : ''}
      <div class="field"><label>Email</label><input class="input" name="email" type="email" required></div>
      <div class="field"><label>Password</label><input class="input" name="password" type="password" minlength="6" required></div>
      <button class="btn primary" type="submit">${isLogin ? 'Login' : 'Daftar'}</button>
    </form>
    <p class="muted">${isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'} <button class="btn small ghost" onclick="nav('${isLogin ? '/register' : '/login'}')">${isLogin ? 'Daftar' : 'Login'}</button></p>
  </div></div>`;
}

async function dashboard() {
  const data = await loadMyPortfolio();
  if (!state.user) return nav('/login');
  if (!data) return app.innerHTML = `<div class="auth-wrap"><div class="auth-card"><h1>Profil belum ada</h1><p class="muted">Buat ulang akun atau cek tabel profiles.</p><button class="btn primary" onclick="signOut()">Keluar</button></div></div>`;
  state.profile = data.profile;
  state.portfolio = data;
  app.innerHTML = `<div class="dash"><aside class="sidebar"><div class="brand"><span class="logo">P</span><span>PortoLink</span></div>
    <div class="side-nav">
      ${['overview','profile','projects','skills','experiences','educations','certificates','settings'].map(t => `<button class="${state.tab===t?'active':''}" onclick="setTab('${t}')">${label(t)}</button>`).join('')}
      <a href="/u/${escapeHtml(data.profile.username)}" target="_blank">Lihat Portofolio</a>
      <button onclick="signOut()">Logout</button>
    </div></aside><main class="dash-main"><div class="dash-head"><div><h1>${label(state.tab)}</h1><p class="muted">Kelola portofolio kamu dari sini.</p></div><div class="actions"><button class="btn ghost" onclick="nav('/')">Home</button><a class="btn primary" target="_blank" href="/u/${escapeHtml(data.profile.username)}">Public Link</a></div></div>${tabContent(data)}</main></div>`;
}
function label(t){return ({overview:'Overview',profile:'Profil',projects:'Project',skills:'Skill',experiences:'Pengalaman',educations:'Pendidikan',certificates:'Sertifikat',settings:'Pengaturan'})[t] || t}
window.setTab = (tab) => { state.tab = tab; render(); };
function tabContent(data){
  const p = data.profile;
  if (state.tab === 'overview') return `<div class="grid-3"><div class="panel"><h3>Username</h3><p>/u/${escapeHtml(p.username)}</p></div><div class="panel"><h3>Project</h3><p>${data.projects.length} item</p></div><div class="panel"><h3>Status</h3><p>${p.is_published ? 'Published' : 'Draft'} · ${p.is_premium ? 'Premium' : 'Free'}</p></div></div><div class="panel"><h3>Langkah jualan</h3><p class="muted">Mulai dari jasa manual: inputkan data klien lewat dashboard ini, lalu kirim link public dan PDF.</p></div>`;
  if (state.tab === 'profile') return profileForm(p);
  if (state.tab === 'projects') return crudSection('projects', data.projects, projectForm(state.editing.projects), renderProjectRow);
  if (state.tab === 'skills') return crudSection('skills', data.skills, skillForm(state.editing.skills), renderSkillRow);
  if (state.tab === 'experiences') return crudSection('experiences', data.experiences, experienceForm(state.editing.experiences), renderExperienceRow);
  if (state.tab === 'educations') return crudSection('educations', data.educations, educationForm(state.editing.educations), renderEducationRow);
  if (state.tab === 'certificates') return crudSection('certificates', data.certificates, certificateForm(state.editing.certificates), renderCertificateRow);
  if (state.tab === 'settings') return `<div class="panel"><h3>Publish & Premium</h3><form class="form" onsubmit="saveSettings(event)"><div class="grid-2"><div class="field"><label>Status publish</label><select name="is_published"><option value="true" ${p.is_published?'selected':''}>Published</option><option value="false" ${!p.is_published?'selected':''}>Draft</option></select></div><div class="field"><label>Template</label><select name="template_id"><option value="clean-blue">Clean Blue</option><option value="minimal">Minimal</option></select></div></div><button class="btn primary">Simpan</button></form></div><div class="panel"><h3>Export PDF</h3><p class="muted">Buka halaman public, klik Export PDF, lalu pilih Save as PDF.</p><a class="btn primary" href="/u/${escapeHtml(p.username)}" target="_blank">Buka Halaman PDF</a></div>`;
  return '';
}
function profileForm(p){return `<div class="panel"><form class="form" onsubmit="saveProfile(event)"><div class="grid-2"><div class="field"><label>Username</label><input class="input" name="username" value="${escapeHtml(p.username)}" required></div><div class="field"><label>Nama lengkap</label><input class="input" name="full_name" value="${escapeHtml(p.full_name)}" required></div><div class="field"><label>Headline</label><input class="input" name="headline" value="${escapeHtml(p.headline || '')}"></div><div class="field"><label>Lokasi</label><input class="input" name="location" value="${escapeHtml(p.location || '')}"></div><div class="field"><label>Email publik</label><input class="input" name="email_public" value="${escapeHtml(p.email_public || '')}"></div><div class="field"><label>Foto URL</label><input class="input" name="photo_url" value="${escapeHtml(p.photo_url || '')}" placeholder="https://..."></div></div><div class="field"><label>Bio</label><textarea name="bio">${escapeHtml(p.bio || '')}</textarea></div><div class="grid-2"><div class="field"><label>LinkedIn</label><input class="input" name="linkedin_url" value="${escapeHtml(p.linkedin_url || '')}"></div><div class="field"><label>GitHub</label><input class="input" name="github_url" value="${escapeHtml(p.github_url || '')}"></div><div class="field"><label>Instagram</label><input class="input" name="instagram_url" value="${escapeHtml(p.instagram_url || '')}"></div><div class="field"><label>Website</label><input class="input" name="website_url" value="${escapeHtml(p.website_url || '')}"></div></div><button class="btn primary">Simpan Profil</button></form></div>`}
function formDataObj(form){return Object.fromEntries(new FormData(form).entries())}
async function saveProfile(event){event.preventDefault(); await saveRecord('profiles', formDataObj(event.target), state.profile.id, true)}
window.saveProfile=saveProfile;
async function saveSettings(event){event.preventDefault(); const o=formDataObj(event.target); o.is_published=o.is_published==='true'; await saveRecord('profiles', o, state.profile.id, true)}
window.saveSettings=saveSettings;
function crudSection(table, rows, form, rowRenderer){return `<div class="panel"><h3>${state.editing[table] ? 'Edit Data' : 'Tambah Data'}</h3>${form}</div><div class="panel"><h3>Data</h3><div class="list">${rows.length ? rows.map(rowRenderer).join('') : '<div class="empty">Belum ada data.</div>'}</div></div>`}
function projectForm(x={}){return `<form class="form" onsubmit="upsertItem(event,'projects')"><div class="grid-2"><input type="hidden" name="id" value="${escapeHtml(x?.id || '')}"><div class="field"><label>Judul</label><input class="input" name="title" value="${escapeHtml(x?.title || '')}" required></div><div class="field"><label>Tags</label><input class="input" name="tags" value="${escapeHtml(x?.tags || '')}" placeholder="Web, Supabase, Vercel"></div><div class="field"><label>Demo URL</label><input class="input" name="demo_url" value="${escapeHtml(x?.demo_url || '')}"></div><div class="field"><label>Repo URL</label><input class="input" name="repo_url" value="${escapeHtml(x?.repo_url || '')}"></div><div class="field"><label>Image URL</label><input class="input" name="image_url" value="${escapeHtml(x?.image_url || '')}"></div></div><div class="field"><label>Deskripsi</label><textarea name="description">${escapeHtml(x?.description || '')}</textarea></div><div class="actions"><button class="btn primary">Simpan Project</button>${x?.id ? '<button type="button" class="btn ghost" onclick="cancelEdit()">Batal Edit</button>' : ''}</div></form>`}
function skillForm(x={}){return `<form class="form" onsubmit="upsertItem(event,'skills')"><input type="hidden" name="id" value="${escapeHtml(x?.id || '')}"><div class="grid-2"><div class="field"><label>Skill</label><input class="input" name="name" value="${escapeHtml(x?.name || '')}" required></div><div class="field"><label>Level</label><input class="input" name="level" value="${escapeHtml(x?.level || '')}" placeholder="Beginner/Intermediate/Advanced"></div></div><div class="actions"><button class="btn primary">Simpan Skill</button>${x?.id ? '<button type="button" class="btn ghost" onclick="cancelEdit()">Batal Edit</button>' : ''}</div></form>`}
function experienceForm(x={}){return `<form class="form" onsubmit="upsertItem(event,'experiences')"><input type="hidden" name="id" value="${escapeHtml(x?.id || '')}"><div class="grid-2"><div class="field"><label>Posisi</label><input class="input" name="role" value="${escapeHtml(x?.role || '')}" required></div><div class="field"><label>Perusahaan</label><input class="input" name="company" value="${escapeHtml(x?.company || '')}" required></div><div class="field"><label>Mulai</label><input class="input" name="start_date" value="${escapeHtml(x?.start_date || '')}"></div><div class="field"><label>Selesai</label><input class="input" name="end_date" value="${escapeHtml(x?.end_date || '')}"></div></div><div class="field"><label>Deskripsi</label><textarea name="description">${escapeHtml(x?.description || '')}</textarea></div><div class="actions"><button class="btn primary">Simpan Pengalaman</button>${x?.id ? '<button type="button" class="btn ghost" onclick="cancelEdit()">Batal Edit</button>' : ''}</div></form>`}
function educationForm(x={}){return `<form class="form" onsubmit="upsertItem(event,'educations')"><input type="hidden" name="id" value="${escapeHtml(x?.id || '')}"><div class="grid-2"><div class="field"><label>Sekolah/Kampus</label><input class="input" name="school" value="${escapeHtml(x?.school || '')}" required></div><div class="field"><label>Jurusan/Gelar</label><input class="input" name="degree" value="${escapeHtml(x?.degree || '')}"></div><div class="field"><label>Tahun</label><input class="input" name="year" value="${escapeHtml(x?.year || '')}"></div></div><div class="field"><label>Deskripsi</label><textarea name="description">${escapeHtml(x?.description || '')}</textarea></div><div class="actions"><button class="btn primary">Simpan Pendidikan</button>${x?.id ? '<button type="button" class="btn ghost" onclick="cancelEdit()">Batal Edit</button>' : ''}</div></form>`}
function certificateForm(x={}){return `<form class="form" onsubmit="upsertItem(event,'certificates')"><input type="hidden" name="id" value="${escapeHtml(x?.id || '')}"><div class="grid-2"><div class="field"><label>Nama sertifikat</label><input class="input" name="title" value="${escapeHtml(x?.title || '')}" required></div><div class="field"><label>Penerbit</label><input class="input" name="issuer" value="${escapeHtml(x?.issuer || '')}"></div><div class="field"><label>Tahun</label><input class="input" name="year" value="${escapeHtml(x?.year || '')}"></div><div class="field"><label>URL</label><input class="input" name="url" value="${escapeHtml(x?.url || '')}"></div></div><div class="actions"><button class="btn primary">Simpan Sertifikat</button>${x?.id ? '<button type="button" class="btn ghost" onclick="cancelEdit()">Batal Edit</button>' : ''}</div></form>`}
function renderProjectRow(x){return `<div class="row"><div><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.description || '')}</small></div><div class="actions"><button class="btn small ghost" onclick="editItem('projects','${x.id}')">Edit</button><button class="btn small danger" onclick="deleteItem('projects','${x.id}')">Hapus</button></div></div>`}
function renderSkillRow(x){return `<div class="row"><div><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.level || '')}</small></div><button class="btn small ghost" onclick="editItem('skills','${x.id}')">Edit</button><button class="btn small danger" onclick="deleteItem('skills','${x.id}')">Hapus</button></div>`}
function renderExperienceRow(x){return `<div class="row"><div><strong>${escapeHtml(x.role)} · ${escapeHtml(x.company)}</strong><small>${escapeHtml(x.start_date || '')} - ${escapeHtml(x.end_date || '')}</small></div><button class="btn small ghost" onclick="editItem('experiences','${x.id}')">Edit</button><button class="btn small danger" onclick="deleteItem('experiences','${x.id}')">Hapus</button></div>`}
function renderEducationRow(x){return `<div class="row"><div><strong>${escapeHtml(x.school)}</strong><small>${escapeHtml(x.degree || '')} · ${escapeHtml(x.year || '')}</small></div><button class="btn small ghost" onclick="editItem('educations','${x.id}')">Edit</button><button class="btn small danger" onclick="deleteItem('educations','${x.id}')">Hapus</button></div>`}
function renderCertificateRow(x){return `<div class="row"><div><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.issuer || '')} · ${escapeHtml(x.year || '')}</small></div><button class="btn small ghost" onclick="editItem('certificates','${x.id}')">Edit</button><button class="btn small danger" onclick="deleteItem('certificates','${x.id}')">Hapus</button></div>`}
async function upsertItem(event, table){event.preventDefault(); let obj=formDataObj(event.target); const id = obj.id || null; delete obj.id; await saveRecord(table, obj, id); state.editing[table] = null; event.target.reset();}
window.upsertItem=upsertItem;
async function saveRecord(table, obj, id=null, isProfile=false){
  if (!state.user) return toast('Login dulu.');
  if (!hasSupabase) {
    const data=getDemo();
    if (isProfile) data.profile={...data.profile,...obj};
    else if (id) data[table]=data[table].map(x=>x.id===id ? {...x,...obj} : x);
    else data[table].unshift({id:crypto.randomUUID(),...obj});
    setDemo(data); toast('Tersimpan di mode demo.'); render(); return;
  }
  if (!isProfile) obj.user_id=state.user.id;
  const q = id ? supabase.from(table).update(obj).eq('id', id) : supabase.from(table).insert(obj);
  const { error } = await q;
  if (error) return toast(error.message);
  toast('Berhasil disimpan.'); render();
}

function editItem(table,id){
  const row = state.portfolio?.[table]?.find(x => x.id === id);
  if (!row) return toast('Data tidak ditemukan.');
  state.editing[table] = row;
  render();
}
window.editItem=editItem;
function cancelEdit(){ state.editing = {}; render(); }
window.cancelEdit=cancelEdit;

async function deleteItem(table,id){
  if (!confirm('Hapus data ini?')) return;
  if (!hasSupabase) { const data=getDemo(); data[table]=data[table].filter(x=>x.id!==id); setDemo(data); render(); return; }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return toast(error.message);
  toast('Berhasil dihapus.'); render();
}
window.deleteItem=deleteItem;

async function publicPage(username) {
  const data = await loadPublicPortfolio(username);
  if (!data) return app.innerHTML = `<div class="auth-wrap"><div class="auth-card"><h1>Portofolio tidak ditemukan</h1><p class="muted">Cek username atau status publish.</p><button class="btn primary" onclick="nav('/')">Kembali</button></div></div>`;
  const { profile:p } = data;
  app.innerHTML = `<div class="public-wrap"><header class="topbar no-print"><div class="container nav"><button class="brand" onclick="nav('/')"><span class="logo">P</span><span>PortoLink</span></button><div class="actions"><button class="btn ghost" onclick="printPortfolio()">Export PDF</button><button class="btn primary" onclick="nav('/register')">Buat Punya Kamu</button></div></div></header>
  <section class="public-hero"><div class="container public-card"><div class="public-avatar">${p.photo_url ? `<img src="${escapeHtml(p.photo_url)}" alt="${escapeHtml(p.full_name)}">` : initials(p.full_name)}</div><div><h1>${escapeHtml(p.full_name)}</h1><p><strong>${escapeHtml(p.headline || '')}</strong></p><p>${escapeHtml(p.bio || '')}</p><div class="actions">${link(p.email_public ? `mailto:${p.email_public}` : '', 'Email')}${link(p.linkedin_url,'LinkedIn')}${link(p.github_url,'GitHub')}${link(p.instagram_url,'Instagram')}${link(p.website_url,'Website')}</div></div></div></section>
  <main class="public-content"><div class="container portfolio-grid">
    <section class="portfolio-section"><h2>Skill</h2><div class="chips">${data.skills.length ? data.skills.map(s=>`<span class="chip">${escapeHtml(s.name)}${s.level ? ' · '+escapeHtml(s.level):''}</span>`).join('') : '<p class="muted">Belum ada skill.</p>'}</div></section>
    <section class="portfolio-section"><h2>Pengalaman</h2><div class="list">${data.experiences.length ? data.experiences.map(x=>`<div><strong>${escapeHtml(x.role)} · ${escapeHtml(x.company)}</strong><p class="muted">${escapeHtml(x.start_date||'')} - ${escapeHtml(x.end_date||'')}</p><p>${escapeHtml(x.description||'')}</p></div>`).join('') : '<p class="muted">Belum ada pengalaman.</p>'}</div></section>
    <section class="portfolio-section"><h2>Project</h2><div class="list">${data.projects.length ? data.projects.map(x=>`<article class="mini-project">${x.image_url ? `<img class="project-img" src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.title)}">` : ''}<h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description||'')}</p><div class="chips">${csvTags(x.tags).map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join('')}</div><div class="actions">${link(x.demo_url,'Demo')}${link(x.repo_url,'Repo')}</div></article>`).join('') : '<p class="muted">Belum ada project.</p>'}</div></section>
    <section class="portfolio-section"><h2>Pendidikan & Sertifikat</h2><div class="list">${data.educations.map(x=>`<div><strong>${escapeHtml(x.school)}</strong><p class="muted">${escapeHtml(x.degree||'')} · ${escapeHtml(x.year||'')}</p><p>${escapeHtml(x.description||'')}</p></div>`).join('') || '<p class="muted">Belum ada pendidikan.</p>'}${data.certificates.map(x=>`<div><strong>${escapeHtml(x.title)}</strong><p class="muted">${escapeHtml(x.issuer||'')} · ${escapeHtml(x.year||'')}</p>${link(x.url,'Lihat')}</div>`).join('')}</div></section>
  </div><div class="container"><div class="watermark ${p.is_premium ? 'hide' : ''}">Made with PortoLink</div></div></main></div>`;
}

async function render() {
  try {
    const p = path();
    if (p.startsWith('/u/')) return publicPage(decodeURIComponent(p.split('/u/')[1] || ''));
    if (p === '/login') return authPage('login');
    if (p === '/register') return authPage('register');
    if (p.startsWith('/dashboard')) return dashboard();
    return landing();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="auth-wrap"><div class="auth-card"><h1>Terjadi error</h1><p class="muted">${escapeHtml(err.message)}</p><button class="btn primary" onclick="nav('/')">Kembali</button></div></div>`;
  }
}
render();
