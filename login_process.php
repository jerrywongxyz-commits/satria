<?php
// Langkah 1: Mulai session
session_start();

// Langkah 2: Cek apakah data POST telah dikirimkan
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
// 1. Ambil data dari form
$input_username = $_POST['username'];
$input_password = $_POST['password'];

// 2. Konfigurasi Koneksi Database (Ganti dengan kredensial Anda)
$host = 'localhost';
$db   = 'satpolppkaltara';
$user = 'satpolppkaltara';
$pass = 'FK6SY42cr8Beif5t';
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
     throw new \PDOException($e->getMessage(), (int)$e->getCode());
}

// 3. Persiapkan dan Jalankan Prepared Statement
// Tanda tanya (?) adalah placeholder untuk Prepared Statement
$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE username = ?');
$stmt->execute([$input_username]);
$user_data = $stmt->fetch();

// 4. Verifikasi Hasil
if ($user_data) {
    // Verifikasi password yang dimasukkan dengan hash yang tersimpan di DB
    if (password_verify($input_password, $user_data['password_hash'])) {
        // Login Berhasil
        $_SESSION['logged_in'] = TRUE;
        $_SESSION['username'] = $input_username; 
        header("Location: dashboard/dist/index.php");
        exit;
    }
}

// Logika redirect kegagalan (biasanya ini adalah bagian akhir di dalam blok POST)
header("Location: index.html?error=1");
exit;

// -----------------------------------------------------
// BARIS INI (PENUTUP BLOK IF POST) HARUS ADA:
} 
// -----------------------------------------------------

// Logika jika ada yang mencoba mengakses file ini secara langsung tanpa POST
else {
    header("Location: index.html");
    exit;
}
?>