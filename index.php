<?php
// 1. Error Reporting dan Konfigurasi Awal
error_reporting(E_ALL ^ (E_NOTICE | E_WARNING));

// 2. Start Session
session_start();

// 3. Inisialisasi/Koneksi yang Dibutuhkan
$name1 = $_SESSION['usernamex'] ?? null; // Gunakan operator Null Coalescing (??) untuk mencegah Notice jika belum ada sesi
$oid = $_SESSION['opd_id'] ?? null;
include 'conn.php'; // Atau koneksi database di sini

// Definisikan map sesi dan tujuan routing
$routes = [
    "Admin" => "admin/index.php",
    "KBL"   => "bulungan/index.php",
    "KTR"   => "tarakan/index.php",
    "KML"   => "malinau/index.php",
    "KNN"   => "nunukan/index.php",
    "KTT"   => "tana_tidung/index.php",
    // Tambahkan rute lain di sini
];

// Lakukan perulangan untuk memeriksa sesi
foreach ($routes as $session_key => $destination) {
    if (isset($_SESSION[$session_key])) {
        header("Location: $destination");
        exit;
    }
}

include 'index.html';
exit;
?>




