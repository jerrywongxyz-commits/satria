<?php
// 1. Memulai atau Mengakses Sesi yang Sudah Ada
session_start();

// 2. Menghapus SEMUA variabel sesi
// Ini hanya menghapus data dari array $_SESSION, tetapi sesi masih aktif.
$_SESSION = array();

// 3. Menghancurkan Cookie Sesi (Opsional tapi Sangat Direkomendasikan)
// Ini berguna jika Anda menggunakan cookie sesi. Ini mengatur waktu kedaluwarsa (expiration time) 
// cookie sesi menjadi masa lalu.
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// 4. Menghancurkan Sesi
// Ini menghapus file sesi dari server.
session_destroy();

// Opsional: Redirect ke halaman login setelah logout berhasil
header("Location: index.html?logout=success");
exit;
?>