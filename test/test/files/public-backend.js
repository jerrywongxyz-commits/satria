(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

  async function getJson(url) {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || "Gagal mengambil data.");
    return data;
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function statusClass(status) {
    if (status === "Selesai") return "done";
    if (status === "Proses") return "process";
    if (status === "Baru") return "new";
    return "process";
  }

  function statusBadge(status) {
    const label = status || "Proses";
    const icon = label === "Selesai" ? "✓" : label === "Baru" ? "●" : "⏳";
    return `<span class="badge ${statusClass(label)}">${icon} ${label}</span>`;
  }

  function byCount(rows, pick) {
    const map = new Map();
    rows.forEach((row) => {
      const key = pick(row) || "Lainnya";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }

  function updateChart(canvasId, labels, values, label) {
    const canvas = $(canvasId);
    if (!canvas || !window.Chart) return;
    const chart = Chart.getChart(canvas);
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets.forEach((ds) => {
      ds.label = label || ds.label;
      ds.data = values;
    });
    chart.update();
  }

  function updateDonut(labels, values) {
    const canvas = $("donutChart");
    if (!canvas || !window.Chart) return;
    const chart = Chart.getChart(canvas);
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
    const center = document.querySelector(".donut-center b");
    if (center) center.textContent = fmt(values.reduce((a, b) => a + b, 0));
    const legend = document.querySelector(".legend");
    if (legend) {
      const colors = ["#0a5c8a", "#0e7bb5", "#c9922a", "#27ae60", "#c0392b"];
      legend.innerHTML = labels.map((name, i) => `
        <div class="leg-item">
          <div class="leg-label"><div class="leg-dot" style="background:${colors[i % colors.length]}"></div>${name}</div>
          <div class="leg-val">${fmt(values[i])}</div>
        </div>
      `).join("");
    }
  }

  function renderHomeNews(berita) {
    const grid = $("newsGrid");
    if (!grid) return;
    const visible = berita.filter((b) => b.status !== "Draft").slice(0, 3);
    if (!visible.length) return;
    const colors = ["0a5c8a", "1a7a3e", "c9922a", "7b2d8b", "c0392b"];
    grid.innerHTML = visible.map((b, i) => `
      <article class="card shadow news-card">
        <img loading="lazy" src="${b.imageUrl || b.mediaUrl || `https://placehold.co/640x360/${colors[i % colors.length]}/ffffff?text=${encodeURIComponent((b.kat || "Berita").slice(0, 18))}`}" alt="${b.judul || "Berita"}" />
        <div class="p">
          <span class="chip ${(b.kat || "rilis").toLowerCase()}">${b.kat || "Rilis"}</span>
          <h3>${b.judul || "-"}</h3>
          <div class="news-meta">${b.tgl || "-"} &bull; ${b.penulis || "Admin"}</div>
        </div>
      </article>
    `).join("");
  }

  function renderHomeAgenda(agenda) {
    const rows = $("agendaTableBody");
    const mini = $("agendaListMini");
    const active = agenda.filter((a) => a.status !== "Dibatalkan").slice(0, 5);
    if (rows) {
      rows.innerHTML = active.map((a) => `
        <tr>
          <td><span class="badge">${a.tglDisplay || a.tgl || "-"}</span></td>
          <td>${a.kegiatan || "-"}</td>
          <td>${a.lok || "-"}</td>
          <td>${a.pj || "-"}</td>
        </tr>
      `).join("");
    }
    if (mini) {
      mini.innerHTML = active.slice(0, 3).map((a) => `
        <li><span class="badge">${a.tglDisplay || a.tgl || "-"}</span> ${a.kegiatan || "-"} - ${a.lok || "-"}</li>
      `).join("");
    }
  }

  function renderRegulasi(regulasi) {
    const lists = document.querySelectorAll("#regulasi .reg-list");
    if (!lists.length) return;
    const tampil = regulasi.filter((r) => r.tampil !== false);
    const perda = tampil.filter((r) => String(r.jenis || "").toLowerCase().includes("perda"));
    const lainnya = tampil.filter((r) => !String(r.jenis || "").toLowerCase().includes("perda"));
    lists[0].innerHTML = (perda.length ? perda : tampil).slice(0, 4).map((r) => `<li>${r.jenis || "Regulasi"} ${r.nomor || ""} tentang ${r.judul || "-"}</li>`).join("");
    if (lists[1]) lists[1].innerHTML = (lainnya.length ? lainnya : tampil).slice(0, 4).map((r) => `<li>${r.jenis || "Regulasi"} ${r.nomor || ""} tentang ${r.judul || "-"}</li>`).join("");
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

  function renderCms(cms) {
    if (!Array.isArray(cms)) return;
    cms.forEach((row) => {
      const key = row.key || row.id;
      const html = row.html || row.content;
      const el = key ? document.querySelector(`[data-cms-key="${key}"]`) : null;
      if (el && html) el.innerHTML = sanitizeCms(html);
    });
    const hint = document.querySelector("#profil .hint");
    if (hint) hint.textContent = "Konten profil dimuat dari database backend.";
  }
// Fungsi untuk render Hero Section dinamis
function renderHeroDynamic(cms) {
    const hero = cms.find(row => (row.key || row.id) === "tampilanBeranda");
    if (!hero || !hero.fields) return; // Jika belum ada data, biarkan default HTML
    
    const f = hero.fields;
    
    // Update Judul
    const titleEl = document.getElementById("hero-title-dynamic") || 
                    document.querySelector(".hero-title") ||
                    document.querySelector("h1");
    if (titleEl && f.title) {
        titleEl.textContent = f.title;
    }
    
    // Update Deskripsi
    const descEl = document.getElementById("hero-desc-dynamic") || 
                   document.querySelector(".hero-desc") ||
                   document.querySelector(".hero-section p");
    if (descEl && f.description) {
        descEl.textContent = f.description;
    }
    
    // Update Gambar (jika ada)
    if (f.imageUrl) {
        const imgEl = document.getElementById("hero-img-dynamic") || 
                      document.querySelector(".hero-image img") ||
                      document.querySelector(".hero-section img");
        if (imgEl) {
            imgEl.src = f.imageUrl;
            imgEl.style.display = "block";
        }
    }
    
    // Update Statistik
    if (f.statOps) {
        const statOpsEl = document.getElementById("stat-ops-dynamic") || 
                         document.querySelector("[data-stat='ops']");
        if (statOpsEl) statOpsEl.textContent = f.statOps;
    }
    
    if (f.statPersen) {
        const statPersenEl = document.getElementById("stat-persen-dynamic") || 
                            document.querySelector("[data-stat='persen']");
        if (statPersenEl) statPersenEl.textContent = f.statPersen + "%";
    }
    
    if (f.statSkor) {
        const statSkorEl = document.getElementById("stat-skor-dynamic") || 
                          document.querySelector("[data-stat='skor']");
        if (statSkorEl) statSkorEl.textContent = f.statSkor;
    }
}

// Panggil fungsi ini di dalam initPublicData()
const originalInitPublicData = window.initPublicData || function(){};
window.initPublicData = async function() {
    await originalInitPublicData();
    
    try {
        const cms = await getJson("/api/cms").catch(() => []);
        renderHeroDynamic(cms);
    } catch(e) { 
        console.warn("Gagal load hero dynamic", e); 
    }
};
  function updateHomeStats(stats, agenda) {
    setText("stA", fmt(stats.pengaduan.total));
    setText("stB", fmt(stats.pengaduan.selesai));
    setText("stB2", fmt(stats.pengaduan.proses + stats.pengaduan.baru));
    setText("stC", fmt(agenda.length));
    const values = [stats.pengaduan.baru, stats.pengaduan.proses, stats.pengaduan.selesai];
    updateChart("chartRekap", ["Baru", "Proses", "Selesai"], values, "Pengaduan");
  }

  function updateDashboardStats(stats, pengaduan, agenda, survei) {
    setText("k1", fmt(stats.pengaduan.total));
    setText("k2", fmt(stats.pengaduan.selesai));
    setText("k3", fmt(agenda.length));
    setText("k4", fmt(stats.pengaduan.proses + stats.pengaduan.baru));
    const k2Sub = document.querySelector("#k2")?.parentElement?.querySelector(".kpi-sub");
    if (k2Sub) {
      const pct = stats.pengaduan.total ? Math.round((stats.pengaduan.selesai / stats.pengaduan.total) * 100) : 0;
      k2Sub.textContent = `${pct}% tingkat penyelesaian`;
    }
    const sat = document.querySelector(".sat-big");
    if (sat) sat.textContent = stats.survei.rataRata || "0";
    const satLabel = document.querySelector(".sat-label");
    if (satLabel) satLabel.textContent = `dari 5.0 - berdasarkan ${fmt(survei.length)} responden`;

    const monthly = Array(12).fill(0);
    pengaduan.forEach((p) => {
      const m = new Date(p.createdAt || Date.now()).getMonth();
      monthly[m] += 1;
    });
    updateChart("trendChart", ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], monthly, "Pengaduan");

    const cats = byCount(pengaduan, (p) => p.kat);
    updateDonut(cats.map((x) => x[0]), cats.map((x) => x[1]));
  }

  function renderDashboardReports(pengaduan) {
    const table = $("reportTable");
    if (!table) return;
    table.innerHTML = pengaduan.slice(0, 10).map((p) => `
      <tr>
        <td style="font-weight:700;color:var(--brand)">${p.id}</td>
        <td>${p.kat || "-"}</td>
        <td>${p.wil || p.lokasi || "-"}</td>
        <td>${p.tgl || "-"}</td>
        <td>${statusBadge(p.status)}</td>
        <td style="color:var(--text-soft)">${p.status === "Selesai" ? "Selesai" : "-"}</td>
      </tr>
    `).join("");
  }

  function renderDashboardFeed(pengaduan, logs) {
    const feed = $("activityFeed");
    if (!feed) return;
    const items = (logs.length ? logs : pengaduan).slice(0, 8);
    $("feedCount") && ($("feedCount").textContent = `${items.length} aktivitas`);
    feed.innerHTML = items.map((item) => {
      const isLog = Boolean(item.modul);
      const type = isLog ? "process" : item.status === "Selesai" ? "done" : item.status === "Baru" ? "new" : "process";
      const text = isLog ? `${item.aksi || "Update"} <b>${item.modul || ""}</b> - ${item.detail || ""}` : `Pengaduan <b>${item.kat || "-"}</b>, ${item.wil || item.lokasi || "-"}`;
      const time = isLog ? item.wkt : item.tgl;
      return `<div class="feed-item"><div class="feed-dot ${type}"></div><div><div class="feed-text">${text}</div><div class="feed-time">${time || ""}</div></div></div>`;
    }).join("");
  }

  async function initPublicData() {
    try {
      const [stats, pengaduan, berita, agenda, regulasi, logs, survei, cms] = await Promise.all([
        getJson("/api/stats").catch(() => ({ pengaduan: { total: 0, selesai: 0, proses: 0, baru: 0 }, survei: { rataRata: 0 } })),
        getJson("/api/pengaduan").catch(() => []),
        getJson("/api/berita").catch(() => []),
        getJson("/api/agenda").catch(() => []),
        getJson("/api/regulasi").catch(() => []),
        getJson("/api/logs").catch(() => []),
        getJson("/api/survei").catch(() => []),
        getJson("/api/cms").catch(() => []),
      ]);

      renderHomeNews(berita);
      renderHomeAgenda(agenda);
      renderRegulasi(regulasi);
      renderCms(cms);
      updateHomeStats(stats, agenda);
      updateDashboardStats(stats, pengaduan, agenda, survei);
      renderDashboardReports(pengaduan);
      renderDashboardFeed(pengaduan, logs);
    } catch (err) {
      console.warn("Data publik masih memakai fallback statis:", err);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(initPublicData, 250);
  });
})();
