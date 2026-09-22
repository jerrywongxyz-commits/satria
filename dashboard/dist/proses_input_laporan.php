<?php
// Pastikan koneksi dan Prepared Statements digunakan untuk mencegah SQL Injection

// 1. KONFIGURASI DAN KONEKSI DATABASE
// Pastikan kredensial ini SAMA dengan yang Anda gunakan:
$host = 'localhost';
$db   = 'satpolppkaltara';
$user = 'satpolppkaltara';
$pass = 'FK6SY42cr8Beif5t'; // Ganti dengan password Anda
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // Hentikan proses dan tampilkan error jika koneksi gagal
     die("Koneksi Database Gagal: " . $e->getMessage());
}


// 2. CEK METHOD POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Ambil data dari form dan sanitasi (membersihkan input)
    // Walaupun menggunakan Prepared Statements, sanitasi dasar tetap baik.
    $no_tiket = filter_input(INPUT_POST, 'no_tiket', FILTER_SANITIZE_STRING);
    $waktu_laporan = filter_input(INPUT_POST, 'waktu_laporan', FILTER_SANITIZE_STRING);
    $nomor_telepon = filter_input(INPUT_POST, 'nomor_telepon', FILTER_SANITIZE_STRING);
    $nama_pelapor = filter_input(INPUT_POST, 'nama_pelapor', FILTER_SANITIZE_STRING);
    $nik = filter_input(INPUT_POST, 'nik', FILTER_SANITIZE_STRING);
    $layanan = filter_input(INPUT_POST, 'layanan', FILTER_SANITIZE_STRING);
    $klasifikasi = filter_input(INPUT_POST, 'klasifikasi', FILTER_SANITIZE_STRING);
    $ranah_perda = filter_input(INPUT_POST, 'ranah_perda', FILTER_SANITIZE_STRING);
    $detail_laporan = filter_input(INPUT_POST, 'detail_laporan', FILTER_SANITIZE_STRING);
    $link_bukti = filter_input(INPUT_POST, 'link_bukti', FILTER_SANITIZE_URL);
    $pic = filter_input(INPUT_POST, 'pic', FILTER_SANITIZE_STRING);
    $status = filter_input(INPUT_POST, 'status', FILTER_SANITIZE_STRING);
    // Asumsi Domisili, Waktu Kejadian, dan Lokasi Lainnya diambil langsung dari form
    $waktu_kejadian = filter_input(INPUT_POST, 'waktu_kejadian', FILTER_SANITIZE_STRING);
    $kabupaten = filter_input(INPUT_POST, 'kabupaten', FILTER_SANITIZE_STRING);
    $kecamatan = filter_input(INPUT_POST, 'kecamatan', FILTER_SANITIZE_STRING);
    $kelurahan = filter_input(INPUT_POST, 'kelurahan', FILTER_SANITIZE_STRING);
    $alamat_lengkap = filter_input(INPUT_POST, 'alamat_lengkap', FILTER_SANITIZE_STRING);
    $waktu_respon = filter_input(INPUT_POST, 'waktu_respon', FILTER_SANITIZE_STRING);

    // KARENA KODE ANDA BERSUMBER DARI FORM MODAL, KOLOM 'DOMISILI' SAYA ASUMSIKAN DIISI DENGAN KABUPATEN
    $domisili = $kabupaten; 
    
    // 3. QUERY MENGGUNAKAN PREPARED STATEMENT (Sangat Aman)
    // Tanda tanya (?) digunakan sebagai placeholder untuk nilai yang akan di-bind.
    $sql = "INSERT INTO laporan_satpolpp (NoTiket, WaktuLaporan, NomorTelepon, NamaPelapor, layanan, NIK, DOMISILI, KLASIFIKASI, RanahPerda, DETAIL, FotoLinkBukti, PIC, Status, WaktuKejadian, Kabupaten, Kecamatan, DesaKelurahan, LokasiAlamatLengkap, WaktuRespon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    try {
        $stmt = $pdo->prepare($sql);
        
        // Eksekusi Prepared Statement dengan array data
        // Urutan nilai di array harus SAMA dengan urutan kolom di query SQL di atas.
        $stmt->execute([
            $no_tiket,
            $waktu_laporan,
            $nomor_telepon,
            $nama_pelapor,
            $layanan,
            $nik,
            $domisili,
            $klasifikasi,
            $ranah_perda,
            $detail_laporan,
            $link_bukti,
            $pic,
            $status,
            $waktu_kejadian,
            $kabupaten,
            $kecamatan,
            $kelurahan,
            $alamat_lengkap,
            $waktu_respon
        ]);

        // Redirect ke halaman sukses atau halaman utama
        header("Location: dashboard.php?status=success");
        exit;

    } catch (\PDOException $e) {
        // Tangani error saat menjalankan query (misalnya NoTiket Duplikat)
        die("Gagal menyimpan data: " . $e->getMessage());
    }

} else {
    // Jika diakses tanpa method POST, kembalikan ke halaman form
    header("Location: index.php"); 
    exit;
}
?>