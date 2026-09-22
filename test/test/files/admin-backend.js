(function () {
  const endpoints = {
    pengaduan: "/api/pengaduan",
    berita: "/api/berita",
    agenda: "/api/agenda",
    galeri: "/api/galeri",
    regulasi: "/api/regulasi",
    pengguna: "/api/pengguna",
    logs: "/api/logs",
    ppid: "/api/ppid",
    cms: "/api/cms",
  };

  let ppidData = [];
  let cmsData = [];
  let currentPPIDIdx = null;
  let currentGaleriIdx = null;
  const DAERAH_TRANTIBUM = ["Kota Tarakan", "Kabupaten Bulungan", "Kabupaten Malinau", "Kabupaten Tana Tidung", "Kabupaten Nunukan"];

  const qs = (id) => document.getElementById(id);
  const value = (id) => (qs(id)?.value || "").trim();
  const AUTH_KEY = "satpolpp_admin_session";
  let currentUser = null;

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(AUTH_KEY);
  }

  function authHeaders() {
    const token = getSession()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function api(path, options) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...authHeaders(), ...(options && options.headers) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "API gagal diproses.");
    return data;
  }

  function hasPermission(page) {
    const permissions = currentUser?.permissions || [];
    return permissions.includes("*") || permissions.includes(page);
  }

  function applyCurrentUser(user) {
    currentUser = user;
    const nameEl = document.querySelector(".sidebar-user .user-info b");
    const roleEl = document.querySelector(".sidebar-user .user-info span");
    const avatarEl = document.querySelector(".sidebar-user .user-avatar");
    if (nameEl) nameEl.textContent = user.nama || user.username || "Admin";
    if (roleEl) roleEl.textContent = [user.peran, user.wilayah].filter(Boolean).join(" - ");
    if (avatarEl) avatarEl.textContent = String(user.nama || user.username || "A").trim().charAt(0).toUpperCase();

    document.querySelectorAll(".sidebar-nav .nav-item").forEach((btn) => {
      const match = btn.getAttribute("onclick")?.match(/showPage\('([^']+)'/);
      if (!match) return;
      btn.style.display = hasPermission(match[1]) ? "" : "none";
    });
    applyPengaduanWilayahOptions();
  }

  async function requireLogin() {
    const session = getSession();
    if (!session?.token) {
      window.location.href = "/satpolpp-kaltara.html?login=required";
      return false;
    }
    try {
      const user = await api("/api/me");
      saveSession({ ...session, user });
      applyCurrentUser(user);
      return true;
    } catch {
      clearSession();
      window.location.href = "/satpolpp-kaltara.html?login=expired";
      return false;
    }
  }

  function replaceArray(target, rows, normalize) {
    target.splice(0, target.length, ...rows.map(normalize || ((x) => x)));
  }

  function normalizePengaduan(d) {
    return { ...d, kat: d.kat || d.kategori || "-", wil: d.wil || d.wilayah || d.daerah || d.lokasi || "-", prio: d.prio || "Sedang", status: d.status || "Baru", riwayat: Array.isArray(d.riwayat) ? d.riwayat : [] };
  }

  function normalizeDaerah(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("tarakan")) return "Kota Tarakan";
    if (text.includes("bulungan") || text.includes("tanjung selor")) return "Kabupaten Bulungan";
    if (text.includes("malinau")) return "Kabupaten Malinau";
    if (text.includes("tana tidung") || text.includes("tidung")) return "Kabupaten Tana Tidung";
    if (text.includes("nunukan")) return "Kabupaten Nunukan";
    return String(value || "").trim();
  }

  function isAdminDaerah() {
    return ["Admin Kabupaten", "Admin Kota"].includes(currentUser?.peran);
  }

  function applyPengaduanWilayahOptions() {
    const select = qs("newAduanWilayah");
    if (!select) return;
    const allowed = isAdminDaerah() ? [normalizeDaerah(currentUser.wilayah)] : DAERAH_TRANTIBUM;
    select.innerHTML = allowed.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
    select.disabled = isAdminDaerah();
  }

  function normalizeGaleri(g) {
    const mediaUrl = g.mediaUrl || g.imageUrl || "";
    return { ...g, judul: g.judul || g.title || "Media", title: g.title || g.judul || "Media", kat: g.kat || g.cat || "operasi", cat: g.cat || g.kat || "operasi", color: g.color || "0a5c8a/d6edf7", mediaUrl, imageUrl: g.imageUrl || mediaUrl };
  }

  function mediaSrc(item, fallback) {
    return item?.imageUrl || item?.mediaUrl || fallback;
  }

  function uploadFile(file) {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          resolve(await api("/api/upload", {
            method: "POST",
            body: JSON.stringify({ fileName: file.name, mime: file.type, data: reader.result }),
          }));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Gagal membaca file upload."));
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function sanitizeCms(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html || "";
    wrap.querySelectorAll("script").forEach((item) => item.remove());
    wrap.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
    });
    return wrap.innerHTML;
  }

  function galeriCategory(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("edukasi")) return "edukasi";
    if (text.includes("patroli")) return "patroli";
    if (text.includes("linmas")) return "linmas";
    if (text.includes("sosial")) return "sosial";
    return "operasi";
  }

  function galeriColor(cat) {
    return {
      operasi: "0a5c8a/d6edf7",
      edukasi: "1a7a3e/e8f7ee",
      patroli: "c9922a/fdf3e3",
      linmas: "c0392b/fdecea",
      sosial: "7b2d8b/f3e8fd",
    }[cat] || "0a5c8a/d6edf7";
  }

  async function loadCollection(name) {
    const rows = await api(endpoints[name]);
    if (name === "pengaduan") replaceArray(pengaduanData, rows, normalizePengaduan);
    if (name === "berita") replaceArray(beritaData, rows);
    if (name === "agenda") replaceArray(agendaData, rows);
    if (name === "galeri") replaceArray(galeriData, rows, normalizeGaleri);
    if (name === "regulasi") replaceArray(regulasiData, rows);
    if (name === "pengguna") replaceArray(penggunaData, rows);
    if (name === "logs") replaceArray(logData, rows);
    if (name === "ppid") ppidData = rows;
    if (name === "cms") cmsData = rows;
  }

  async function refreshAll() {
    await Promise.all(["pengaduan", "berita", "agenda", "galeri", "regulasi", "pengguna", "logs", "ppid", "cms"].map(loadCollection));
    updateBadge();
    renderDashboardStats();
    applyCmsToProfilForm();
  }

 const profilSectionMap = {
    "kata-pengantar": "kataPengantar",
    "latar-belakang": "latarBelakang",
    "visi-misi": "visiMisi",
    struktur: "strukturOrg",
    pimpinan: "profilPimpinan",
    "tampilan-beranda": "tampilanBeranda", // TAMBAHKAN INI
};

  function cmsRow(key) {
    return cmsData.find((item) => String(item.key || item.id) === key);
  }

  function cmsHtmlToBody(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = sanitizeCms(html);
    const firstTitle = wrap.querySelector("h3");
    if (firstTitle) firstTitle.remove();
    return wrap.innerHTML.trim();
  }

  function setPanelValue(panel, selector, value) {
    const el = panel?.querySelector(selector);
    if (el && value !== undefined && value !== null) el.value = value;
  }

  function applyCmsToProfilForm() {
    const kata = cmsRow("kataPengantar");
    const kataPanel = qs("profil-kata-pengantar");
    if (kata && kataPanel) {
      setPanelValue(kataPanel, "input[type='text']", kata.title || kata.fields?.title);
      const area = kataPanel.querySelector(".rte-area");
      if (area) area.innerHTML = sanitizeCms(kata.fields?.bodyHtml || cmsHtmlToBody(kata.html));
    }

    const latar = cmsRow("latarBelakang");
    const latarPanel = qs("profil-latar-belakang");
    if (latar && latarPanel) {
      const area = latarPanel.querySelector(".rte-area");
      if (area) area.innerHTML = sanitizeCms(latar.fields?.bodyHtml || cmsHtmlToBody(latar.html));
    }

    const visi = cmsRow("visiMisi");
    const visiPanel = qs("profil-visi-misi");
    if (visi && visiPanel) {
      const textareas = visiPanel.querySelectorAll("textarea");
      if (textareas[0] && visi.fields?.visi) textareas[0].value = visi.fields.visi;
      if (textareas[1] && Array.isArray(visi.fields?.misi)) textareas[1].value = visi.fields.misi.join("\n");
    }

    const struktur = cmsRow("strukturOrg");
    if (struktur && Array.isArray(struktur.fields?.jabatan)) {
      const list = qs("jabatanList");
      if (list) {
        list.innerHTML = "";
        struktur.fields.jabatan.forEach((row) => addJabatan(row.jabatan || "", row.nama || ""));
      }
    }

    const pimpinan = cmsRow("profilPimpinan");
    const pimpinanPanel = qs("profil-pimpinan");
    if (pimpinan && pimpinanPanel) {
      const inputs = pimpinanPanel.querySelectorAll("input");
      const fields = pimpinan.fields || {};
      if (inputs[0]) inputs[0].value = fields.nama || "";
      if (inputs[1]) inputs[1].value = fields.jabatan || "";
      if (inputs[2]) inputs[2].value = fields.periode || "";
      if (inputs[3]) inputs[3].value = fields.email || "";
      const bio = pimpinanPanel.querySelector("textarea");
      if (bio) bio.value = fields.bio || "";
    }
      // === LOAD DATA TAMPILAN BERANDA ===
  const hero = cmsRow("tampilanBeranda");
  const heroPanel = qs("profil-tampilan-beranda");
  if (hero && heroPanel && hero.fields) {
    const f = hero.fields;
    if (qs("heroTitle")) qs("heroTitle").value = f.title || "";
    if (qs("heroDesc")) qs("heroDesc").value = f.description || "";
    if (qs("heroImgUrl")) qs("heroImgUrl").value = f.imageUrl || "";
    if (qs("statOps")) qs("statOps").value = f.statOps || "28";
    if (qs("statPersen")) qs("statPersen").value = f.statPersen || "91";
    if (qs("statSkor")) qs("statSkor").value = f.statSkor || "4.6";
  }
  }

  function collectProfilSection(sec) {
    const key = profilSectionMap[sec];
    if (!key) return null;
    if (sec === "kata-pengantar") {
      const panel = qs("profil-kata-pengantar");
      const title = valueFrom(panel, "input[type='text']") || "Kata Pengantar";
      const bodyHtml = sanitizeCms(panel?.querySelector(".rte-area")?.innerHTML || "");
      return { key, title, fields: { title, bodyHtml }, html: `<h3>${escapeHtml(title)}</h3>${bodyHtml}` };
    }
    if (sec === "latar-belakang") {
      const panel = qs("profil-latar-belakang");
      const bodyHtml = sanitizeCms(panel?.querySelector(".rte-area")?.innerHTML || "");
      return { key, title: "Latar Belakang", fields: { bodyHtml }, html: `<h3>Latar Belakang</h3>${bodyHtml}` };
    }
    if (sec === "visi-misi") {
      const panel = qs("profil-visi-misi");
      const textareas = panel?.querySelectorAll("textarea") || [];
      const visi = (textareas[0]?.value || "").trim();
      const misi = (textareas[1]?.value || "").split(/\r?\n/).map((line) => line.replace(/^\s*\d+[\.)]?\s*/, "").trim()).filter(Boolean);
      const misiHtml = misi.map((line, i) => `<li><div class="misi-num">${i + 1}</div>${escapeHtml(line)}</li>`).join("");
      return {
        key,
        title: "Visi & Misi",
        fields: { visi, misi },
        html: `<h3>Visi Gubernur Kalimantan Utara</h3><p><em>${escapeHtml(visi)}</em></p><h3>Misi Gubernur Kalimantan Utara</h3><ul class="misi-list">${misiHtml}</ul>`,
      };
    }
    if (sec === "struktur") {
      const rows = Array.from(qs("jabatanList")?.children || []).map((row) => {
        const inputs = row.querySelectorAll("input");
        return { jabatan: (inputs[0]?.value || "").trim(), nama: (inputs[1]?.value || "").trim() };
      }).filter((row) => row.jabatan || row.nama);
      const body = rows.map((row) => `<tr><td>${escapeHtml(row.jabatan)}</td><td>${escapeHtml(row.nama || "-")}</td></tr>`).join("");
      return { key, title: "Struktur Organisasi", fields: { jabatan: rows }, html: `<h3>Struktur Organisasi</h3><table class="org-table"><thead><tr><th>Jabatan</th><th>Nama</th></tr></thead><tbody>${body}</tbody></table>` };
    }
    if (sec === "pimpinan") {
      const panel = qs("profil-pimpinan");
      const inputs = panel?.querySelectorAll("input") || [];
      const fields = {
        nama: (inputs[0]?.value || "").trim(),
        jabatan: (inputs[1]?.value || "").trim(),
        periode: (inputs[2]?.value || "").trim(),
        email: (inputs[3]?.value || "").trim(),
        bio: (panel?.querySelector("textarea")?.value || "").trim(),
      };
      const detail = [
        fields.jabatan && `<p><b>Jabatan:</b> ${escapeHtml(fields.jabatan)}</p>`,
        fields.periode && `<p><b>Periode:</b> ${escapeHtml(fields.periode)}</p>`,
        fields.email && `<p><b>Email:</b> ${escapeHtml(fields.email)}</p>`,
        fields.bio && `<p style="text-align:justify">${escapeHtml(fields.bio)}</p>`,
      ].filter(Boolean).join("");
      return { key, title: "Profil Pimpinan", fields, html: `<h3>${escapeHtml(fields.nama || "Profil Pimpinan")}</h3>${detail}` };
    }
      // === SIMPAN DATA TAMPILAN BERANDA ===
  if (sec === "tampilan-beranda") {
    const panel = qs("profil-tampilan-beranda");
    const fields = {
      title: (panel?.querySelector("#heroTitle")?.value || "").trim(),
      description: (panel?.querySelector("#heroDesc")?.value || "").trim(),
      imageUrl: (panel?.querySelector("#heroImgUrl")?.value || "").trim(),
      statOps: (panel?.querySelector("#statOps")?.value || "").trim(),
      statPersen: (panel?.querySelector("#statPersen")?.value || "").trim(),
      statSkor: (panel?.querySelector("#statSkor")?.value || "").trim(),
    };
    return {
      key: "tampilanBeranda",
      title: "Tampilan Beranda",
      fields,
      html: `<div class="hero-section"><h1>${escapeHtml(fields.title)}</h1><p>${escapeHtml(fields.description)}</p></div>`
    };
  }
    return null;
    
    
  }

  function valueFrom(root, selector) {
    return (root?.querySelector(selector)?.value || "").trim();
  }

  saveSection = async function saveSectionApi(sec) {
    const payload = collectProfilSection(sec);
    if (!payload) return toast(`Perubahan ${sec} belum terhubung ke backend.`, "!", "error");
    try {
      const saved = await api(`${endpoints.cms}/${encodeURIComponent(payload.key)}`, { method: "PATCH", body: JSON.stringify(payload) });
      const idx = cmsData.findIndex((item) => String(item.key || item.id) === payload.key);
      if (idx >= 0) cmsData[idx] = saved;
      else cmsData.unshift(saved);
      toast("Konten profil tersimpan ke database backend", "OK");
    } catch (err) {
      toast(err.message, "!", "error");
    }
  };

  function renderDashboardStats() {
    const baru = pengaduanData.filter((d) => d.status === "Baru").length;
    const proses = pengaduanData.filter((d) => d.status === "Proses").length;
    const selesai = pengaduanData.filter((d) => d.status === "Selesai").length;
    if (qs("badgePengaduan")) qs("badgePengaduan").textContent = baru;
    if (qs("kpiBaruDash")) qs("kpiBaruDash").textContent = baru;
    const cards = document.querySelectorAll("#page-dashboard .kpi-num");
    if (cards[0]) cards[0].textContent = pengaduanData.length;
    if (cards[1]) cards[1].textContent = selesai;
    if (cards[2]) cards[2].textContent = beritaData.filter((d) => d.status === "Tayang").length;
    if (cards[3]) cards[3].textContent = baru;
    updateWaSyncStatus();
  }

  function updateWaSyncStatus(result) {
    const el = qs("waSyncStatus");
    if (!el) return;
    if (result) {
      el.textContent = `Sync WA terakhir: baru ${result.imported || 0}, diperbarui ${result.updated || 0}, total ${result.total || 0} baris.`;
      return;
    }
    const last = logData.find((item) => item.aksi === "Sinkronisasi" && String(item.detail || "").includes("WhatsApp"));
    el.textContent = last ? `Sync WA terakhir: ${last.wkt || "-"} - ${last.detail || ""}` : "Sync WA terakhir: belum ada data.";
  }

  function notifySheetUpdate(item) {
    if (!item || item.sumber !== "WhatsApp n8n") return;
    if (item.sheetUpdate?.ok) {
      toast("Status Google Sheet ikut diperbarui", "OK");
    } else if (item.sheetUpdate?.error) {
      toast(`Status lokal tersimpan, tetapi Google Sheet gagal: ${item.sheetUpdate.error}`, "!", "warn");
    } else {
      toast("Status lokal tersimpan. Webhook Google Sheet belum dikonfigurasi.", "!", "warn");
    }
  }

  window.syncWaSheetManual = async function syncWaSheetManual() {
    let btn = null;
    try {
      btn = document.activeElement;
      if (btn) btn.disabled = true;
      toast("Mengambil data WhatsApp dari Google Sheet...", "↻");
      const result = await api("/api/sync/wa-sheet", { method: "POST", body: JSON.stringify({}) });
      await Promise.all(["pengaduan", "logs"].map(loadCollection));
      renderPengaduan();
      updateBadge();
      renderDashboardStats();
      updateWaSyncStatus(result);
      toast(`Sync WA selesai: ${result.imported || 0} baru, ${result.updated || 0} diperbarui`, "OK");
    } catch (err) {
      toast(err.message, "!", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  const originalShowPage = showPage;
  showPage = async function showPageWithApi(id, btn) {
    if (!hasPermission(id)) {
      toast("Akun ini tidak punya akses ke fitur tersebut.", "⚠", "error");
      const firstAllowed = Array.from(document.querySelectorAll(".sidebar-nav .nav-item"))
        .find((item) => item.style.display !== "none");
      if (firstAllowed) firstAllowed.click();
      return;
    }
    try {
      if (id === "pengaduan") await loadCollection("pengaduan");
      if (id === "berita") await loadCollection("berita");
      if (id === "agenda") await loadCollection("agenda");
      if (id === "galeri") await loadCollection("galeri");
      if (id === "regulasi") await loadCollection("regulasi");
      if (id === "pengguna") await loadCollection("pengguna");
      if (id === "log") await loadCollection("logs");
      if (id === "ppid") await loadCollection("ppid");
      if (id === "profil") {
        await loadCollection("cms");
        applyCmsToProfilForm();
      }
    } catch (err) {
      toast(err.message, "⚠", "error");
    }
    originalShowPage(id, btn);
    if (id === "ppid") renderPPID();
  };

  logout = async function logoutApi() {
    if (!confirm("Keluar dari admin panel?")) return;
    toast("Menutup sesi admin...", "OK");
    try {
      await api("/api/logout", { method: "POST", body: JSON.stringify({}) });
    } catch {}
    setTimeout(() => {
      clearSession();
      window.location.href = "/satpolpp-kaltara.html";
    }, 700);
  };

  renderPengaduan = function renderPengaduanApi(data = pengaduanData) {
    qs("pengaduanBody").innerHTML = data.map((d) => `
      <tr>
        <td><b style="color:var(--brand);font-family:monospace">${d.id}</b></td>
        <td>${d.nama || "-"}</td><td>${d.kat || "-"}</td><td>${d.wil || "-"}</td><td>${d.dibuatOleh || d.sumber || "Masyarakat"}</td><td>${d.tgl || "-"}</td>
        <td><span class="badge ${statusBadge[d.status] || "badge-gray"}">${statusIcon[d.status] || "●"} ${d.status || "-"}</span></td>
        <td><span class="badge ${prioBadge[d.prio] || "badge-gray"}">${d.prio || "-"}</span></td>
        <td><div class="tbl-actions">
          <button class="btn btn-primary btn-xs" onclick="openDetailPengaduan(${pengaduanData.indexOf(d)})">Detail</button>
          ${d.status !== "Selesai" ? `<button class="btn btn-success btn-xs" onclick="quickResolve(${pengaduanData.indexOf(d)})">Selesai</button>` : ""}
          <button class="btn btn-danger btn-xs" onclick="deletePengaduanApi('${d.id}')">Hapus</button>
        </div></td>
      </tr>
    `).join("");
  };

  updateStatusPengaduan = async function updateStatusPengaduanApi() {
    const d = pengaduanData[currentDetailIdx];
    const status = value("dp_statusSelect");
    const catatan = value("dp_catatan");
    const petugas = value("dp_petugas") || "Admin Utama";
    const riwayat = [...(d.riwayat || [])];
    if (catatan) riwayat.push({ aksi: status, wkt: new Date().toISOString(), petugas, ket: catatan });
    try {
      pengaduanData[currentDetailIdx] = normalizePengaduan(await api(`${endpoints.pengaduan}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ status, riwayat, catatan }) }));
      closeModal("modalDetailPengaduan");
      renderPengaduan();
      updateBadge();
      toast(`Status tiket ${d.id} diperbarui`, "✅");
      notifySheetUpdate(pengaduanData[currentDetailIdx]);
    } catch (err) {
      toast(err.message, "⚠", "error");
    }
  };

  quickResolve = async function quickResolveApi(idx) {
    currentDetailIdx = idx;
    const d = pengaduanData[idx];
    const riwayat = [...(d.riwayat || []), { aksi: "Diselesaikan", wkt: new Date().toISOString(), petugas: "Admin Utama", ket: "Diselesaikan melalui aksi cepat." }];
    try {
      pengaduanData[idx] = normalizePengaduan(await api(`${endpoints.pengaduan}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ status: "Selesai", riwayat, catatan: "Diselesaikan melalui aksi cepat." }) }));
      renderPengaduan();
      updateBadge();
      toast(`Tiket ${d.id} diselesaikan`, "✅");
      notifySheetUpdate(pengaduanData[idx]);
    } catch (err) {
      toast(err.message, "⚠", "error");
    }
  };

  window.deletePengaduanApi = function deletePengaduanApi(id) {
    konfirmasiHapus(`Hapus tiket ${id}?`, "Tiket ini akan dihapus permanen.", async () => {
      try {
        await api(`${endpoints.pengaduan}/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadCollection("pengaduan");
        renderPengaduan();
        updateBadge();
        toast("Tiket dihapus", "🗑", "error");
      } catch (err) {
        toast(err.message, "⚠", "error");
      }
    });
  };

  confirmDeletePengaduan = function confirmDeletePengaduanApi() {
    const d = pengaduanData[currentDetailIdx];
    closeModal("modalDetailPengaduan");
    deletePengaduanApi(d.id);
  };

  renderBerita = function renderBeritaApi(filter = "semua") {
    let data = beritaData;
    if (filter === "tayang") data = beritaData.filter((d) => d.status === "Tayang");
    if (filter === "draft") data = beritaData.filter((d) => d.status === "Draft");
    const colors = ["0a5c8a/d6edf7", "1a7a3e/e8f7ee", "c9922a/fdf3e3", "7b2d8b/f3e8fd", "c0392b/fdecea"];
    qs("beritaBody").innerHTML = data.map((d, i) => `
      <tr>
        <td><img class="thumb" src="${mediaSrc(d, `https://placehold.co/80x60/${colors[i % 5]}?text=IMG`)}" alt=""/></td>
        <td><b style="font-size:13px">${d.judul || "-"}</b></td>
        <td>${d.kat || "-"}</td><td>${d.penulis || "-"}</td><td>${d.tgl || "-"}</td>
        <td><span class="badge ${d.status === "Tayang" ? "badge-green" : "badge-gold"}">${d.status || "Draft"}</span></td>
        <td><div class="tbl-actions">
          <button class="btn btn-ghost btn-xs" onclick="openEditBerita(${beritaData.indexOf(d)})">Edit</button>
          <button class="btn ${d.status === "Tayang" ? "btn-warning" : "btn-success"} btn-xs" onclick="toggleStatusBerita(${beritaData.indexOf(d)})">${d.status === "Tayang" ? "Tarik" : "Tayang"}</button>
          <button class="btn btn-danger btn-xs" onclick="deleteItemApi('berita','${d.id}')">Hapus</button>
        </div></td>
      </tr>
    `).join("");
  };

  renderAgenda = function renderAgendaApi() {
    const statusAgendaBadge = { Aktif: "badge-green", Selesai: "badge-blue", Dibatalkan: "badge-red" };
    qs("agendaBody").innerHTML = agendaData.map((d, i) => `
      <tr>
        <td><span class="cal-chip">${d.tglDisplay || d.tgl || "-"}</span></td>
        <td><b>${d.kegiatan || "-"}</b></td><td>${d.lok || "-"}</td><td>${d.pj || "-"}</td>
        <td><span class="badge ${statusAgendaBadge[d.status] || "badge-gray"}">${d.status || "-"}</span></td>
        <td><div class="tbl-actions">
          <button class="btn btn-ghost btn-xs" onclick="openEditAgenda(${i})">Edit</button>
          <button class="btn btn-danger btn-xs" onclick="deleteItemApi('agenda','${d.id}')">Hapus</button>
        </div></td>
      </tr>
    `).join("");
  };

  renderGaleriGrid = function renderGaleriGridApi() {
    const el = qs("galeriGrid");
    if (!el) return;
    el.innerHTML = galeriData.map((g, i) => `
      <div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
        <img src="${mediaSrc(g, `https://placehold.co/120x90/${g.color || "0a5c8a/d6edf7"}?text=${encodeURIComponent(i + 1)}`)}" style="width:100%;display:block;aspect-ratio:4/3;object-fit:cover"/>
        <div style="position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s;display:flex;align-items:center;justify-content:center;gap:4px" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
          <button class="btn btn-ghost btn-xs" style="color:#fff;background:rgba(255,255,255,.2);border:none" onclick="openEditGaleri(${i})">Edit</button>
          <button class="btn btn-danger btn-xs" onclick="deleteItemApi('galeri','${g.id}')">Hapus</button>
        </div>
        <div style="padding:4px 6px;font-size:11px;color:var(--text-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.judul || g.title || "-"}</div>
      </div>
    `).join("");
  };

  openDetailPengaduan = function openDetailPengaduanApi(idx) {
    currentDetailIdx = idx;
    const d = pengaduanData[idx];
    if (!d) return;
    qs("detailPengaduanTitle").textContent = `Detail Pengaduan - ${d.id || "-"}`;
    qs("dp_id").textContent = d.id || "-";
    qs("dp_nama").textContent = d.nama || "-";
    qs("dp_kat").textContent = d.kat || "-";
    qs("dp_wil").textContent = d.wil || "-";
    if (qs("dp_sumber")) qs("dp_sumber").textContent = d.sumber || "Website publik";
    if (qs("dp_dibuatOleh")) qs("dp_dibuatOleh").textContent = [d.dibuatOleh, d.dibuatOlehPeran, d.wil].filter(Boolean).join(" - ") || "Masyarakat";
    qs("dp_tgl").textContent = d.tgl || "-";
    qs("dp_prio").innerHTML = `<span class="badge ${prioBadge[d.prio] || "badge-gray"}">${d.prio || "-"}</span>`;
    qs("dp_status").innerHTML = `<span class="badge ${statusBadge[d.status] || "badge-gray"}">${statusIcon[d.status] || "●"} ${d.status || "-"}</span>`;
    qs("dp_isi").textContent = d.isi || "-";
    qs("dp_statusSelect").value = d.status || "Baru";
    qs("dp_catatan").value = "";
    qs("dp_petugas").value = "";
    qs("dp_timeline").innerHTML = (d.riwayat || []).length
      ? d.riwayat.map((r) => `
        <div class="tl-item">
          <div class="tl-dot" style="background:var(--brand)"></div>
          <div><div class="tl-text"><b>${r.aksi || "-"}</b> - ${r.ket || ""}</div><div class="tl-time">${r.wkt || ""} - ${r.petugas || ""}</div></div>
        </div>
      `).join("")
      : '<p style="font-size:13px;color:var(--text-soft)">Belum ada riwayat tindak lanjut.</p>';
    openModal("modalDetailPengaduan");
  };

  savePengaduanLangsung = async function savePengaduanLangsungApi() {
    const payload = {
      nama: value("newAduanNama"),
      kontak: value("newAduanKontak"),
      wilayah: normalizeDaerah(qs("newAduanWilayah")?.value),
      lokasi: value("newAduanLokasi"),
      kategori: qs("newAduanKategori")?.value || "Pelanggaran Trantibum",
      prio: qs("newAduanPrio")?.value || "Sedang",
      uraian: value("newAduanUraian"),
    };
    if (!payload.nama || !payload.lokasi || !payload.uraian) {
      return toast("Nama pelapor, lokasi, dan uraian wajib diisi.", "!", "error");
    }
    if (!DAERAH_TRANTIBUM.includes(payload.wilayah)) {
      return toast("Pilih daerah laporan yang valid.", "!", "error");
    }
    try {
      await api(endpoints.pengaduan, { method: "POST", body: JSON.stringify(payload) });
      ["newAduanNama", "newAduanKontak", "newAduanLokasi", "newAduanUraian"].forEach((id) => {
        if (qs(id)) qs(id).value = "";
      });
      closeModal("modalPengaduanBaru");
      await loadCollection("pengaduan");
      renderPengaduan();
      updateBadge();
      toast("Laporan langsung berhasil disimpan", "OK");
    } catch (err) {
      toast(err.message, "!", "error");
    }
  };

  openEditGaleri = function openEditGaleriApi(idx) {
    currentGaleriIdx = idx;
    const g = normalizeGaleri(galeriData[idx] || {});
    qs("editGaleriJudul").value = g.judul;
    qs("editGaleriDesc").value = g.desc || "";
    qs("editGaleriPreview").innerHTML = `<img src="${mediaSrc(g, `https://placehold.co/300x150/${g.color}?text=Preview`)}" style="width:100%;border-radius:6px"/>`;
    const katSel = qs("editGaleriKat");
    if (katSel) {
      for (const option of katSel.options) option.selected = galeriCategory(option.textContent) === g.kat;
    }
    openModal("modalEditGaleri");
  };

  window.uploadGaleriApi = async function uploadGaleriApi() {
    const titleInput = qs("newGaleriJudul") || document.querySelector("#page-galeri .form-grid input[type='text']");
    const catSelect = qs("newGaleriKat") || document.querySelector("#page-galeri .form-grid select");
    const file = qs("fileInput")?.files?.[0];
    const judul = (titleInput?.value || file?.name || "").trim();
    if (!judul) return toast("Judul media wajib diisi!", "⚠", "error");
    const cat = galeriCategory(catSelect?.value || catSelect?.selectedOptions?.[0]?.textContent);
    try {
      const uploaded = await uploadFile(file);
      await api(endpoints.galeri, { method: "POST", body: JSON.stringify({
        judul,
        title: judul,
        desc: file ? `File referensi: ${file.name}` : "",
        cat,
        kat: cat,
        type: file?.type?.startsWith("video/") ? "video" : "img",
        size: "wide",
        color: galeriColor(cat),
        imageUrl: uploaded?.url || "",
        mediaUrl: uploaded?.url || "",
      }) });
      await loadCollection("galeri");
      renderGaleriGrid();
      if (titleInput) titleInput.value = "";
      if (qs("fileInput")) qs("fileInput").value = "";
      if (qs("imgPreview")) qs("imgPreview").style.display = "none";
      toast("Media berhasil disimpan ke backend", "✅");
    } catch (err) {
      toast(err.message, "⚠", "error");
    }
  };

  window.simpanEditGaleriApi = async function simpanEditGaleriApi() {
    const d = galeriData[currentGaleriIdx];
    if (!d) return closeModal("modalEditGaleri");
    const judul = value("editGaleriJudul");
    if (!judul) return toast("Judul media wajib diisi!", "⚠", "error");
    const cat = galeriCategory(qs("editGaleriKat")?.value || qs("editGaleriKat")?.selectedOptions?.[0]?.textContent);
    try {
      galeriData[currentGaleriIdx] = normalizeGaleri(await api(`${endpoints.galeri}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({
        judul,
        title: judul,
        desc: value("editGaleriDesc"),
        kat: cat,
        cat,
        color: galeriColor(cat),
      }) }));
      closeModal("modalEditGaleri");
      renderGaleriGrid();
      toast("Info media diperbarui di backend", "✅");
    } catch (err) {
      toast(err.message, "⚠", "error");
    }
  };

  renderRegulasi = function renderRegulasiApi() {
    const jenisBadge = { Perda: "badge-blue", Pergub: "badge-gold", "SK Kepala Daerah": "badge-orange", SOP: "badge-gray" };
    qs("regulasiBody").innerHTML = regulasiData.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="badge ${jenisBadge[d.jenis] || "badge-gray"}">${d.jenis || "-"}</span></td>
        <td><b>${d.judul || "-"}</b><br><span style="font-size:11px;color:var(--text-soft)">${d.nomor || ""}</span></td>
        <td>${d.tahun || "-"}</td>
        <td><span class="badge ${d.adaPDF ? "badge-green" : "badge-red"}">${d.adaPDF ? "Tersedia" : "Belum ada"}</span></td>
        <td><label class="switch"><input type="checkbox" ${d.tampil ? "checked" : ""} onchange="toggleRegulasiVisible(${i},this.checked)"/><span class="switch-track"></span></label></td>
        <td><div class="tbl-actions">
          <button class="btn btn-ghost btn-xs" onclick="openEditRegulasi(${i})">Edit</button>
          <button class="btn btn-danger btn-xs" onclick="deleteItemApi('regulasi','${d.id}')">Hapus</button>
        </div></td>
      </tr>
    `).join("");
  };

  window.deleteItemApi = function deleteItemApi(resource, id) {
    konfirmasiHapus(`Hapus data ${resource}?`, "Data akan dihapus permanen dari backend.", async () => {
      try {
        await api(`${endpoints[resource]}/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadCollection(resource);
        if (resource === "berita") renderBerita();
        if (resource === "agenda") renderAgenda();
        if (resource === "galeri") renderGaleriGrid();
        if (resource === "regulasi") renderRegulasi();
        toast("Data dihapus dari backend", "🗑", "error");
      } catch (err) {
        toast(err.message, "⚠", "error");
      }
    });
  };

  window.toggleRegulasiVisible = async function toggleRegulasiVisible(idx, tampil) {
    const d = regulasiData[idx];
    try {
      regulasiData[idx] = await api(`${endpoints.regulasi}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ tampil }) });
      toast("Visibilitas diperbarui", "✅");
    } catch (err) {
      toast(err.message, "⚠", "error");
      renderRegulasi();
    }
  };

  saveBeritaBaru = async function saveBeritaBaruApi() {
    const judul = value("newBeritaJudul");
    if (!judul) return toast("Judul berita wajib diisi!", "⚠", "error");
    const tglVal = value("newBeritaTgl");
    try {
      const uploaded = await uploadFile(qs("newBeritaGambar")?.files?.[0]);
      await api(endpoints.berita, { method: "POST", body: JSON.stringify({
        judul,
        kat: qs("newBeritaKat")?.value || "",
        penulis: value("newBeritaPenulis") || "Admin Utama",
        tgl: tglVal ? new Date(tglVal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        status: qs("newBeritaStatus")?.value || "Draft",
        isi: qs("newBeritaIsi")?.innerText || "",
        imageUrl: uploaded?.url || "",
      }) });
      await loadCollection("berita");
      closeModal("modalBeritaBaru");
      renderBerita();
      if (qs("newBeritaGambar")) qs("newBeritaGambar").value = "";
      toast("Berita berhasil disimpan ke backend", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  simpanEditBerita = async function simpanEditBeritaApi() {
    const idx = Number(value("editBeritaId"));
    const d = beritaData[idx];
    const tglVal = value("editBeritaTgl");
    const payload = { judul: value("editBeritaJudul"), kat: qs("editBeritaKat")?.value || "", status: qs("editBeritaStatus")?.value || "Draft", penulis: value("editBeritaPenulis") || "Admin Utama", isi: qs("editBeritaIsi")?.innerText || "" };
    if (tglVal) payload.tgl = new Date(tglVal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    try {
      const uploaded = await uploadFile(qs("editBeritaGambar")?.files?.[0]);
      if (uploaded?.url) payload.imageUrl = uploaded.url;
      beritaData[idx] = await api(`${endpoints.berita}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      closeModal("modalEditBerita");
      renderBerita();
      if (qs("editBeritaGambar")) qs("editBeritaGambar").value = "";
      toast("Berita berhasil diperbarui", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  toggleStatusBerita = async function toggleStatusBeritaApi(idx) {
    const d = beritaData[idx];
    try {
      beritaData[idx] = await api(`${endpoints.berita}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ status: d.status === "Tayang" ? "Draft" : "Tayang" }) });
      renderBerita();
      toast("Status berita diperbarui", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  saveAgenda = async function saveAgendaApi() {
    const judul = value("agendaJudul"), tgl = value("agendaTgl"), lok = value("agendaLokasi");
    if (!judul || !tgl || !lok) return toast("Isi semua field wajib!", "⚠", "error");
    try {
      await api(endpoints.agenda, { method: "POST", body: JSON.stringify({ kegiatan: judul, tgl, tglDisplay: new Date(tgl).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }), lok, pj: qs("agendaPJ")?.value || "", status: "Aktif", ket: value("agendaKet") }) });
      await loadCollection("agenda");
      closeModal("modalAgendaBaru");
      renderAgenda();
      toast("Agenda berhasil disimpan ke backend", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  simpanEditAgenda = async function simpanEditAgendaApi() {
    const idx = Number(value("editAgendaIdx"));
    const d = agendaData[idx];
    const tgl = value("editAgendaTgl");
    try {
      agendaData[idx] = await api(`${endpoints.agenda}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ kegiatan: value("editAgendaJudul"), tgl, tglDisplay: tgl ? new Date(tgl).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : d.tglDisplay, lok: value("editAgendaLokasi"), pj: qs("editAgendaPJ")?.value || "", status: qs("editAgendaStatus")?.value || "Aktif", ket: value("editAgendaKet") }) });
      closeModal("modalEditAgenda");
      renderAgenda();
      toast("Agenda berhasil diperbarui", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  saveRegulasiBar = async function saveRegulasiBarApi() {
    const judul = value("newRegulasiJudul");
    if (!judul) return toast("Judul regulasi wajib diisi!", "⚠", "error");
    try {
      await api(endpoints.regulasi, { method: "POST", body: JSON.stringify({ jenis: qs("newRegulasiJenis")?.value || "Perda", nomor: value("newRegulasiNomor"), judul, tahun: value("newRegulasiTahun") || String(new Date().getFullYear()), adaPDF: false, tampil: true }) });
      await loadCollection("regulasi");
      closeModal("modalRegulasiForm");
      renderRegulasi();
      toast("Regulasi berhasil disimpan ke backend", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  simpanEditRegulasi = async function simpanEditRegulasiApi() {
    const idx = Number(value("editRegulasiIdx"));
    const d = regulasiData[idx];
    try {
      regulasiData[idx] = await api(`${endpoints.regulasi}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ jenis: qs("editRegulasiJenis")?.value || "Perda", nomor: value("editRegulasiNomor"), judul: value("editRegulasiJudul"), tahun: value("editRegulasiTahun") }) });
      closeModal("modalEditRegulasi");
      renderRegulasi();
      toast("Regulasi berhasil diperbarui", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  savePenggunaBaru = async function savePenggunaBaruApi() {
    const nama = value("newPenggunaNama"), username = value("newPenggunaUsername");
    if (!nama || !username) return toast("Nama dan username wajib diisi!", "⚠", "error");
    const peranVal = qs("newPenggunaPeran")?.value || "Operator";
    const peran = peranVal.split(" — ")[0].trim();
    try {
      await api(endpoints.pengguna, { method: "POST", body: JSON.stringify({ nama, username, password: value("newPenggunaSandi") || "admin123", peran, akses: peranVal.includes("penuh") ? "Semua" : peranVal.includes("konten") ? "Berita, Galeri" : "Pengaduan", wilayah: normalizeDaerah(value("newPenggunaWilayah")), loginTerakhir: "Belum pernah", status: "Aktif", email: value("newPenggunaEmail") }) });
      await loadCollection("pengguna");
      closeModal("modalPenggunaBaru");
      renderPengguna();
      toast("Pengguna berhasil disimpan ke backend", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  simpanEditPengguna = async function simpanEditPenggunaApi() {
    const idx = Number(value("editPenggunaIdx"));
    const d = penggunaData[idx];
    const peranVal = qs("editPenggunaPeran")?.value || d.peran;
    const peran = peranVal.split(" — ")[0].trim();
    const payload = { nama: value("editPenggunaNama"), username: value("editPenggunaUsername"), email: value("editPenggunaEmail"), peran, wilayah: normalizeDaerah(value("editPenggunaWilayah")) };
    if (value("editPenggunaSandi")) payload.password = value("editPenggunaSandi");
    try {
      penggunaData[idx] = await api(`${endpoints.pengguna}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      closeModal("modalEditPengguna");
      renderPengguna();
      toast("Pengguna berhasil diperbarui", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  toggleStatusPengguna = async function toggleStatusPenggunaApi(idx) {
    const d = penggunaData[idx];
    try {
      penggunaData[idx] = await api(`${endpoints.pengguna}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ status: d.status === "Aktif" ? "Nonaktif" : "Aktif" }) });
      renderPengguna();
      toast("Status pengguna diperbarui", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  renderPPID = function renderPPID() {
    const body = qs("ppidBody");
    if (!body) return;
    body.innerHTML = ppidData.length ? ppidData.map((d, i) => {
      const status = d.status || "Baru";
      const badge = status === "Selesai" ? "badge-green" : status === "Proses" ? "badge-orange" : "badge-red";
      return `<tr><td><b>${d.pemohon || "-"}</b></td><td>${d.email || "-"}</td><td>${d.info || "-"}</td><td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "-"}</td><td><span class="badge ${badge}">${status}</span></td><td><button class="btn btn-primary btn-xs" onclick="openPPIDDetailApi(${i})">Tindak Lanjut</button></td></tr>`;
    }).join("") : `<tr><td colspan="6" style="text-align:center;color:var(--text-soft)">Belum ada permohonan PPID dari website.</td></tr>`;
  };

  window.openPPIDDetailApi = function openPPIDDetailApi(idx) {
    currentPPIDIdx = idx;
    const d = ppidData[idx];
    qs("ppid_nama").textContent = d.pemohon || "-";
    qs("ppid_info").textContent = d.info || "-";
    qs("ppid_status").innerHTML = `<span class="badge">${d.status || "Baru"}</span>`;
    qs("ppid_statusSelect").value = d.status || "Baru";
    openModal("modalPPIDDetail");
  };

  window.savePPIDResponse = async function savePPIDResponse() {
    const d = ppidData[currentPPIDIdx];
    if (!d) return closeModal("modalPPIDDetail");
    try {
      ppidData[currentPPIDIdx] = await api(`${endpoints.ppid}/${encodeURIComponent(d.id)}`, { method: "PATCH", body: JSON.stringify({ status: qs("ppid_statusSelect")?.value || "Proses" }) });
      closeModal("modalPPIDDetail");
      renderPPID();
      toast("Respon PPID disimpan ke backend", "✅");
    } catch (err) { toast(err.message, "⚠", "error"); }
  };

  function bindGaleriButtons() {
    const uploadBtn = Array.from(document.querySelectorAll("#page-galeri button"))
      .find((btn) => btn.textContent.includes("Upload Sekarang"));
    if (uploadBtn) {
      uploadBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        uploadGaleriApi();
      }, true);
    }

    const editSaveBtn = Array.from(document.querySelectorAll("#modalEditGaleri button"))
      .find((btn) => btn.textContent.includes("Simpan"));
    if (editSaveBtn) {
      editSaveBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        simpanEditGaleriApi();
      }, true);
    }
  }

  window.addEventListener("DOMContentLoaded", async () => {
    if (!(await requireLogin())) return;
    applyPengaduanWilayahOptions();
    bindGaleriButtons();
    try {
      await refreshAll();
      renderDashboardStats();
    } catch (err) {
      console.warn("Admin memakai data bawaan karena API belum siap:", err);
    }
  });
})();

