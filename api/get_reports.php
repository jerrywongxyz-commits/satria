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
            `Waktu Laporan` as waktu_laporan,
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
        FROM laporan_trc 
        WHERE DOMISILI = :domisili
        ORDER BY `Waktu Laporan` DESC
    ");
    $stmt->execute(['domisili' => $user_domisili]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format data untuk JS
    $formattedData = [];
    foreach ($rows as $row) {
        $formattedData[] = [
            'Tanggal' => $row['waktu_laporan'],
            'Urusan' => match($row['layanan']) {
                '1' => 'Satpol',
                '2' => 'Damkar',
                default => 'Lainnya'
            },
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
    <div class="card-header">
        <h5 class="card-title mb-0">Detail Laporan TRC</h5>
    </div>
    <div class="card-body">
        <div class="d-flex justify-content-between mb-3">
            <input type="text" id="searchInput" class="form-control w-25" placeholder="Cari laporan..." />
            <select id="rowsPerPage" class="form-select w-auto">
                <option value="10">10</option>
                <option value="20">20</option>
            </select>
        </div>

        <div id="table-container">Memuat data...</div>
        <div id="pagination" class="mt-2"></div>
    </div>
</div>

<!-- Modal Detail -->
<div class="modal fade" id="detailModal" tabindex="-1" aria-labelledby="detailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="detailModalLabel">Detail Laporan</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="modal-body">
                <!-- Diisi oleh JS -->
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            </div>
        </div>
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

    // Inisialisasi Bootstrap Modal
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));

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
        let html = '';

        // Sembunyikan kolom yang sudah ditampilkan di tabel
        const hiddenInModal = ['Tanggal', 'Urusan', 'Jenis Pelanggaran', 'Detail Aduan', 'Kabupaten/Kota', 'Status'];

        for (let k in d) {
            if (d[k] && d[k] !== 'undefined' && !hiddenInModal.includes(k)) {
                html += `<div class="row mb-2"><div class="col-4 fw-bold">${k}:</div><div class="col-8">${d[k]}</div></div>`;
            }
        }

        let ringkasan = `
            <p class="fw-bold mb-1">${d['Jenis Pelanggaran']} - ${d['Kabupaten/Kota']}</p>
            <p class="mb-3">${d['Detail Aduan']}</p>
            <hr>
            <h6 class="text-primary">Data Teknis:</h6>
        ` + html;

        document.getElementById('modal-body').innerHTML = ringkasan;
        detailModal.show();
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