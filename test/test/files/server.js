const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const PORT = Number(process.env.PORT || 8765);
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
};

const nowIso = () => new Date().toISOString();
const publicTicket = () => "SP-" + crypto.randomBytes(3).toString("hex").toUpperCase();
const hashPassword = (password) => crypto.createHash("sha256").update(String(password || "")).digest("hex");
const tokenHash = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");
const DAERAH_TRANTIBUM = ["Kota Tarakan", "Kabupaten Bulungan", "Kabupaten Malinau", "Kabupaten Tana Tidung", "Kabupaten Nunukan"];
const WA_SHEET_ID = process.env.WA_SHEET_ID || "1zgfpQLZ-THJIXDA8c1365qYfKepAfdv-ETuAVv5LIX4";
const WA_SHEET_GID = process.env.WA_SHEET_GID || "0";
const WA_SHEET_CSV_URL = process.env.WA_SHEET_CSV_URL || `https://docs.google.com/spreadsheets/d/${WA_SHEET_ID}/export?format=csv&gid=${WA_SHEET_GID}`;
const WA_SHEET_AUTO_SYNC = process.env.WA_SHEET_AUTO_SYNC !== "0";
const WA_SHEET_SYNC_INTERVAL_MS = Math.max(30_000, Number(process.env.WA_SHEET_SYNC_INTERVAL_MS || 300_000));
const WA_STATUS_WEBHOOK_URL = process.env.WA_STATUS_WEBHOOK_URL || "";
let waSheetSyncRunning = false;

const ROLE_PERMISSIONS = {
  "Super Admin": ["*"],
  "Admin Provinsi": ["dashboard", "pengaduan", "berita", "agenda", "galeri", "profil", "regulasi", "ppid", "statistik", "log"],
  "Admin Kabupaten": ["dashboard", "pengaduan", "agenda", "galeri", "ppid", "statistik"],
  "Admin Kota": ["dashboard", "pengaduan", "agenda", "galeri", "ppid", "statistik"],
  Editor: ["dashboard", "berita", "agenda", "galeri", "profil", "regulasi"],
  Operator: ["dashboard", "pengaduan", "ppid"],
};

const ROLE_MUTATIONS = {
  "Super Admin": ["*"],
  "Admin Provinsi": ["pengaduan", "berita", "agenda", "galeri", "profil", "regulasi", "ppid", "cms"],
  "Admin Kabupaten": ["pengaduan", "agenda", "galeri", "ppid"],
  "Admin Kota": ["pengaduan", "agenda", "galeri", "ppid"],
  Editor: ["berita", "agenda", "galeri", "profil", "regulasi", "cms"],
  Operator: ["pengaduan", "ppid"],
};

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body, null, 2));
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function publicUser(user) {
  const permissions = ROLE_PERMISSIONS[user.peran] || ROLE_PERMISSIONS.Operator;
  return {
    id: user.id,
    nama: user.nama,
    username: user.username,
    peran: user.peran,
    akses: user.akses,
    email: user.email,
    wilayah: user.wilayah || "",
    status: user.status || "Aktif",
    permissions,
  };
}

function canAccess(user, resource, method) {
  if (!user) return false;
  if (user.peran === "Super Admin") return true;
  if (method === "GET") return true;
  return (ROLE_MUTATIONS[user.peran] || []).includes(resource);
}

function getBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function findSessionUser(db, req) {
  const token = getBearer(req);
  if (!token) return null;
  const sessions = Array.isArray(db.sessions) ? db.sessions : [];
  const session = sessions.find((item) => item.tokenHash === tokenHash(token) && new Date(item.expiresAt).getTime() > Date.now());
  if (!session) return null;
  const user = (db.pengguna || []).find((item) => String(item.id) === String(session.userId) && item.status !== "Nonaktif");
  return user || null;
}

function sameScope(user, row) {
  if (!user || !user.wilayah || user.peran === "Super Admin" || user.peran === "Admin Provinsi") return true;
  const scope = normalizeDaerah(user.wilayah).toLowerCase();
  const text = [row.wil, row.wilayah, row.daerah, row.lokasi, row.lok].filter(Boolean).map((value) => normalizeDaerah(value).toLowerCase()).join(" ");
  return text.includes(scope);
}

function normalizeDaerah(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const low = raw.toLowerCase();
  if (low.includes("tarakan")) return "Kota Tarakan";
  if (low.includes("bulungan") || low.includes("tanjung selor")) return "Kabupaten Bulungan";
  if (low.includes("malinau")) return "Kabupaten Malinau";
  if (low.includes("tana tidung") || low.includes("tidung")) return "Kabupaten Tana Tidung";
  if (low.includes("nunukan")) return "Kabupaten Nunukan";
  return raw;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((items) => items.some((item) => String(item || "").trim()));
}

function sheetObjects(csvText) {
  const rows = parseCsv(csvText);
  const headers = rows.shift() || [];
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [String(header || "").trim(), String(row[index] || "").trim()])));
}

function sheetStatus(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("selesai") || raw.includes("closed") || raw.includes("done")) return "Selesai";
  if (raw.includes("confirm") || raw.includes("proses") || raw.includes("ditangani")) return "Proses";
  return "Baru";
}

function sheetDateDisplay(value) {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const normalized = raw.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw.split(" ")[0] || raw;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function cleanPhone(value) {
  return String(value || "").replace("@c.us", "").replace("@lid", "").trim();
}

function sheetPengaduan(row) {
  const ticket = row.NoTiket || row.noTiket || row.ticket || "";
  const wilayah = normalizeDaerah(row["Kabupaten, Terjadinya Pelanggaran Trantibum"] || row.DOMISILI || row.domisili || "");
  const kecamatan = row[" Kecamatan, Terjadinya Pelanggaran Trantibum"] || "";
  const desa = row[" Desa/Kelurahan, Terjadinya  Pelanggaran Trantibum"] || "";
  const alamat = row["Lokasi dan Alamat Lengkap Terjadinya Pelanggaran "] || row["Lokasi dan Alamat Lengkap Terjadinya Pelanggaran"] || "";
  const lokasi = [alamat, desa, kecamatan, wilayah].filter(Boolean).join(", ");
  const kategori = row.KLASIFIKASI || row["Ranah Perda"] || row.layanan || "Pengaduan WhatsApp";
  const nama = row["Nama Pelapor"] || cleanPhone(row["Nomor Telepon"]) || "Pelapor WhatsApp";
  return {
    id: ticket,
    nama,
    kontak: cleanPhone(row["Nomor Telepon"] || row.From),
    kat: kategori,
    kategori,
    lokasi: lokasi || wilayah || row.DOMISILI || "-",
    wil: wilayah || normalizeDaerah(row.DOMISILI),
    wilayah: wilayah || normalizeDaerah(row.DOMISILI),
    daerah: wilayah || normalizeDaerah(row.DOMISILI),
    tgl: sheetDateDisplay(row["Waktu Laporan"]),
    status: sheetStatus(row.Status),
    prio: "Sedang",
    isi: row.DETAIL || row.Laporan || "-",
    sumber: "WhatsApp n8n",
    sumberId: ticket,
    waTicket: ticket,
    waFrom: row.From || "",
    nik: row.NIK || "",
    buktiUrl: row["Foto/Link Bukti"] || "",
    pic: row.PIC || "",
    waktuLaporan: row["Waktu Laporan"] || "",
    waktuKejadian: row["Waktu Kejadian"] || "",
    rawSheet: row,
    riwayat: [{ aksi: "Diimpor", wkt: nowIso(), petugas: "Sinkronisasi Sheet", ket: `Data diimpor dari WhatsApp/n8n (${ticket}).` }],
    createdAt: nowIso(),
  };
}

async function syncWaSheet(db) {
  const response = await fetch(WA_SHEET_CSV_URL);
  if (!response.ok) {
    const err = new Error(`Gagal mengambil Google Sheet (${response.status}). Pastikan sheet bisa diakses publik atau WA_SHEET_CSV_URL benar.`);
    err.status = 502;
    throw err;
  }
  const rows = sheetObjects(await response.text()).filter((row) => row.NoTiket);
  if (!Array.isArray(db.pengaduan)) db.pengaduan = [];
  if (!Array.isArray(db.logs)) db.logs = [];
  let imported = 0;
  let updated = 0;
  const now = nowIso();
  for (const row of rows) {
    const item = sheetPengaduan(row);
    const idx = db.pengaduan.findIndex((existing) => String(existing.sumberId || existing.waTicket || existing.id) === String(item.sumberId));
    if (idx >= 0) {
      db.pengaduan[idx] = {
        ...db.pengaduan[idx],
        ...item,
        riwayat: db.pengaduan[idx].riwayat || item.riwayat,
        createdAt: db.pengaduan[idx].createdAt || item.createdAt,
        updatedAt: now,
      };
      updated += 1;
    } else {
      db.pengaduan.unshift(item);
      imported += 1;
    }
  }
  db.logs.unshift({ wkt: now, admin: "Sinkronisasi Sheet", aksi: "Sinkronisasi", modul: "Pengaduan", detail: `${imported} data baru, ${updated} data diperbarui dari WhatsApp/n8n`, ip: "local" });
  return { total: rows.length, imported, updated, source: WA_SHEET_CSV_URL };
}

async function syncWaSheetToDisk(reason = "auto") {
  if (waSheetSyncRunning) return { skipped: true, reason: "Sinkronisasi sebelumnya masih berjalan." };
  waSheetSyncRunning = true;
  try {
    const db = await readDb();
    const result = await syncWaSheet(db);
    await writeDb(db);
    console.log(`[WA Sheet Sync:${reason}] ${result.imported} baru, ${result.updated} diperbarui dari ${result.total} baris.`);
    return result;
  } catch (err) {
    console.warn(`[WA Sheet Sync:${reason}] ${err.message || err}`);
    return { error: err.message || String(err) };
  } finally {
    waSheetSyncRunning = false;
  }
}

async function pushWaStatusUpdate(item, patch, authUser) {
  if (!WA_STATUS_WEBHOOK_URL || !item || item.sumber !== "WhatsApp n8n") {
    return null;
  }
  const payload = {
    noTiket: item.waTicket || item.sumberId || item.id,
    id: item.id,
    status: item.status,
    catatan: patch.catatan || patch.keterangan || "",
    updatedAt: item.updatedAt || nowIso(),
    updatedBy: authUser ? {
      id: authUser.id,
      nama: authUser.nama,
      username: authUser.username,
      peran: authUser.peran,
    } : null,
  };
  const response = await fetch(WA_STATUS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(`Webhook update status WA gagal (${response.status}) ${text}`.trim());
    err.status = 502;
    throw err;
  }
  return { ok: true, status: response.status };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }
}

async function readDb() {
  const raw = await fs.readFile(DB_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2) + "\n", "utf8");
}

function list(db, key, query) {
  let data = Array.isArray(db[key]) ? [...db[key]] : [];
  if (query.get("status")) data = data.filter((item) => String(item.status || "").toLowerCase() === query.get("status").toLowerCase());
  if (query.get("cat")) data = data.filter((item) => String(item.cat || item.kat || "").toLowerCase() === query.get("cat").toLowerCase());
  if (query.get("q")) {
    const q = query.get("q").toLowerCase();
    data = data.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }
  return data;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => !String(body[field] || "").trim());
  if (missing.length) {
    const err = new Error(`Field wajib belum diisi: ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }
}

function normalizeGaleriBody(body) {
  const title = String(body.judul || body.title || "").trim();
  const cat = String(body.kat || body.cat || "operasi").trim().toLowerCase();
  return {
    ...body,
    title,
    judul: title,
    cat,
    kat: cat,
    desc: String(body.desc || "").trim(),
    type: body.type === "video" ? "video" : "img",
    size: body.size || "wide",
    color: body.color || "0a5c8a/d6edf7",
    imageUrl: body.imageUrl || body.mediaUrl || "",
    mediaUrl: body.mediaUrl || body.imageUrl || "",
  };
}

function safeUploadExt(fileName, mime) {
  const fromName = path.extname(String(fileName || "")).toLowerCase();
  const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm"]);
  if (allowed.has(fromName)) return fromName;
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/webm") return ".webm";
  return ".jpg";
}

async function saveUpload(body) {
  const mime = String(body.mime || body.type || "").toLowerCase();
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(mime) && !/^video\/(mp4|webm)$/.test(mime)) {
    const err = new Error("Format file belum didukung. Gunakan JPG, PNG, WEBP, GIF, MP4, atau WEBM.");
    err.status = 400;
    throw err;
  }
  const raw = String(body.data || "");
  const base64 = raw.includes(",") ? raw.split(",").pop() : raw;
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) {
    const err = new Error("Ukuran file kosong atau melebihi 12MB.");
    err.status = 400;
    throw err;
  }
  const ext = safeUploadExt(body.fileName, mime);
  const dir = path.join(ROOT, "uploads");
  await fs.mkdir(dir, { recursive: true });
  const file = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  await fs.writeFile(path.join(dir, file), buffer);
  return {
    url: `/uploads/${file}`,
    fileName: String(body.fileName || file),
    mime,
    size: buffer.length,
  };
}

async function handleApi(req, res, url) {
  const db = await readDb();
  const method = req.method || "GET";
  const parts = url.pathname.split("/").filter(Boolean);
  const resource = parts[1];
  const id = parts[2];
  const authUser = findSessionUser(db, req);

  if (method === "GET" && resource === "health") {
    return json(res, 200, { ok: true, service: "satpolpp-backend", time: nowIso() });
  }

  if (method === "POST" && resource === "login") {
    const body = await readBody(req);
    requireFields(body, ["username", "password"]);
    const user = (db.pengguna || []).find((item) => String(item.username || "").toLowerCase() === String(body.username).toLowerCase());
    if (!user || user.status === "Nonaktif" || user.passwordHash !== hashPassword(body.password)) {
      return json(res, 401, { error: "Username atau kata sandi salah." });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    if (!Array.isArray(db.sessions)) db.sessions = [];
    db.sessions = db.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now() && String(item.userId) !== String(user.id));
    db.sessions.push({ id: crypto.randomUUID(), userId: user.id, tokenHash: tokenHash(token), createdAt: nowIso(), expiresAt });
    user.loginTerakhir = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    await writeDb(db);
    return json(res, 200, { token, expiresAt, user: publicUser(user) });
  }

  if (method === "GET" && resource === "me") {
    return authUser ? json(res, 200, publicUser(authUser)) : json(res, 401, { error: "Belum login." });
  }

  if (method === "POST" && resource === "logout") {
    const bearerHash = tokenHash(getBearer(req));
    if (Array.isArray(db.sessions)) {
      db.sessions = db.sessions.filter((item) => item.tokenHash !== bearerHash);
      await writeDb(db);
    }
    return json(res, 200, { ok: true });
  }

  if (method === "POST" && resource === "upload") {
    if (!authUser) return json(res, 401, { error: "Sesi admin diperlukan." });
    const body = await readBody(req);
    requireFields(body, ["data"]);
    return json(res, 201, await saveUpload(body));
  }

  if ((method === "POST" || method === "GET") && resource === "sync" && id === "wa-sheet") {
    if (!authUser) return json(res, 401, { error: "Sesi admin diperlukan." });
    const result = await syncWaSheetToDisk("manual");
    return json(res, 200, { ok: true, ...result });
  }

  if (method === "GET" && resource === "stats") {
    let pengaduan = db.pengaduan || [];
    if (authUser && ["Admin Kabupaten", "Admin Kota"].includes(authUser.peran)) {
      pengaduan = pengaduan.filter((row) => sameScope(authUser, row));
    }
    return json(res, 200, {
      pengaduan: {
        total: pengaduan.length,
        baru: pengaduan.filter((x) => x.status === "Baru").length,
        proses: pengaduan.filter((x) => x.status === "Proses").length,
        selesai: pengaduan.filter((x) => x.status === "Selesai").length,
      },
      survei: {
        total: (db.survei || []).length,
        rataRata: (db.survei || []).length
          ? Number(((db.survei || []).reduce((sum, x) => sum + Number(x.rating || 0), 0) / db.survei.length).toFixed(2))
          : 0,
      },
    });
  }

  const collectionMap = {
    pengaduan: "pengaduan",
    berita: "berita",
    agenda: "agenda",
    galeri: "galeri",
    regulasi: "regulasi",
    pengguna: "pengguna",
    logs: "logs",
    survei: "survei",
    kontak: "kontak",
    ppid: "ppid",
    cms: "cms",
  };
  const key = collectionMap[resource];
  if (!key) return notFound(res);

  const publicGetResources = new Set(["pengaduan", "berita", "agenda", "galeri", "regulasi", "survei", "logs", "cms"]);
  const publicPostResources = new Set(["pengaduan", "kontak", "ppid", "survei"]);
  const isPublicRequest = (method === "GET" && publicGetResources.has(resource) && resource !== "pengguna") || (method === "POST" && publicPostResources.has(resource));
  if (!isPublicRequest) {
    if (!authUser) return json(res, 401, { error: "Sesi admin diperlukan." });
    if (!canAccess(authUser, resource, method)) return json(res, 403, { error: "Hak akses tidak cukup untuk fitur ini." });
  }

  if (method === "GET") {
    if (resource === "pengaduan" && id) {
      const ticket = id.toUpperCase();
      const found = (db.pengaduan || []).find((item) => item.id === ticket);
      if (found && authUser && ["Admin Kabupaten", "Admin Kota"].includes(authUser.peran) && !sameScope(authUser, found)) {
        return json(res, 403, { error: "Data di luar wilayah akun ini." });
      }
      return found ? json(res, 200, found) : notFound(res);
    }
    if (id) {
      const found = (db[key] || []).find((item) => String(item.id) === String(id));
      return found ? json(res, 200, found) : notFound(res);
    }
    let rows = list(db, key, url.searchParams);
    if (authUser && ["Admin Kabupaten", "Admin Kota"].includes(authUser.peran) && ["pengaduan", "agenda"].includes(resource)) {
      rows = rows.filter((row) => sameScope(authUser, row));
    }
    if (resource === "pengguna") rows = rows.map(publicUser);
    return json(res, 200, rows);
  }

  if (method === "POST") {
    const body = await readBody(req);
    if (!Array.isArray(db[key])) db[key] = [];

    if (resource === "cms") {
      const cmsKey = String(body.key || body.id || "").trim();
      requireFields({ key: cmsKey, html: body.html }, ["key", "html"]);
      const idx = db.cms.findIndex((item) => String(item.key || item.id) === cmsKey);
      const item = {
        ...(idx >= 0 ? db.cms[idx] : { id: cmsKey, key: cmsKey, createdAt: nowIso() }),
        ...body,
        id: cmsKey,
        key: cmsKey,
        updatedAt: nowIso(),
      };
      if (idx >= 0) db.cms[idx] = item;
      else db.cms.unshift(item);
      if (db.logs) db.logs.unshift({ wkt: nowIso(), admin: authUser?.nama || "Sistem", aksi: "Update", modul: "PROFIL", detail: `Konten profil ${cmsKey} diperbarui`, ip: req.socket.remoteAddress });
      await writeDb(db);
      return json(res, idx >= 0 ? 200 : 201, item);
    }

    if (resource === "pengaduan") {
      if (authUser && !canAccess(authUser, resource, method)) {
        return json(res, 403, { error: "Hak akses tidak cukup untuk fitur ini." });
      }
      requireFields(body, ["nama", "lokasi", "kategori", "uraian"]);
      const isAdminInput = Boolean(authUser);
      const wilayah = ["Admin Kabupaten", "Admin Kota"].includes(authUser?.peran)
        ? normalizeDaerah(authUser.wilayah)
        : normalizeDaerah(body.wilayah || body.daerah || body.lokasi);
      if (isAdminInput && !DAERAH_TRANTIBUM.includes(wilayah)) {
        return json(res, 400, { error: "Pilih daerah laporan yang valid." });
      }
      const item = {
        id: publicTicket(),
        nama: String(body.nama).trim(),
        kontak: String(body.kontak || "").trim(),
        kat: String(body.kategori).trim(),
        lokasi: String(body.lokasi).trim(),
        wil: wilayah,
        wilayah,
        daerah: wilayah,
        tgl: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        status: "Baru",
        prio: body.prio || "Sedang",
        isi: String(body.uraian).trim(),
        sumber: isAdminInput ? "Laporan langsung" : "Website publik",
        dibuatOleh: isAdminInput ? (authUser.nama || authUser.username || "Admin") : "Masyarakat",
        dibuatOlehId: isAdminInput ? authUser.id : "",
        dibuatOlehUsername: isAdminInput ? authUser.username : "",
        dibuatOlehPeran: isAdminInput ? authUser.peran : "",
        riwayat: [{ aksi: "Dibuat", wkt: nowIso(), petugas: isAdminInput ? (authUser.nama || authUser.username || "Admin") : "Sistem", ket: isAdminInput ? `Laporan langsung diinput admin ${wilayah}.` : "Pengaduan diterima dari website." }],
        createdAt: nowIso(),
      };
      db.pengaduan.unshift(item);
      db.logs.unshift({ wkt: nowIso(), admin: item.dibuatOleh, aksi: "Tambah", modul: "Pengaduan", detail: `Tiket ${item.id} dibuat untuk ${wilayah}`, ip: req.socket.remoteAddress });
      await writeDb(db);
      return json(res, 201, item);
    }

    if (resource === "kontak") requireFields(body, ["nama", "email", "pesan"]);
    if (resource === "ppid") requireFields(body, ["pemohon", "email", "info"]);
    if (resource === "survei") requireFields(body, ["rating"]);
    if (resource === "galeri" && !String(body.title || body.judul || "").trim()) requireFields(body, ["title"]);

    const item = {
      id: crypto.randomUUID(),
      ...(resource === "galeri" ? normalizeGaleriBody(body) : body),
      createdAt: nowIso(),
    };
    if (resource === "pengguna") {
      item.passwordHash = hashPassword(body.password || body.sandi || "admin123");
      item.akses = item.akses || (ROLE_PERMISSIONS[item.peran] || []).join(", ");
    }
    db[key].unshift(item);
    if (db.logs && resource !== "logs") db.logs.unshift({ wkt: nowIso(), admin: "Sistem", aksi: "Tambah", modul: resource.toUpperCase(), detail: `Data ${resource} baru`, ip: req.socket.remoteAddress });
    await writeDb(db);
    if (resource === "pengguna") return json(res, 201, publicUser(item));
    return json(res, 201, item);
  }

  if ((method === "PUT" || method === "PATCH") && id) {
    const body = await readBody(req);
    const idx = (db[key] || []).findIndex((item) => String(item.id) === String(id));
    if (resource === "cms" && idx < 0) {
      if (!Array.isArray(db.cms)) db.cms = [];
      const item = { id, key: body.key || id, ...body, createdAt: nowIso(), updatedAt: nowIso() };
      db.cms.unshift(item);
      if (db.logs) db.logs.unshift({ wkt: nowIso(), admin: authUser?.nama || "Sistem", aksi: "Update", modul: "PROFIL", detail: `Konten profil ${item.key} diperbarui`, ip: req.socket.remoteAddress });
      await writeDb(db);
      return json(res, 201, item);
    }
    if (idx < 0) return notFound(res);
    if (authUser && ["Admin Kabupaten", "Admin Kota"].includes(authUser.peran) && ["pengaduan", "agenda"].includes(resource) && !sameScope(authUser, db[key][idx])) {
      return json(res, 403, { error: "Data di luar wilayah akun ini." });
    }
    const patch = resource === "galeri" ? normalizeGaleriBody({ ...db[key][idx], ...body }) : body;
    if (resource === "pengguna" && (body.password || body.sandi)) {
      patch.passwordHash = hashPassword(body.password || body.sandi);
      delete patch.password;
      delete patch.sandi;
    }
    db[key][idx] = { ...db[key][idx], ...patch, updatedAt: nowIso() };
    await writeDb(db);
    if (resource === "pengaduan" && Object.prototype.hasOwnProperty.call(body, "status")) {
      try {
        const sheetUpdate = await pushWaStatusUpdate(db[key][idx], body, authUser);
        if (sheetUpdate) {
          db[key][idx].sheetUpdate = sheetUpdate;
          if (db.logs) db.logs.unshift({ wkt: nowIso(), admin: authUser?.nama || "Sistem", aksi: "Update Sheet", modul: "Pengaduan", detail: `Status ${db[key][idx].id} dikirim ke Google Sheet`, ip: req.socket.remoteAddress });
        }
      } catch (err) {
        db[key][idx].sheetUpdate = { ok: false, error: err.message || "Gagal update Google Sheet." };
        if (db.logs) db.logs.unshift({ wkt: nowIso(), admin: authUser?.nama || "Sistem", aksi: "Gagal Update Sheet", modul: "Pengaduan", detail: `${db[key][idx].id}: ${db[key][idx].sheetUpdate.error}`, ip: req.socket.remoteAddress });
      }
      await writeDb(db);
    }
    if (resource === "pengguna") return json(res, 200, publicUser(db[key][idx]));
    return json(res, 200, db[key][idx]);
  }

  if (method === "DELETE" && id) {
    const idx = (db[key] || []).findIndex((item) => String(item.id) === String(id));
    if (idx < 0) return notFound(res);
    if (authUser && ["Admin Kabupaten", "Admin Kota"].includes(authUser.peran) && ["pengaduan", "agenda"].includes(resource) && !sameScope(authUser, db[key][idx])) {
      return json(res, 403, { error: "Data di luar wilayah akun ini." });
    }
    const [removed] = db[key].splice(idx, 1);
    await writeDb(db);
    return json(res, 200, removed);
  }

  json(res, 405, { error: "Method not allowed" });
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  
  // 1. Jika akses root, langsung ke index.html
  if (pathname === "/") pathname = "/beranda.html";

  // 2. Arahkan folder publik ke "New folder (3)"
  const PUBLIC_DIR = path.join(ROOT, "public");
  let target = path.resolve(PUBLIC_DIR, "." + pathname);

  // 3. Keamanan: pastikan tidak ada yang bisa akses file di luar folder publik
  if (!target.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    let file = target;
    
    try {
      // Cek apakah file aslinya ada (misal: gambar.png, css/style.css, atau folder)
      const stat = await fs.stat(target);
      if (stat.isDirectory()) {
        file = path.join(target, "beranda.html");
      }
    } catch (err) {
      // JIKA FILE TIDAK DITEMUKAN:
      // Cek apakah path tersebut tidak memiliki ekstensi titik (seperti /profil, /informasi)
      if (!path.extname(target)) {
        // Coba tambahkan .html secara paksa di belakangnya
        const htmlTarget = target + ".html";
        
        // Cek lagi apakah file dengan .html itu ada
        await fs.stat(htmlTarget); 
        
        // Jika ada, jadikan itu sebagai file yang akan disajikan
        file = htmlTarget; 
      } else {
        // Jika file memang tidak ada dan punya ekstensi (misal salah ketik gambar.jpg), lempar error
        throw err;
      }
    }

    // Baca file dan kirimkan ke browser pengunjung
    const data = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
    
  } catch {
    // Jika semua percobaan di atas gagal, tampilkan Not Found 404
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    await serveStatic(req, res, url);
  } catch (err) {
    json(res, err.status || 500, { error: err.message || "Internal server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Satpol PP backend ready: http://${HOST}:${PORT}`);
  console.log(`API health: http://${HOST}:${PORT}/api/health`);
  if (WA_SHEET_AUTO_SYNC) {
    console.log(`WA Sheet auto-sync aktif tiap ${Math.round(WA_SHEET_SYNC_INTERVAL_MS / 1000)} detik.`);
    syncWaSheetToDisk("startup");
    setInterval(() => syncWaSheetToDisk("interval"), WA_SHEET_SYNC_INTERVAL_MS);
  } else {
    console.log("WA Sheet auto-sync nonaktif.");
  }
});
