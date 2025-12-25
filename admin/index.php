<?php
session_start();
define('ADMIN_PASSWORD', 'admin123');

if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if ($_POST['password'] === ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
        header('Location: index.php');
        exit();
    } else {
        $loginError = 'Wrong password';
    }
}

$isLoggedIn = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel</title>
    <link rel="stylesheet" href="css/admin.css">
</head>
<body>
<?php if (!$isLoggedIn): ?>
    <div class="login-container">
        <h2>Admin Login</h2>
        <?php if (isset($loginError)): ?>
            <div class="error"><?php echo $loginError; ?></div>
        <?php endif; ?>
        <form method="POST">
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autofocus>
            </div>
            <button type="submit" class="btn">Login</button>
        </form>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Default: admin123</p>
    </div>
<?php else: ?>
    <div class="container">
        <div class="header">
            <h1>Admin Panel</h1>
            <a href="?logout=1" class="btn btn-secondary">Logout</a>
        </div>
        
        <div id="loading" style="display:none;">Loading...</div>
        
        <div class="table-container">
            <table id="ordersTable">
                <thead>
                    <tr>
                        <th>Order Number</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Size</th>
                        <th>Price</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="ordersBody">
                    <tr><td colspan="6">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <script src="js/admin.js"></script>
<?php endif; ?>
</body>
</html>
