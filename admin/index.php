<?php
/**
 * Admin Panel
 *
 * SECURITY: Set ADMIN_PASSWORD environment variable in production
 * Example: ADMIN_PASSWORD=your_secure_password_here
 *
 * For production use, consider implementing:
 * - Database-backed user accounts
 * - Password hashing (password_hash/password_verify)
 * - Session timeout
 * - 2FA authentication
 */

session_start();

// Set session timeout (30 minutes of inactivity)
$sessionTimeout = 1800; // 30 minutes
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $sessionTimeout)) {
    session_unset();
    session_destroy();
    header('Location: index.php');
    exit();
}
$_SESSION['last_activity'] = time();

// Get admin password from environment variable
// IMPORTANT: Change this in production via environment variable
$adminPassword = getenv('ADMIN_PASSWORD');

if (empty($adminPassword)) {
    // Development fallback - MUST change in production
    $adminPassword = 'AkuriruStand2025!@#CHANGE_ME';

    // Warning in development
    if (getenv('APP_ENV') !== 'production') {
        error_log('WARNING: Using default admin password. Set ADMIN_PASSWORD environment variable!');
    }
}

define('ADMIN_PASSWORD', $adminPassword);

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
        <?php if (getenv('APP_ENV') !== 'production'): ?>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
                Development mode: Check environment variables or server logs for default password
            </p>
        <?php endif; ?>
    </div>
<?php else: ?>
    <div class="container">
        <div class="header">
            <h1>🎨 アクリルスタンド工房 - 管理画面</h1>
            <a href="?logout=1" class="btn btn-secondary">Logout</a>
        </div>

        <!-- 統計ダッシュボード -->
        <div class="dashboard">
            <div class="stat-card">
                <h3>📊 総注文数</h3>
                <div class="stat-value" id="totalOrders">0</div>
            </div>
            <div class="stat-card">
                <h3>💰 総売上</h3>
                <div class="stat-value" id="totalRevenue">¥0</div>
            </div>
            <div class="stat-card">
                <h3>📦 処理中</h3>
                <div class="stat-value" id="pendingOrders">0</div>
            </div>
            <div class="stat-card">
                <h3>✅ 完了</h3>
                <div class="stat-value" id="completedOrders">0</div>
            </div>
        </div>
        
        <!-- フィルター・検索 -->
        <div class="filters">
            <div class="filter-group">
                <label>📅 期間</label>
                <input type="date" id="dateFrom" class="filter-input">
                <span>～</span>
                <input type="date" id="dateTo" class="filter-input">
            </div>
            <div class="filter-group">
                <label>🔍 検索</label>
                <input type="text" id="searchInput" placeholder="注文番号、顧客名、メール" class="filter-input">
            </div>
            <div class="filter-group">
                <label>📋 ステータス</label>
                <select id="statusFilter" class="filter-input">
                    <option value="">すべて</option>
                    <option value="pending">新規</option>
                    <option value="paid">決済確認済</option>
                    <option value="processing">処理中</option>
                    <option value="shipped">発送済</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">キャンセル</option>
                </select>
            </div>
            <button id="exportCsvBtn" class="btn btn-primary">📥 CSV出力</button>
        </div>
        
        <div id="loading" style="display:none;">Loading...</div>
        
        <div class="table-container">
            <table id="ordersTable">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="selectAll"></th>
                        <th>注文番号</th>
                        <th>日時</th>
                        <th>顧客情報</th>
                        <th>画像</th>
                        <th>サイズ</th>
                        <th>数量</th>
                        <th>金額</th>
                        <th>ステータス</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="ordersBody">
                    <tr><td colspan="10">Loading...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- 一括操作 -->
        <div class="bulk-actions">
            <label>選択した注文を:</label>
            <select id="bulkAction" class="filter-input">
                <option value="">選択してください</option>
                <option value="paid">決済確認済にする</option>
                <option value="processing">処理中にする</option>
                <option value="shipped">発送済にする</option>
                <option value="completed">完了にする</option>
            </select>
            <button id="bulkApplyBtn" class="btn btn-primary">適用</button>
        </div>
    </div>

    <!-- 画像プレビューモーダル -->
    <div id="imageModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <img id="modalImage" src="" alt="Preview">
        </div>
    </div>

    <script src="js/admin.js"></script>
<?php endif; ?>
</body>
</html>
