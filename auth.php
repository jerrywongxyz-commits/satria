<?php
session_start();
require_once 'config/database.php';


if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
// 1. Ambil data dari form
$input_username = $_POST['username'];
$input_password = $_POST['password'];


// 3. Persiapkan dan Jalankan Prepared Statement
// Tanda tanya (?) adalah placeholder untuk Prepared Statement
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
$stmt->execute([$input_username]);
$user_data = $stmt->fetch();

// 4. Verifikasi Hasil
if ($user_data) {
    // Verifikasi password yang dimasukkan dengan hash yang tersimpan di DB
    if (password_verify($input_password, $user_data['password_hash'])) {
        // Login Berhasil
        $_SESSION['logged_in'] = TRUE;
        $_SESSION['username'] = $input_username; 
        $_SESSION['nama'] = $user_data['nama']; 
        $_SESSION['domisili'] = $user_data['domisili'];
        header("Location: dashboard/dist/");
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