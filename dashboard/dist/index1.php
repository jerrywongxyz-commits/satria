<?php
session_start();
if (!isset($_SESSION['username'])) {
    // Ubah tujuan menjadi '/' saja
    header('Location: /'); 
    exit;
}

$user_name = htmlspecialchars($_SESSION['nama']);
$user_domisili = htmlspecialchars($_SESSION['domisili']); // ← Tambahkan ini
?>
<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>AdminLTE v4 | Dashboard - Monitoring</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
    
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <link rel="stylesheet" href="./css/adminlte.css" />
    
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/source-sans-3@5.0.12/index.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/styles/overlayscrollbars.min.css" />
    
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }
        /* Peta Container Style */
        #mapRawan { 
            height: 360px; 
            width: 100%; 
            border-radius: 12px;
        }

        /* Style untuk Info/Legenda Peta (Dari peta.html) */
        .info {
            padding: 6px 8px;
            font: 14px/16px Arial, Helvetica, sans-serif;
            background: white;
            background: rgba(255,255,255,0.8);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            border-radius: 5px;
            z-index: 1000; /* Pastikan di atas map */
        }
        .info h4 {
            margin: 0 0 5px;
            color: #777;
        }
        /* Tambahan style untuk kotak warna legenda */
        .legend {
            line-height: 18px;
            color: #555;
        }
        .legend i {
            width: 18px;
            height: 18px;
            float: left;
            margin-right: 8px;
            opacity: 0.7;
        }

        /* Table Styles */
        #table-container {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow-x: auto;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9rem; }
        th { background-color: #e9ecef; font-weight: bold; cursor: pointer; }
        
        /* Highlight Status */
        .status-confirmed { background-color: #ffebee !important; }
        .status-ditangani { background-color: #fff3cd !important; }
        .status-selesai { background-color: #e8f5e9 !important; }

        /* Pagination */
        #pagination { margin-top: 15px; text-align: center; }
        .pagination-btn { margin: 0 5px; padding: 5px 10px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
        .pagination-btn.active { background: #0d6efd; color: white; border-color: #0d6efd; }

        /* Modal */
        /* Z-index ditingkatkan ke 1060 untuk mengatasi konflik dengan AdminLTE/Bootstrap backdrop */
        .modal { display: none; position: fixed; z-index: 1060; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); }
        .modal-content { background-color: white; margin: 5% auto; padding: 20px; border-radius: 8px; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; }
        .close { float: right; font-size: 24px; font-weight: bold; cursor: pointer; }
        .modal-row { margin-bottom: 10px; display: flex; }
        .modal-label { font-weight: bold; width: 30%; }
        .modal-value { width: 70%; word-break: break-word; }
    </style>
  </head>
  
  <body class="layout-fixed sidebar-expand-lg sidebar-open bg-body-tertiary">
    <div class="app-wrapper">
      
      <nav class="app-header navbar navbar-expand bg-body">
        <div class="container-fluid">
          <!--begin::Start Navbar Links-->
          <ul class="navbar-nav">
            <li class="nav-item">
              <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button">
                <i class="bi bi-list"></i>
              </a>
            </li>
            <li class="nav-item d-none d-md-block"><a href="#" class="nav-link">Dashboard Monitoring</a></li>
          </ul>
          <!--end::Start Navbar Links-->
          <!--begin::End Navbar Links-->
          <ul class="navbar-nav ms-auto">
            <!--begin::Navbar Search-->
            <li class="nav-item">
              <a class="nav-link" data-widget="navbar-search" href="#" role="button">
                <i class="bi bi-search"></i>
              </a>
            </li>
            <!--end::Navbar Search-->
            <!--begin::Messages Dropdown Menu-->
            <li class="nav-item dropdown">
              <a class="nav-link" data-bs-toggle="dropdown" href="#">
                <i class="bi bi-chat-text"></i>
                <span class="navbar-badge badge text-bg-danger">3</span>
              </a>
              <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end">
                <a href="#" class="dropdown-item">
                  <!--begin::Message-->
                  <div class="d-flex">
                    <div class="flex-shrink-0">
                      <img
                        src="./assets/img/user1-128x128.jpg"
                        alt="User Avatar"
                        class="img-size-50 rounded-circle me-3"
                      />
                    </div>
                    <div class="flex-grow-1">
                      <h3 class="dropdown-item-title">
                        Brad Diesel
                        <span class="float-end fs-7 text-danger"
                          ><i class="bi bi-star-fill"></i
                        ></span>
                      </h3>
                      <p class="fs-7">Call me whenever you can...</p>
                      <p class="fs-7 text-secondary">
                        <i class="bi bi-clock-fill me-1"></i> 4 Hours Ago
                      </p>
                    </div>
                  </div>
                  <!--end::Message-->
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item">
                  <!--begin::Message-->
                  <div class="d-flex">
                    <div class="flex-shrink-0">
                      <img
                        src="./assets/img/user8-128x128.jpg"
                        alt="User Avatar"
                        class="img-size-50 rounded-circle me-3"
                      />
                    </div>
                    <div class="flex-grow-1">
                      <h3 class="dropdown-item-title">
                        John Pierce
                        <span class="float-end fs-7 text-secondary">
                          <i class="bi bi-star-fill"></i>
                        </span>
                      </h3>
                      <p class="fs-7">I got your message bro</p>
                      <p class="fs-7 text-secondary">
                        <i class="bi bi-clock-fill me-1"></i> 4 Hours Ago
                      </p>
                    </div>
                  </div>
                  <!--end::Message-->
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item">
                  <!--begin::Message-->
                  <div class="d-flex">
                    <div class="flex-shrink-0">
                      <img
                        src="./assets/img/user3-128x128.jpg"
                        alt="User Avatar"
                        class="img-size-50 rounded-circle me-3"
                      />
                    </div>
                    <div class="flex-grow-1">
                      <h3 class="dropdown-item-title">
                        Nora Silvester
                        <span class="float-end fs-7 text-warning">
                          <i class="bi bi-star-fill"></i>
                        </span>
                      </h3>
                      <p class="fs-7">The subject goes here</p>
                      <p class="fs-7 text-secondary">
                        <i class="bi bi-clock-fill me-1"></i> 4 Hours Ago
                      </p>
                    </div>
                  </div>
                  <!--end::Message-->
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item dropdown-footer">See All Messages</a>
              </div>
            </li>
            <!--end::Messages Dropdown Menu-->
            <!--begin::Notifications Dropdown Menu-->
            <li class="nav-item dropdown">
              <a class="nav-link" data-bs-toggle="dropdown" href="#">
                <i class="bi bi-bell-fill"></i>
                <span class="navbar-badge badge text-bg-warning">15</span>
              </a>
              <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end">
                <span class="dropdown-item dropdown-header">15 Notifications</span>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item">
                  <i class="bi bi-envelope me-2"></i> 4 new messages
                  <span class="float-end text-secondary fs-7">3 mins</span>
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item">
                  <i class="bi bi-people-fill me-2"></i> 8 friend requests
                  <span class="float-end text-secondary fs-7">12 hours</span>
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item">
                  <i class="bi bi-file-earmark-fill me-2"></i> 3 new reports
                  <span class="float-end text-secondary fs-7">2 days</span>
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item dropdown-footer"> See All Notifications </a>
              </div>
            </li>
            <!--end::Notifications Dropdown Menu-->
            <!--begin::Fullscreen Toggle-->
            <li class="nav-item">
              <a class="nav-link" href="#" data-lte-toggle="fullscreen">
                <i data-lte-icon="maximize" class="bi bi-arrows-fullscreen"></i>
                <i data-lte-icon="minimize" class="bi bi-fullscreen-exit" style="display: none"></i>
              </a>
            </li>
            <!--end::Fullscreen Toggle-->
            <!--begin::User Menu Dropdown-->
            <li class="nav-item dropdown user-menu">
              <a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
                <img
                  src="./assets/img/user2-160x160.jpg"
                  class="user-image rounded-circle shadow"
                  alt="User Image"
                />
                <span class="d-none d-md-inline"><?= $user_name ?></span>
              </a>
              <ul class="dropdown-menu dropdown-menu-lg dropdown-menu-end">
                <!--begin::User Image-->
                <li class="user-header text-bg-primary">
                  <img
                    src="./assets/img/user2-160x160.jpg"
                    class="rounded-circle shadow"
                    alt="User Image"
                  />
                  <p>
                    <?= $user_name ?>
                    <small>Member since Nov. 2023</small>
                  </p>
                </li>
                <!--end::User Image-->
                <!--begin::Menu Body-->
                <li class="user-body">
                  <!--begin::Row-->
                  <div class="row">
                    <div class="col-4 text-center"><a href="#">Followers</a></div>
                    <div class="col-4 text-center"><a href="#">Sales</a></div>
                    <div class="col-4 text-center"><a href="#">Friends</a></div>
                  </div>
                  <!--end::Row-->
                </li>
                <!--end::Menu Body-->
                <!--begin::Menu Footer-->
                <li class="user-footer">
                  <a href="#" class="btn btn-default btn-flat">Profile</a>
                  <a href="../../logout.php" class="btn btn-default btn-flat float-end">Sign out</a>
                </li>
                <!--end::Menu Footer-->
              </ul>
            </li>
            <!--end::User Menu Dropdown-->
          </ul>
          <!--end::End Navbar Links-->
        </div>
      </nav>
      <aside class="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <div class="sidebar-brand">
          <a href="./index.html" class="brand-link">
            <img src="./assets/img/AdminLTELogo.png" alt="Logo" class="brand-image opacity-75 shadow" />
            <span class="brand-text fw-light">Admin Panel</span>
          </a>
        </div>
        <div class="p-3">
            <h5 class="text-white mb-3">Filter Data</h5>
            
            <label for="filter-tahun" class="form-label fw-bold text-white-50">Tahun</label>
            <select id="filter-tahun" class="form-select mb-3 form-select-sm">
                <option value="2024">2024</option>
                <option value="2025" selected>2025</option>
            </select>

            <label for="filter-bulan" class="form-label fw-bold text-white-50">Bulan</label>
            <select id="filter-bulan" class="form-select mb-3 form-select-sm">
                <option value="all" selected>Semua Bulan (Tahun Ini)</option>
                <option value="0">Januari</option>
                <option value="1">Februari</option>
                <option value="2">Maret</option>
                <option value="3">April</option>
                <option value="4">Mei</option>
                <option value="5">Juni</option>
                <option value="6">Juli</option>
                <option value="7">Agustus</option>
                <option value="8">September</option>
                <option value="9">Oktober</option>
                <option value="10">November</option>
                <option value="11">Desember</option>
            </select>

            <label for="filter-layanan" class="form-label fw-bold text-white-50">Urusan Layanan</label>
            <select id="filter-layanan" class="form-select mb-3 form-select-sm">
                <option value="all" selected>Semua Urusan</option>
                <option value="satpolpp">Satpol PP</option>
                <option value="damkar">Damkar</option>
            </select>
                <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#inputLaporanModal">
        Input Laporan Baru
    </button>
            </div>
      </aside>
      <main class="app-main">
        <div class="app-content-header">
          <div class="container-fluid">
            <div class="row">
              <div class="col-sm-6"><h3 class="mb-0">Dashboard</h3></div>
            </div>
          </div>
        </div>

        <div class="app-content">
          <div class="container-fluid">
            <div class="row">
              <div class="col-lg-3 col-6">
                <div class="small-box text-bg-primary">
                  <div class="inner">
                    <h6 class="small">Total Aduan Masuk</h6>
                    <h2 class="fw-bold">453</h2>
                    <p class="mb-0 small">Aduan Masuk</p>
                  </div>
                </div>
              </div>
              <div class="col-lg-3 col-6">
                <div class="small-box text-bg-success">
                  <div class="inner">
                    <h6 class="small">Rata-rata Waktu Respons</h6>
                    <h2 class="fw-bold">15 Menit</h2>
                    <p class="mb-0 small">Target: 20 Menit</p>
                  </div>
                </div>
              </div>
              <div class="col-lg-3 col-6">
                <div class="small-box text-bg-warning">
                  <div class="inner">
                    <h6 class="small">Persentase Selesai</h6>
                    <h2 class="fw-bold">92%</h2>
                    <p class="mb-0 small">8% Masih Proses</p>
                  </div>
                </div>
              </div>
              <div class="col-lg-3 col-6">
                <div class="small-box text-bg-danger">
                  <div class="inner">
                    <h6 class="small">Aduan per Urusan</h6>
                    <div class="d-flex justify-content-between">
                        <h2 class="fw-bold">Satpol: 280</h2>
                        <h2 class="fw-bold">Damkar: 173</h2>
                    </div>
                    <p class="mb-0 small">Total: 453 Aduan</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-lg-6 connectedSortable">
                <div class="card mb-4">
                  <div class="card-header"><h3 class="card-title">Tren Waktu Laporan</h3></div>
                  <div class="card-body">
                      <canvas id="chart-tren" style="height:360px;"></canvas>
                  </div>
                </div>
              </div>
              
              <div class="col-lg-6 connectedSortable">
                <div class="card mb-4">
                    <div class="card-header"><h3 class="card-title">Peta Rawan Pelanggaran</h3></div>
                    <div class="card-body"> <div id="mapRawan" style="height:360px;border-radius:12px;overflow:hidden"></div></div>
                  </div>
                </div>
              </div>
              
              <div class="row">
                <div class="col-lg-6 connectedSortable">
                    <div class="card mb-4">
                        <div class="card-header"><h3 class="card-title">Breakdown Kategori</h3></div>
                        <div class="card-body">
                            <ul class="nav nav-tabs" id="breakdownTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="pelanggaran-tab" data-bs-toggle="tab" data-bs-target="#pelanggaran-pane" type="button">Jenis Pelanggaran</button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="perda-tab" data-bs-toggle="tab" data-bs-target="#perda-pane" type="button">Perda Teratas</button>
                                </li>
                            </ul>
                            <div class="tab-content pt-3">
                                <div class="tab-pane fade show active" id="pelanggaran-pane">
                                    <canvas id="chart-pelanggaran" style="height: 220px;"></canvas>
                                </div>
                                <div class="tab-pane fade" id="perda-pane">
                                    <canvas id="chart-perda" style="height: 220px;"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              
                <div class="col-lg-6 connectedSortable">
                    <div class="card mb-4">
                        <div class="card-header"><h3 class="card-title">Kinerja TRC</h3></div>
                        <div class="card-body">
                            <select id="filter-kinerja-urusan" class="form-select form-select-sm mb-3">
                                <option value="all" selected>Semua Urusan</option>
                                <option value="satpolpp">Satpol PP</option>
                                <option value="damkar">Damkar</option>
                            </select>
                            <canvas id="chart-kinerja-trc" style="height: 300px;"></canvas>
                        </div>
                    </div>
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-12">
                    <div class="card mb-4">
                        <div class="card-header"><h5 class="card-title">Detail Laporan TRC</h5></div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-3">
                                <input type="text" id="searchInput" class="form-control w-25" placeholder="Cari laporan..." />
                                <select id="rowsPerPage" class="form-select w-auto">
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                </select>
                            </div>
                            <div id="table-container">Memuat data...</div>
                            <div id="pagination"></div>
                        </div>
                    </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
      
      <footer class="app-footer">
        <strong>Copyright &copy; 2025 <a href="#">Admin Panel</a>.</strong> All rights reserved.
      </footer>
    </div>

    <div class="modal fade" id="detailModal" tabindex="-1" aria-labelledby="detailModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-secondary text-white">
                    <h5 class="modal-title" id="detailModalLabel">Detail Laporan</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="modal-body">
                    </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                </div>
            </div>
        </div>
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
                                <option value="ditangani">ditangani</option>
                                <option value="confirmed">confirmed</option>
                                <option value="selesai">selesai</option>
                            </select>
                        </div>
                        
                        <div class="col-12">
                            <label for="waktu_respon" class="form-label">Waktu Respon (Isi jika status selesai/ditangani)</label>
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
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/browser/overlayscrollbars.browser.es6.min.js"></script>
    <script src="./js/adminlte.js"></script>

    <script>
        // === Konfigurasi Peta ===
        // Pastikan file GeoJSON ini ada di direktori yang sama
        const GEOJSON_URL = "Kalut.geojson"; 
        const CSV_MAP_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlo4EDlQMWwT52h7P3A2F-DjAPm4a2R1AnRXB6zHotRU-IOLxQ0j4f_XSrzPwg0abLmM36sO7X9vsA/pub?gid=0&single=true&output=csv";

        // Inisialisasi peta pada div 'mapRawan'
        // Koordinat awal [1.5, 116.0] dari peta.html atau [2.843, 117.37] untuk Kalut spesifik
        const map = L.map('mapRawan').setView([2.843, 117.37], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Warna untuk chloropeth
        function getColor(d) {
            return d > 20 ? '#800026' :
                   d > 10  ? '#BD0026' :
                   d > 5  ? '#E31A1C' :
                   d > 0  ? '#FC4E2A' :
                            '#FFEDA0';
        }

        function style(feature) {
            return {
                fillColor: getColor(aduanPerKabupaten[feature.properties.kabupaten] || 0),
                weight: 0.5,
                opacity: 1,
                color: 'white',
                dashArray: '1',
                fillOpacity: 0.9
            };
        }

       // === Legenda ===
        const legend = L.control({position: 'bottomright'});
        
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            
            // Angka batas ini HARUS SAMA dengan yang ada di function getColor
            const grades = [0, 5, 10, 20]; 
            const labels = [];
            let from, to;

            // 1. Label khusus untuk 0 (Tidak ada aduan)
            labels.push(
                '<i style="background:' + getColor(0) + '"></i> 0'
            );

            // 2. Loop untuk membuat rentang angka (1-2, 3-5, 6-10)
            for (let i = 0; i < grades.length; i++) {
                // from adalah angka setelah batas bawah (misal batas 0, maka from 1)
                from = grades[i] + 1; 
                // to adalah batas atas berikutnya
                to = grades[i + 1];

                // Cek apakah ini rentang terakhir atau bukan
                if (to) {
                    // Contoh: 1 - 2
                    labels.push(
                        '<i style="background:' + getColor(from) + '"></i> ' +
                        from + ' &ndash; ' + to
                    );
                } else {
                    // Contoh: > 10 (Ini adalah item terakhir loop)
                    labels.push(
                        '<i style="background:' + getColor(from) + '"></i> > ' + grades[i]
                    );
                }
            }

            div.innerHTML = '<h4>Jml Aduan</h4>' + labels.join('<br>');
            return div;
        };
        
        legend.addTo(map);

        // Interaksi Hover
        function highlightFeature(e) {
            const layer = e.target;
            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.9
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
            info.update(layer.feature.properties);
        }

        function resetHighlight(e) {
            geojson.resetStyle(e.target);
            info.update();
        }

        function zoomToFeature(e) {
            map.fitBounds(e.target.getBounds());
        }

        // Popup info panel (pojok kanan atas peta)
        const info = L.control();
        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };
        info.update = function (props) {
            this._div.innerHTML = '<h4>Wilayah</h4>' +  (props ?
                '<b>' + props.kabupaten + '</b><br />' + (aduanPerKabupaten[props.kabupaten] || 0) + ' aduan'
                : 'Arahkan kursor');
        };
        info.addTo(map);

        // Simpan data
        let aduanPerKabupaten = {};
        let geojson;

        // === Fungsi Parse CSV Map ===
        function parseCSVMap(csvText) {
            const rows = [];
            let currentRow = [];
            let currentCell = '';
            let inQuotes = false;
            for (let i = 0; i < csvText.length; i++) {
                const char = csvText[i];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) { currentRow.push(currentCell); currentCell = ''; }
                else if ((char === '\n' || char === '\r') && !inQuotes) {
                    currentRow.push(currentCell);
                    rows.push(currentRow);
                    currentRow = []; currentCell = '';
                    if (char === '\r' && csvText[i + 1] === '\n') i++;
                } else currentCell += char;
            }
            if (currentCell || currentRow.length > 0) { currentRow.push(currentCell); rows.push(currentRow); }
            return rows;
        }

        // === Eksekusi Muat Data Peta ===
        fetch(CSV_MAP_URL)
            .then(response => response.text())
            .then(csvText => {
                const rows = parseCSVMap(csvText).filter(r => r.length > 0);
                if (rows.length < 2) throw new Error('CSV kosong');

                const headers = rows[0].map(h => h.trim());
                const dataRows = rows.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((h, i) => obj[h] = row[i] ? row[i].trim() : '');
                    return obj;
                });

                // Hitung aduan per kabupaten untuk Peta
                aduanPerKabupaten = {};
                dataRows.forEach(row => {
                    const kab = row['DOMISILI'];
                    if (kab) {
                        aduanPerKabupaten[kab] = (aduanPerKabupaten[kab] || 0) + 1;
                    }
                });

                // Muat GeoJSON
                return fetch(GEOJSON_URL).then(r => r.json());
            })
            .then(geojsonData => {
                geojson = L.geoJSON(geojsonData, {
                    style: style,
                    onEachFeature: function (feature, layer) {
                        layer.on({
                            mouseover: highlightFeature,
                            mouseout: resetHighlight,
                            click: zoomToFeature
                        });
                    }
                }).addTo(map);
                
                // Sesuaikan zoom peta ke batas wilayah data
                map.fitBounds(geojson.getBounds());
            })
            .catch(error => {
                console.error('Error Map:', error);
                // Tidak alert agar tidak mengganggu dashboard jika geojson belum ada
                console.warn('Pastikan file Kalut.geojson tersedia untuk menampilkan peta choropleth.');
            });
    </script>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        
        // ==========================================================
        // 1. KONFIGURASI & INISIALISASI CHART
        // ==========================================================
        const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlo4EDlQMWwT52h7P3A2F-DjAPm4a2R1AnRXB6zHotRU-IOLxQ0j4f_XSrzPwg0abLmM36sO7X9vsA/pub?gid=0&single=true&output=csv";
        
        // --- Chart 1: Tren Waktu ---
        const ctxTren = document.getElementById('chart-tren').getContext('2d');
        let trenChart = new Chart(ctxTren, {
            type: 'line',
            data: { labels: [], datasets: [
                { label: 'Satpol PP', data: [], borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', tension: 0.3, fill: true },
                { label: 'Damkar', data: [], borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)', tension: 0.3, fill: true }
            ]},
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

        // --- Chart 2: Jenis Pelanggaran (Semua Data) ---
        const ctxPelanggaran = document.getElementById('chart-pelanggaran').getContext('2d');
        let pelanggaranChart = new Chart(ctxPelanggaran, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Jumlah Aduan', data: [], backgroundColor: '#ffc107' }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: true, 
                indexAxis: 'y', // Bar Horizontal
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        // --- Chart 3: Perda Teratas (Top 5) ---
        const ctxPerda = document.getElementById('chart-perda').getContext('2d');
        let perdaChart = new Chart(ctxPerda, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Jumlah Kasus', data: [], backgroundColor: '#198754' }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                indexAxis: 'y', // Bar Horizontal
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        // ==========================================================
        // 2. LOGIKA DATA & PARSING
        // ==========================================================
        let rawGlobalData = []; // Menyimpan semua data mentah dari CSV

        function parseCSV(text) {
            const rows = []; let currentRow = []; let currentCell = ''; let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) { currentRow.push(currentCell); currentCell = ''; }
                else if ((char === '\n' || char === '\r') && !inQuotes) { 
                    currentRow.push(currentCell); rows.push(currentRow); currentRow = []; currentCell = ''; 
                    if (char === '\r' && text[i+1] === '\n') i++; 
                } else currentCell += char;
            }
            if (currentCell || currentRow.length) { currentRow.push(currentCell); rows.push(currentRow); }
            return rows;
        }

        // ==========================================================
        // 3. LOGIKA FILTER & UPDATE CHART
        // ==========================================================
        
        // Fungsi Utama yang dipanggil saat filter berubah
        function updateAllCharts() {
            if (rawGlobalData.length === 0) return;

            // 1. Ambil Nilai Filter
            const selectedYear = parseInt(document.getElementById('filter-tahun').value);
            const selectedMonth = document.getElementById('filter-bulan').value;
            const selectedLayanan = document.getElementById('filter-layanan').value;

            // 2. Filter Data Mentah
            const filteredRows = rawGlobalData.filter(row => {
                // Filter Waktu
                const dateObj = new Date(row.date.replace(' ', 'T'));
                if (isNaN(dateObj.getTime())) return false;
                
                const matchYear = dateObj.getFullYear() === selectedYear;
                let matchMonth = true;
                if (selectedMonth !== 'all') {
                    matchMonth = dateObj.getMonth() === parseInt(selectedMonth);
                }

                // Filter Layanan
                let matchLayanan = true;
                if (selectedLayanan !== 'all') {
                    // Asumsi: 1=Satpol PP, 2=Damkar
                    const code = selectedLayanan === 'satpolpp' ? '1' : '2'; 
                    matchLayanan = row.layanan === code;
                }

                return matchYear && matchMonth && matchLayanan;
            });

            // 3. Update Masing-Masing Chart dengan Data Terfilter
            updateTrenChart(filteredRows, selectedYear, selectedMonth);
            updateBreakdownCharts(filteredRows);
        }

        // --- A. Update Chart Tren ---
        function updateTrenChart(rows, year, monthStr) {
            const isMonthlyView = (monthStr === 'all');
            let aggregated = {};
            let labels = [];

            // Siapkan label sumbu X
            if (isMonthlyView) {
                labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                for (let i = 0; i < 12; i++) aggregated[i] = { satpol: 0, damkar: 0 };
            } else {
                const daysInMonth = new Date(year, parseInt(monthStr) + 1, 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    labels.push(i.toString());
                    aggregated[i] = { satpol: 0, damkar: 0 };
                }
            }

            // Isi data
            rows.forEach(row => {
                const d = new Date(row.date.replace(' ', 'T'));
                const key = isMonthlyView ? d.getMonth() : d.getDate();
                
                if (aggregated[key]) {
                    if (row.layanan === '1') aggregated[key].satpol++;
                    else if (row.layanan === '2') aggregated[key].damkar++;
                }
            });

            trenChart.data.labels = labels;
            trenChart.data.datasets[0].data = Object.values(aggregated).map(d => d.satpol);
            trenChart.data.datasets[1].data = Object.values(aggregated).map(d => d.damkar);
            trenChart.update();
        }

        // --- B. Update Chart Breakdown (Pelanggaran & Perda) ---
        function updateBreakdownCharts(rows) {
            // -- Helper: Hitung Frekuensi (mengembalikan SEMUA data terurut) --
            function getFrequencyData(dataArray, columnKey) {
                let counts = {};
                dataArray.forEach(row => {
                    let val = row[columnKey];
                    if (!val) val = "Tidak Diketahui";
                    val = val.trim();
                    if (val === "" || val === "-") return; 
                    
                    counts[val] = (counts[val] || 0) + 1;
                });

                // Convert ke array dan sort (Descending)
                return Object.keys(counts).map(key => {
                    return { label: key, count: counts[key] };
                }).sort((a, b) => b.count - a.count); 
            }

            // 1. Chart Jenis Pelanggaran (Mengambil SEMUA data)
            const allPelanggaran = getFrequencyData(rows, 'klasifikasi');
            pelanggaranChart.data.labels = allPelanggaran.map(i => i.label);
            pelanggaranChart.data.datasets[0].data = allPelanggaran.map(i => i.count);
            pelanggaranChart.update();

            // 2. Chart Perda Teratas (Mengambil Top 5)
            // Asumsi: Kita menggunakan kolom 'klasifikasi' untuk demo. Ganti 'klasifikasi' jika Anda punya kolom 'PERDA' yang berbeda.
            const allPerda = getFrequencyData(rows, 'klasifikasi'); 
            const topPerda = allPerda.slice(0, 5); // Ambil hanya 5 teratas
            
            perdaChart.data.labels = topPerda.map(i => i.label);
            perdaChart.data.datasets[0].data = topPerda.map(i => i.count);
            perdaChart.update();
        }

        // ==========================================================
        // 4. FETCH DATA UTAMA
        // ==========================================================
        fetch(CSV_URL).then(r => r.text()).then(txt => {
            const rows = parseCSV(txt).filter(r => r.length > 1);
            const headers = rows[0].map(h => h.trim());
            
            // Mapping Kolom (Pastikan header CSV di kanan sesuai dengan sheet Anda)
            const idxDate = headers.indexOf('Waktu Laporan');
            const idxLayanan = headers.indexOf('layanan');
            const idxKlasifikasi = headers.indexOf('KLASIFIKASI');
            const idxDetail = headers.indexOf('DETAIL'); 

            rawGlobalData = rows.slice(1).map(row => ({
                date: row[idxDate],
                layanan: row[idxLayanan]?.trim(),
                klasifikasi: row[idxKlasifikasi], // Untuk Chart Pelanggaran
                detail: row[idxDetail],
            }));

            // Render Awal
            updateAllCharts();

        }).catch(err => console.error("Gagal load data:", err));

        // Event Listeners untuk filter
        document.getElementById('filter-tahun').addEventListener('change', updateAllCharts);
        document.getElementById('filter-bulan').addEventListener('change', updateAllCharts);
        document.getElementById('filter-layanan').addEventListener('change', updateAllCharts);
        
        // --- LOGIKA TABEL ---
        (function() {
            const CSV_URL_TABLE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlo4EDlQMWwT52h7P3A2F-DjAPm4a2R1AnRXB6zHotRU-IOLxQ0j4f_XSrzPwg0abLmM36sO7X9vsA/pub?gid=0&single=true&output=csv";
            let allData = [], filteredData = [], currentPage = 1, rowsPerPage = 10;
            
            // Perbaikan 2A: Inisialisasi Objek Bootstrap Modal
            const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));

            function parseCSV(text) { 
                const rows = []; let currentRow = []; let currentCell = ''; let inQuotes = false;
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { currentRow.push(currentCell); currentCell = ''; }
                    else if ((char === '\n' || char === '\r') && !inQuotes) { currentRow.push(currentCell); rows.push(currentRow); currentRow = []; currentCell = ''; if (char === '\r' && text[i+1] === '\n') i++; }  
                    else currentCell += char;
                }
                if (currentCell || currentRow.length) { currentRow.push(currentCell); rows.push(currentRow); }
                return rows;
            }

            function renderTable() {
                const start = (currentPage - 1) * rowsPerPage;
                const pageData = filteredData.slice(start, start + rowsPerPage);
                // Kolom yang ditampilkan di tabel ringkasan
                const cols = ["Tanggal", "Urusan", "Jenis Pelanggaran", "Detail Aduan", "Kabupaten/Kota", "Status"]; 
                
                let html = `<table class="table table-bordered table-hover"><thead><tr>`;
                cols.forEach(c => html += `<th>${c}</th>`);
                html += `</tr></thead><tbody>`;

                pageData.forEach((row, idx) => {
                    let statusClass = '';
                    const status = row['Status']?.toLowerCase();
                    if (status === 'selesai') statusClass = 'status-selesai';
                    else if (status === 'ditangani') statusClass = 'status-ditangani';
                    else if (status === 'confirmed') statusClass = 'status-confirmed';
                    
                    // Gunakan index global (start + idx) untuk memanggil modal
                    html += `<tr class="${statusClass}" style="cursor:pointer;" onclick="window.openModal(${start+idx})">`; 
                    cols.forEach(c => html += `<td>${row[c] || ''}</td>`);
                    html += `</tr>`;
                });
                html += `</tbody></table>`;
                document.getElementById('table-container').innerHTML = html;
                renderPagination();
            }

            function renderPagination() {
                const totalPages = Math.ceil(filteredData.length / rowsPerPage);
                let html = '';
                for(let i=1; i<=totalPages; i++) {
                    html += `<button class="btn btn-sm ${i===currentPage?'btn-primary':'btn-outline-secondary'} mx-1" onclick="window.changePage(${i})">${i}</button>`;
                }
                document.getElementById('pagination').innerHTML = html;
            }

            window.changePage = (p) => { currentPage = p; renderTable(); };
            
            // Perbaikan 2A: Menggunakan fungsi Bootstrap Modal
            window.openModal = (idx) => {
                const d = filteredData[idx];
                let html = '';
                
                // Isi konten modal body dengan detail
                for(let k in d) {
                    // Hanya tampilkan kolom yang relevan dan memiliki nilai
                    if (d[k] && d[k] !== 'undefined' && k !== 'Tanggal' && k !== 'Urusan' && k !== 'Jenis Pelanggaran' && k !== 'Detail Aduan' && k !== 'Kabupaten/Kota' && k !== 'Status') {
                         html += `<div class="modal-row"><span class="modal-label">${k}:</span> <span class="modal-value">${d[k]}</span></div>`;
                    }
                }
                
                // Tampilkan ringkasan di atas detail
                let ringkasan = `
                    <p class="fw-bold mb-1">${d['Jenis Pelanggaran']} - ${d['Kabupaten/Kota']}</p>
                    <p class="mb-3">${d['Detail Aduan']}</p>
                    <hr>
                    <h6 class="text-primary">Data Teknis:</h6>
                    ` + html;

                document.getElementById('modal-body').innerHTML = ringkasan;
                detailModal.show(); // Panggil modal menggunakan Bootstrap JS
            };

            // Fetch Table Data
            fetch(CSV_URL_TABLE).then(r => r.text()).then(txt => {
                const rows = parseCSV(txt).filter(r => r.length > 0);
                if(rows.length < 2) return;
                const headers = rows[0].map(h => h.trim());
                // Ambil domisili dari PHP
const userDomisili = "<?= $user_domisili ?>";

allData = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]?.trim());
    return {
        ...obj,
        "Tanggal": obj['Waktu Laporan'],
        "Urusan": obj['layanan'] == '1' ? 'Satpol' : (obj['layanan'] == '2' ? 'Damkar' : 'Lainnya'), 
        "Jenis Pelanggaran": obj['KLASIFIKASI'],
        "Detail Aduan": obj['DETAIL'],
        "Kabupaten/Kota": obj['DOMISILI'],
        "Status": obj['Status']
    };
}).filter(row => {
    // Hanya tampilkan data yang sesuai wilayah user
    return row['Kabupaten/Kota'] === userDomisili;
});
                filteredData = allData;
                renderTable();
            });

            // Search
            document.getElementById('searchInput').addEventListener('input', function(e) {
                const q = e.target.value.toLowerCase();
                filteredData = allData.filter(r => Object.values(r).some(v => v?.toString().toLowerCase().includes(q)));
                currentPage = 1;
                renderTable();
            });
            
            // Rows Per Page
            document.getElementById('rowsPerPage').addEventListener('change', function(e) {
                rowsPerPage = parseInt(e.target.value);
                currentPage = 1;
                renderTable();
            });
        })();

    });
</script>
  </body>
</html>