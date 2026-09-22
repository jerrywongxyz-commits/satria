# Backend Satpol PP Kaltara

Backend ini memakai Node.js native tanpa dependency eksternal.

## Menjalankan

```powershell
node server.js
```

Jika `node` WindowsApps ditolak, gunakan runtime bawaan Codex:

```powershell
C:\Users\jerry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe server.js
```

Lalu buka:

- Website: `http://127.0.0.1:8765/`
- Health check: `http://127.0.0.1:8765/api/health`
- Admin panel: login dari tombol `Masuk Admin` di website publik

## Endpoint Utama

- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`
- `GET /api/pengaduan`
- `POST /api/pengaduan`
- `GET /api/pengaduan/:ticket`
- `GET /api/berita`
- `POST/PATCH/DELETE /api/berita`
- `GET /api/agenda`
- `POST/PATCH/DELETE /api/agenda`
- `GET /api/galeri`
- `POST/PATCH/DELETE /api/galeri`
- `GET/POST/PATCH/DELETE /api/regulasi`
- `GET/POST/PATCH/DELETE /api/pengguna`
- `GET /api/logs`
- `POST /api/survei`
- `POST /api/kontak`
- `POST /api/ppid`
- `GET/PATCH /api/ppid`
- `GET /api/stats`
- `POST /api/sync/wa-sheet` untuk impor pengaduan dari Google Sheet WhatsApp/n8n

Data tersimpan di `data/db.json`.

## Sinkronisasi WhatsApp/n8n

Sumber default:

```text
https://docs.google.com/spreadsheets/d/1zgfpQLZ-THJIXDA8c1365qYfKepAfdv-ETuAVv5LIX4/export?format=csv&gid=0
```

Endpoint sync membutuhkan sesi admin. Login dulu, lalu panggil `POST /api/sync/wa-sheet`.
Data dipetakan ke koleksi `pengaduan` dan tidak dibuat dobel karena dicocokkan memakai `NoTiket`.

Backend juga menjalankan auto-sync saat server hidup:

- Default: setiap 5 menit.
- Ubah interval: set `WA_SHEET_SYNC_INTERVAL_MS`, contoh `60000` untuk 1 menit.
- Matikan auto-sync: set `WA_SHEET_AUTO_SYNC=0`.
- Admin juga bisa menjalankan sync dari halaman `Pengaduan` lewat tombol `Sync WA`.

## Update Status ke Google Sheet

Supaya perubahan status dari admin website ikut mengubah Google Sheet, sediakan webhook n8n/Apps Script lalu jalankan backend dengan:

```powershell
$env:WA_STATUS_WEBHOOK_URL="https://alamat-webhook-n8n-anda"
node server.js
```

Saat admin mengubah status pengaduan yang bersumber dari WhatsApp/n8n, backend akan mengirim payload:

```json
{
  "noTiket": "TKT-223402105",
  "id": "TKT-223402105",
  "status": "Proses",
  "catatan": "",
  "updatedAt": "2026-05-26T00:00:00.000Z",
  "updatedBy": {
    "id": 1,
    "nama": "Admin Utama",
    "username": "admin",
    "peran": "Super Admin"
  }
}
```

Di n8n, cari row Google Sheet berdasarkan `NoTiket`, lalu update kolom `Status`.
Di admin website, hasil update Sheet akan ditampilkan sebagai toast: berhasil, gagal, atau webhook belum dikonfigurasi.

## Akun Demo

- Super Admin: `admin` / `admin123`
- Admin Kabupaten Tarakan: `admin.tarakan` / `kabupaten123`
- Admin Kota Nunukan: `admin.nunukan` / `kota123`
