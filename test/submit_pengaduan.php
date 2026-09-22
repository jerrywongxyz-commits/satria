<?php
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nama = $_POST['nama'];
    $kontak = $_POST['kontak'];
    $lokasi = $_POST['lokasi'];
    $kategori = $_POST['kategori'];
    $uraian = $_POST['uraian'];
    
    // Generate Tiket Acak
    $tiket = "SP-" . strtoupper(substr(md5(time()), 0, 5));

    // Handle Upload File
    $nama_file = $_FILES['lampiran']['name'];
    $tmp_file = $_FILES['lampiran']['tmp_name'];
    $path = "uploads/" . $nama_file;
    move_uploaded_file($tmp_file, $path);

    $sql = "INSERT INTO pengaduan (nomor_tiket, nama_pelapor, email_hp, lokasi, kategori, uraian, lampiran) 
            VALUES ('$tiket', '$nama', '$kontak', '$lokasi', '$kategori', '$uraian', '$nama_file')";

    if (mysqli_query($conn, $sql)) {
        echo json_encode(['status' => 'success', 'tiket' => $tiket]);
    } else {
        echo json_encode(['status' => 'error']);
    }
}
?>