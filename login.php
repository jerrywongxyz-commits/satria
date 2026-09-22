<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Halaman Login</title>
</head>
<body>
    <h2>Form Login Sederhana</h2>
    
    <?php 
        // Cek jika ada parameter 'error' dari URL (setelah gagal login)
        if (isset($_GET['error']) && $_GET['error'] == 1) {
            echo '<p style="color: red;">Username atau Password salah!</p>';
        }
    ?>

    <form action="login_process.php" method="POST">
        <label for="username">Username:</label><br>
        <input type="text" id="username" name="username" required><br><br>

        <label for="password">Password:</label><br>
        <input type="password" id="password" name="password" required><br><br>

        <button type="submit">Login</button>
    </form>
</body>
</html>