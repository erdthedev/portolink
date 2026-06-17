# PortoLink SaaS MVP

Web app pembuat portofolio online: user daftar, isi data, dapat link publik `/u/username`, dan bisa export PDF via print.

## Fitur

- Landing page jualan
- Register/login Supabase Auth
- Dashboard user
- CRUD profil
- CRUD project
- CRUD skill
- CRUD pengalaman
- CRUD pendidikan
- CRUD sertifikat
- Public portfolio page `/u/:username`
- Export PDF dengan `window.print()`
- Watermark untuk user free
- Mode demo jika Supabase belum diisi

## Struktur

```txt
index.html
styles.css
app.js
config.js
vercel.json
supabase/schema.sql
```

## Setup Supabase

1. Buat project di Supabase.
2. Buka SQL Editor.
3. Jalankan file `supabase/schema.sql`.
4. Buka Authentication > Providers > Email.
5. Untuk testing cepat, matikan email confirmation dulu. Kalau production, aktifkan email confirmation.
6. Buka Project Settings > API.
7. Copy Project URL dan anon public key.
8. Isi `config.js`:

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'ey...';
```

## Deploy ke Vercel

1. Upload folder ini ke GitHub.
2. Import project di Vercel.
3. Framework Preset: Other.
4. Build Command: kosongkan.
5. Output Directory: kosongkan.
6. Deploy.

`vercel.json` sudah membuat semua route kembali ke `index.html`, jadi `/u/username` dan `/dashboard` tetap bisa dibuka langsung.

## Cara pakai

1. Buka `/register`.
2. Isi nama, username, email, password.
3. Masuk ke dashboard.
4. Tambah profil, project, skill, pengalaman, pendidikan, sertifikat.
5. Buka `/u/username`.
6. Klik Export PDF.

## Catatan penting

- Jangan memasukkan Supabase service role key di frontend.
- Gunakan anon public key saja.
- Untuk fitur upload gambar, versi MVP ini memakai URL gambar dulu. Tahap berikutnya bisa ditambah Supabase Storage.
- Untuk pembayaran, mulai dari aktivasi manual dulu. Setelah ada pembeli, integrasikan Midtrans/Xendit.

## Roadmap berikutnya

- Upload foto ke Supabase Storage
- Admin panel untuk melihat user dan aktivasi premium
- Template premium
- QR code portofolio
- Analytics jumlah view
- Custom domain untuk user premium
- Pembayaran otomatis
