(function () {
  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Permintaan gagal diproses.");
    return data;
  }

  const text = (id) => (document.getElementById(id)?.value || "").trim();

  if (document.getElementById("formPengaduan")) {
    window.kirimPengaduan = async function kirimPengaduanApi(event) {
      event.preventDefault();
      const notif = document.getElementById("notif");
      if (text("captcha") !== "5") {
        notif.textContent = "Jawaban verifikasi salah. Petunjuk: 2 + 3";
        notif.style.color = "var(--danger)";
        return;
      }
      notif.textContent = "Mengirim pengaduan...";
      notif.style.color = "var(--text-soft)";
      try {
        const data = await postJson("/api/pengaduan", {
          nama: text("nama"),
          kontak: text("kontak"),
          lokasi: text("lokasi"),
          kategori: document.getElementById("kategori")?.value || "",
          uraian: text("uraian"),
        });
        notif.innerHTML = 'Pengaduan terkirim. Nomor tiket Anda: <strong>' + data.id + "</strong>";
        notif.style.color = "var(--ok)";
        event.target.reset();
      } catch (err) {
        notif.textContent = err.message;
        notif.style.color = "var(--danger)";
      }
    };
  }

  if (document.getElementById("ticket")) {
    window.lacakAduan = async function lacakAduanApi(event) {
      event.preventDefault();
      const id = text("ticket").toUpperCase();
      const out = document.getElementById("hasilLacak");
      out.textContent = "Mencari tiket...";
      try {
        const res = await fetch("/api/pengaduan/" + encodeURIComponent(id));
        if (res.status === 404) throw new Error("Nomor tiket tidak ditemukan.");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal melacak tiket.");
        const statusColor = data.status === "Selesai" ? "ok" : "warn";
        const riwayat = (data.riwayat || []).map((x) => "<li>" + [x.aksi, x.ket || x.wkt].filter(Boolean).join(" - ") + "</li>").join("");
        out.innerHTML = 'Status: <span class="badge ' + statusColor + '">' + data.status + "</span><ul>" + riwayat + "</ul>";
      } catch (err) {
        out.textContent = err.message;
      }
    };
  }

  if (document.getElementById("contactForm")) {
    window.kirimKontak = async function kirimKontakApi(event) {
      event.preventDefault();
      const el = document.getElementById("kontakNotif");
      el.textContent = "Mengirim pesan...";
      try {
        await postJson("/api/kontak", {
          nama: text("cnama"),
          email: text("cemail"),
          pesan: text("cpesan"),
        });
        el.innerHTML = "Terima kasih, <strong>" + text("cnama") + "</strong>. Pesan Anda telah diterima.";
        el.style.color = "var(--ok)";
        event.target.reset();
      } catch (err) {
        el.textContent = err.message;
        el.style.color = "var(--danger)";
      }
    };
  }

  if (document.getElementById("ppidNotif")) {
    window.ajukanPPID = async function ajukanPPIDApi(event) {
      event.preventDefault();
      const el = document.getElementById("ppidNotif");
      el.textContent = "Mengirim permohonan...";
      try {
        await postJson("/api/ppid", {
          pemohon: text("pemohon"),
          email: text("ppidEmail"),
          info: text("info"),
        });
        el.textContent = "Permohonan " + text("pemohon") + " diterima. Cek email Anda.";
        el.style.color = "var(--ok)";
        event.target.reset();
      } catch (err) {
        el.textContent = err.message;
        el.style.color = "var(--danger)";
      }
    };
  }

  if (document.getElementById("galleryGrid") && typeof renderGallery === "function") {
    fetch("/api/galeri")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length) renderGallery(data, true);
      })
      .catch(() => {});
  }

  if (document.getElementById("surveyProgress")) {
    window.submitSurvey = async function submitSurveyApi() {
      const selected = Array.from(document.querySelectorAll(".opt-btn.sel")).map((btn) => btn.textContent.trim());
      try {
        await postJson("/api/survei", {
          rating: window.rating || rating || 0,
          pilihan: selected,
          saran: text("saranText"),
        });
      } catch (err) {
        console.warn("Survei belum tersimpan ke API:", err);
      }
      document.getElementById("step4").classList.remove("active");
      document.getElementById("stepDone").classList.add("active");
      document.getElementById("surveyProgress").style.width = "100%";
    };
  }
})();
