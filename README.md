# PortoLink Ready - Portfolio Builder SaaS

Versi ini dibuat sebagai web app pembuat portofolio multi-user dengan Vercel + Supabase.

## Fitur

- Landing page produk
- Register dan login Supabase
- Dashboard user
- Edit profil
- CRUD project
- CRUD skill
- CRUD pengalaman
- CRUD pendidikan
- CRUD sertifikat
- Pengaturan publish/draft
- Link publik `/u/username`
- Versi PDF `/u/username/pdf`
- Tombol Export PDF via browser print/save as PDF
- Form pesan di halaman publik
- Admin panel `/admin`
- Admin lihat user
- Admin aktif/nonaktifkan premium
- Admin publish/draft portfolio user
- Admin lihat pesan masuk
- RLS Supabase siap pakai
- Vercel rewrite untuk semua route
- Tidak perlu npm install/build command

## Struktur route

```txt
/
/login
/register
/dashboard
/dashboard/profile
/dashboard/projects
/dashboard/skills
/dashboard/experience
/dashboard/education
/dashboard/certificates
/dashboard/settings
/u/:username
/u/:username/pdf
/admin
/admin/users
/admin/messages
```

## Cara setup Supabase

1. Buat project baru di Supabase.
2. Masuk ke SQL Editor.
3. Jalankan file:

```txt
supabase/schema.sql
```

4. Masuk ke Project Settings > API.
5. Copy Project URL dan anon public key.
6. Buka `config.js`, lalu isi:

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

## Cara deploy ke Vercel

1. Upload semua file ke GitHub.
2. Import repository ke Vercel.
3. Pakai setting:

```txt
Framework Preset: Other
Build Command: kosongkan
Output Directory: kosongkan
Install Command: kosongkan
```

4. Deploy.

## Cara membuat akun admin

1. Daftar/login dulu lewat web app, atau buat user di Supabase Auth.
2. Buka Supabase > Authentication > Users.
3. Copy User UID akun admin.
4. Jalankan SQL ini:

```sql
insert into public.admin_users (user_id)
values ('GANTI_DENGAN_USER_UID_KAMU')
on conflict do nothing;
```

5. Login ulang, lalu buka:

```txt
/admin
```

## Catatan penting

- User biasa yang register lewat web app otomatis dibuatkan profil draft.
- Link publik baru bisa dilihat orang lain setelah status diubah menjadi Published.
- Admin bisa publish user dari `/admin/users`.
- PDF memakai fitur print browser. Pilih "Save as PDF" saat dialog print muncul.
- Upload gambar belum memakai Supabase Storage; untuk versi ini gunakan URL gambar. Kalau ingin upload file langsung, tambah Supabase Storage pada versi berikutnya.

## Troubleshooting

### Login tidak jalan
Cek `config.js`. SUPABASE_URL harus diawali `https://` dan anon key harus lengkap.

### Admin ditolak
Akun belum dimasukkan ke tabel `admin_users`. Jalankan SQL admin di atas.

### Halaman `/u/username` 404 di Vercel
Pastikan `vercel.json` ikut terupload. File itu yang membuat semua route diarahkan ke `index.html`.

### Data tidak bisa disimpan
Biasanya karena schema belum dijalankan, user belum login, atau username tidak sesuai format. Username hanya boleh huruf kecil, angka, dan tanda strip.
