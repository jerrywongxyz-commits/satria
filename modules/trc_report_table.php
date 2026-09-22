
<?php
// Pastikan koneksi PDO sudah ada (misalnya via include 'config/database.php')
// Pastikan $user_domisili sudah diset di luar (misal: $user_domisili = $_SESSION['domisili'];)

if (!isset($user_domisili)) {
    echo '<div class="alert alert-danger">Error: Domisili pengguna tidak ditemukan.</div>';
    return;
}

// Ambil data dari database
try {
    $stmt = $pdo->prepare("
        SELECT 
            `WaktuLaporan` as waktu_laporan,
            `layanan`,
            `KLASIFIKASI`,
            `DETAIL`,
            `DOMISILI`,
            `Status`,
            `NoTiket`,
            `NamaPelapor`,
            `NomorTelepon`,
            `NIK`,
            `LokasiAlamatLengkap`,
            `FotoLinkBukti`,
            `PIC`,
            `WaktuResponLevel`
        FROM laporan_satpolpp
        WHERE DOMISILI = :domisili
        ORDER BY `WaktuLaporan` DESC
    ");
    $stmt->execute(['domisili' => $user_domisili]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Format data untuk JS
        $formattedData = [];
    foreach ($rows as $row) {
        // Tentukan Urusan dengan cara kompatibel
        if ($row['layanan'] === '1') {
            $urusan = 'Satpol';
        } elseif ($row['layanan'] === '2') {
            $urusan = 'Damkar';
        } else {
            $urusan = 'Lainnya';
        }

        $formattedData[] = [
            'Tanggal' => $row['waktu_laporan'],
            'Urusan' => $urusan,
            'Jenis Pelanggaran' => $row['KLASIFIKASI'],
            'Detail Aduan' => $row['DETAIL'],
            'Kabupaten/Kota' => $row['DOMISILI'],
            'Status' => $row['Status'],
            // Semua field asli untuk modal
            'NoTiket' => $row['NoTiket'],
            'NamaPelapor' => $row['NamaPelapor'],
            'NomorTelepon' => $row['NomorTelepon'],
            'NIK' => $row['NIK'],
            'LokasiAlamatLengkap' => $row['LokasiAlamatLengkap'],
            'FotoLinkBukti' => $row['FotoLinkBukti'],
            'PIC' => $row['PIC'],
            'WaktuResponLevel' => $row['WaktuResponLevel'],
            'Waktu Laporan' => $row['waktu_laporan'],
            'layanan' => $row['layanan'],
            'KLASIFIKASI' => $row['KLASIFIKASI'],
            'DETAIL' => $row['DETAIL'],
            'DOMISILI' => $row['DOMISILI']
        ];
    }
    $jsonData = json_encode($formattedData);
} catch (Exception $e) {
    echo '<div class="alert alert-danger">Gagal memuat data: ' . htmlspecialchars($e->getMessage()) . '</div>';
    return;
}
?>

<!-- Struktur Tabel -->
<div class="card mb-4">
    <div class="card-body">
        <div class="d-flex justify-content-between mb-3">
            <input type="text" id="searchInput" class="form-control w-25" placeholder="Cari laporan..." />
            <select id="rowsPerPage" class="form-select w-auto">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
            </select>
        </div>

        <div id="table-container">Memuat data...</div>
        <div id="pagination" class="mt-2"></div>
    </div>
</div>



<!-- JavaScript -->
<script>
(function() {
    // Ambil data dari PHP
    const allData = <?= $jsonData ?>;
    let filteredData = [...allData];
    let currentPage = 1;
    const rowsPerPage = 10;


    function renderTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const pageData = filteredData.slice(start, start + rowsPerPage);
        const cols = ["Tanggal", "Urusan", "Jenis Pelanggaran", "Detail Aduan", "Kabupaten/Kota", "Status"];
        
        let html = `<table class="table table-bordered table-hover"><thead><tr>`;
        cols.forEach(c => html += `<th>${c}</th>`);
        html += `</tr></thead><tbody>`;

        pageData.forEach((row, idx) => {
            let statusClass = '';
            const status = (row['Status'] || '').toLowerCase();
            if (status === 'selesai') statusClass = 'table-success';
            else if (status === 'ditangani') statusClass = 'table-warning';
            else if (status === 'confirmed') statusClass = 'table-info';
            
            html += `<tr class="${statusClass}" style="cursor:pointer;" onclick="window.openModal(${start + idx})">`;
            cols.forEach(c => {
                let value = row[c] || '';
                // Format tanggal agar lebih rapi
                if (c === 'Tanggal' && value) {
                    const date = new Date(value);
                    if (!isNaN(date)) {
                        value = date.toLocaleString('id-ID');
                    }
                }
                html += `<td>${value}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        document.getElementById('table-container').innerHTML = html;
        renderPagination();
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        let html = '';
        if (totalPages <= 1) {
            document.getElementById('pagination').innerHTML = '';
            return;
        }
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'} mx-1" onclick="window.changePage(${i})">${i}</button>`;
        }
        document.getElementById('pagination').innerHTML = html;
    }

    window.changePage = (p) => {
        currentPage = p;
        renderTable();
    };
window.openModal = (idx) => {
    const d = filteredData[idx];
    let lines = [];

    // Kolom yang sudah di ringkasan (tidak perlu diulang)
    const hiddenInModal = ['Tanggal', 'Urusan', 'Jenis Pelanggaran', 'Detail Aduan', 'Kabupaten/Kota', 'Status'];

    // Urutan kolom yang ingin ditampilkan
    const displayOrder = [
        'NoTiket', 'Waktu Laporan', 'From', 'NamaPelapor', 'NomorTelepon', 'NIK',
        'LokasiAlamatLengkap', 'FotoLinkBukti', 'PIC', 'WaktuResponLevel',
        'layanan', 'KLASIFIKASI', 'DETAIL', 'DOMISILI'
    ];

    const visibleKeys = displayOrder.filter(key =>
        d.hasOwnProperty(key) &&
        d[key] != null &&
        d[key].toString().trim() !== '' &&
        !hiddenInModal.includes(key)
    );

    // Tentukan lebar maksimal label (dalam karakter)
    const maxLabelLength = Math.max(...visibleKeys.map(k => {
        let label = k
            .replace(/([A-Z])/g, ' $1')      // NoTiket → No Tiket
            .replace(/^./, str => str.toUpperCase())
            .replace('Link Bukti', 'Link Bukti');
        return label.length;
    }), 10); // minimal 10 karakter

    // Bangun konten modal
    visibleKeys.forEach(key => {
        let label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());

        // Jangan kapitalisasi KLASIFIKASI, DETAIL, DOMISILI
        if (key === 'KLASIFIKASI') label = 'Klasifikasi';
        if (key === 'DETAIL') label = 'Detail';
        if (key === 'DOMISILI') label = 'Domisili';

        let value = d[key];

        // Handle Foto/Link Bukti → jadikan link
        if (key === 'FotoLinkBukti' && value) {
            value = value.toString().trim();
            if (value) {
                let url = value;
                if (!/^(https?:\/\/)/.test(url)) {
                    url = 'https://' + url;
                }
                value = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0d6efd; text-decoration:underline;">${value}</a>`;
            }
        } else if (value != null) {
            value = value.toString();
        } else {
            value = '';
        }

        // Format: "Label: Value" dengan padding untuk tab
        lines.push(`<div style="margin-bottom:6px; font-family: monospace; white-space: pre;">${label.padEnd(maxLabelLength)} : ${value}</div>`);
    });

    // Ringkasan utama
    let ringkasan = `
        <p class="fw-bold mb-1" style="font-size:1.1rem;">${d['Jenis Pelanggaran'] || ''} – ${d['Kabupaten/Kota'] || ''}</p>
        <p class="mb-3" style="background:#f8f9fa; padding:10px; border-radius:4px; white-space: pre-wrap; font-family: inherit;">${d['Detail Aduan'] || ''}</p>
        <hr>
    ` + lines.join('');

    document.getElementById('modal-body').innerHTML = ringkasan;

    // Tampilkan modal
    if (window.detailModal) {
        window.detailModal.show();
    } else {
        console.error("Modal belum diinisialisasi.");
    }
};

    // Inisialisasi
    filteredData = [...allData];
    renderTable();

    // Event Listeners
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const q = e.target.value.toLowerCase().trim();
        if (q === '') {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(r => 
                Object.values(r).some(v => v && v.toString().toLowerCase().includes(q))
            );
        }
        currentPage = 1;
        renderTable();
    });

    document.getElementById('rowsPerPage').addEventListener('change', function(e) {
        // Jika Anda ingin rowsPerPage dinamis, aktifkan berikut:
        // rowsPerPage = parseInt(e.target.value); → tapi ini harus jadi variabel global (diubah pakai let)
        // Untuk sementara, biarkan tetap 10 agar tidak ribet. Atau:
        alert("Fitur 'Rows per page' dalam mode static. Silakan ubah langsung di kode jika perlu.");
    });
})();
</script>

<style>
.modal-row { display: flex; margin-bottom: 8px; }
.modal-label { font-weight: bold; width: 40%; }
.modal-value { flex: 1; }
</style>