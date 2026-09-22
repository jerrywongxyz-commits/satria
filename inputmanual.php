<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form Input Laporan Manual</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>

<div class="container mt-5">
    <h2>Input Data Laporan Manual</h2>
    <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#inputLaporanModal">
        Input Laporan Baru
    </button>
</div>

<div class="modal fade" id="inputLaporanModal" tabindex="-1" aria-labelledby="inputLaporanModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title" id="inputLaporanModalLabel">Input Data Detail Laporan Manual</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <form action="proses_input_laporan.php" method="POST">
                <div class="modal-body">
                    <h6 class="mb-3 text-primary">I. Informasi Pelapor & Laporan</h6>
                    <div class="row g-3">
                        
                        <div class="col-md-6">
                            <label for="no_tiket" class="form-label">No Tiket</label>
                            <input type="text" class="form-control" id="no_tiket" name="no_tiket" value="TKT-<?php echo time(); ?>" readonly>
                        </div>
                        <div class="col-md-6">
                            <label for="waktu_laporan" class="form-label">Waktu Laporan</label>
                            <input type="text" class="form-control" id="waktu_laporan" name="waktu_laporan" value="<?php echo date('d F Y H:i:s'); ?>" required>
                        </div>

                        <div class="col-md-6">
                            <label for="nama_pelapor" class="form-label">Nama Pelapor</label>
                            <input type="text" class="form-control" id="nama_pelapor" name="nama_pelapor" value="Jerry Setiawan" required>
                        </div>
                        <div class="col-md-6">
                            <label for="nomor_telepon" class="form-label">Nomor Telepon</label>
                            <input type="tel" class="form-control" id="nomor_telepon" name="nomor_telepon" value="082256733213" required>
                        </div>

                        <div class="col-md-6">
                            <label for="nik" class="form-label">NIK</label>
                            <input type="text" class="form-control" id="nik" name="nik" value="6473010302940002" required>
                        </div>
                        <div class="col-md-6">
                            <label for="layanan" class="form-label">Layanan</label>
                            <select id="layanan" name="layanan" class="form-select" required>
                                <option value="Satpol PP" selected>Satpol PP</option>
                                <option value="Pemadam Kebakaran">Pemadam Kebakaran</option>
                            </select>
                        </div>
                    </div>
                    
                    <hr>
                    <h6 class="mb-3 text-primary">II. Detail Kejadian</h6>
                    <div class="row g-3">
                        
                        <div class="col-md-6">
                            <label for="klasifikasi" class="form-label">KLASIFIKASI</label>
                            <input type="text" class="form-control" id="klasifikasi" name="klasifikasi" value="Perkelahian" required>
                        </div>
                        <div class="col-md-6">
                            <label for="ranah_perda" class="form-label">Ranah Perda</label>
                            <input type="text" class="form-control" id="ranah_perda" name="ranah_perda" placeholder="Contoh: Perda No. 1 Tahun 2024">
                        </div>
                        
                        <div class="col-md-6">
                            <label for="waktu_kejadian" class="form-label">Waktu Kejadian</label>
                            <input type="datetime-local" class="form-control" id="waktu_kejadian" name="waktu_kejadian" required>
                        </div>
                        <div class="col-md-6">
                            <label for="kabupaten" class="form-label">Kabupaten Terjadinya Pelanggaran</label>
                            <input type="text" class="form-control" id="kabupaten" name="kabupaten" value="Kota Tarakan" required>
                        </div>

                        <div class="col-md-6">
                            <label for="kecamatan" class="form-label">Kecamatan Terjadinya Pelanggaran</label>
                            <input type="text" class="form-control" id="kecamatan" name="kecamatan" value="Tarakan Tengah" required>
                        </div>
                        <div class="col-md-6">
                            <label for="kelurahan" class="form-label">Desa/Kelurahan Terjadinya Pelanggaran</label>
                            <input type="text" class="form-control" id="kelurahan" name="kelurahan" value="Sebengkok" required>
                        </div>

                        <div class="col-12">
                            <label for="alamat_lengkap" class="form-label">Lokasi dan Alamat Lengkap</label>
                            <textarea class="form-control" id="alamat_lengkap" name="alamat_lengkap" rows="2" required>Jl. Mulawarman No. 6, Kel. Sebengkok, Kec. Tarakan Tengah, Kota Tarakan, Kalimantan Utara</textarea>
                        </div>

                        <div class="col-12">
                            <label for="detail_laporan" class="form-label">DETAIL Laporan</label>
                            <textarea class="form-control" id="detail_laporan" name="detail_laporan" rows="3" required>Dua warga terlibat perkelahian di depan warung makan.</textarea>
                        </div>

                        <div class="col-12">
                            <label for="link_bukti" class="form-label">Foto/Link Bukti</label>
                            <input type="url" class="form-control" id="link_bukti" name="link_bukti" placeholder="Masukkan URL link foto atau dokumen">
                        </div>
                        
                    </div>
                    
                    <hr>
                    <h6 class="mb-3 text-primary">III. Status & Tindak Lanjut</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="pic" class="form-label">PIC (Person In Charge)</label>
                            <input type="text" class="form-control" id="pic" name="pic" placeholder="Nama petugas yang menangani">
                        </div>
                        <div class="col-md-6">
                            <label for="status" class="form-label">Status</label>
                            <select id="status" name="status" class="form-select">
                                <option value="new" selected>new</option>
                                <option value="in_progress">in_progress</option>
                                <option value="closed">closed</option>
                            </select>
                        </div>
                        
                        <div class="col-12">
                            <label for="waktu_respon" class="form-label">Waktu Respon</label>
                            <input type="datetime-local" class="form-control" id="waktu_respon" name="waktu_respon">
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                    <button type="submit" class="btn btn-success">Simpan Data Laporan</button>
                </div>
            </form>
        </div>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>