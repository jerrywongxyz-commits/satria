<?php
session_start();

// Cek apakah sudah login
if (!isset($_SESSION['user_id'])) {
    header('Location: ../login.php');
    exit;
}

// Ambil data dari sesi
$user_id = $_SESSION['user_id'];
$user_name = $_SESSION['user_name'];
$user_region = $_SESSION['user_region'];