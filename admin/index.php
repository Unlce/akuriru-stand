<?php
/**
 * 管理画面 - 注文一覧
 * 
 * シンプルな注文管理システム
 * 基本的なパスワード認証付き
 */

// セッション開始
session_start();

// ============================================
// 重要: 本番環境では必ずパスワードを変更してください
// ============================================
// より安全な認証方法:
// 1. 環境変数からパスワードを読み込む: getenv('ADMIN_PASSWORD')
// 2. password_hash() と password_verify() を使用
// 3. データベースでユーザー管理
// 
// 推奨: このファイルを .htaccess または .htpasswd で保護
// ============================================
define('ADMIN_PASSWORD', 'admin123');  // 必ず変更してください！

// ログアウト処理
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit();
}

// ログイン処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if ($_POST['password'] === ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
        header('Location: index.php');
        exit();
    } else {
        $loginError = 'パスワードが正しくありません';
    }
}

// 認証チェック
$isLoggedIn = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;

// データベース接続
if ($isLoggedIn) {
    require_once __DIR__ . '/../api/config.php';
    
    try {
        $pdo = getDbConnection();
        
        // 注文一覧を取得（ページネーション対応）
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = 20;
        $offset = ($page - 1) * $perPage;
        
        // 総件数を取得
        $countStmt = $pdo->query('SELECT COUNT(*) as total FROM orders');
        $totalOrders = $countStmt->fetch()['total'];
        $totalPages = ceil($totalOrders / $perPage);
        
        // 注文データを取得
        $stmt = $pdo->prepare('
            SELECT 
                o.id,
                o.order_number,
                o.status,
                o.created_at,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                od.product_size,
                od.quantity,
                od.price,
                p.payment_status,
                p.amount as payment_amount
            FROM orders o
            INNER JOIN customers c ON o.customer_id = c.id
            INNER JOIN order_details od ON o.id = od.order_id
            LEFT JOIN payments p ON o.id = p.order_id
            ORDER BY o.created_at DESC
            LIMIT :limit OFFSET :offset
        ');
        
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $orders = $stmt->fetchAll();
        
    } catch (Exception $e) {
        $dbError = 'データベース接続エラー: ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理画面 - アクリルスタンド工房</title>
    <link rel="stylesheet" href="css/admin.css">
</head>
<body>
    <?php if (!$isLoggedIn): ?>
        <!-- ログイン画面 -->
        <div class="login-container">
            <h2>管理画面ログイン</h2>
            <?php if (isset($loginError)): ?>
                <div class="error"><?php echo htmlspecialchars($loginError); ?></div>
            <?php endif; ?>
            <form method="POST">
                <div class="form-group">
                    <label for="password">パスワード</label>
                    <input type="password" id="password" name="password" required autofocus>
                </div>
                <button type="submit" class="btn">ログイン</button>
            </form>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
                デフォルトパスワード: admin123<br>
                ※ 本番環境では必ず変更してください
            </p>
        </div>
    <?php else: ?>
        <!-- 管理画面 -->
        <div class="container">
            <div class="header">
                <h1>✨ アクリルスタンド工房 管理画面</h1>
                <a href="?logout=1" class="btn btn-secondary">ログアウト</a>
            </div>
            
            <?php if (isset($dbError)): ?>
                <div class="error"><?php echo htmlspecialchars($dbError); ?></div>
            <?php else: ?>
                <!-- 統計情報 -->
                <div class="stats">
                    <div class="stat-card">
                        <h3>総注文数</h3>
                        <div class="number" id="totalOrders"><?php echo number_format($totalOrders); ?></div>
                    </div>
                    <div class="stat-card">
                        <h3>現在のページ</h3>
                        <div class="number"><?php echo $page; ?> / <?php echo $totalPages; ?></div>
                    </div>
                </div>
                
                <!-- フィルター -->
                <div class="filters">
                    <div class="filter-group">
                        <label for="searchInput">🔍 検索</label>
                        <input type="text" id="searchInput" placeholder="注文番号、顧客名、メールアドレスで検索...">
                    </div>
                    <div class="filter-group">
                        <label for="statusFilter">ステータス</label>
                        <select id="statusFilter">
                            <option value="">すべて</option>
                            <option value="pending">新規</option>
                            <option value="processing">処理中</option>
                            <option value="completed">完了</option>
                            <option value="cancelled">キャンセル</option>
                        </select>
                    </div>
                </div>
                
                <!-- ローディング -->
                <div id="loading" class="loading">
                    <div class="spinner"></div>
                    <p style="margin-top: 10px;">読み込み中...</p>
                </div>
                
                <!-- 注文一覧テーブル -->
                <div class="table-container">
                    <table id="ordersTable">
                        <thead>
                            <tr>
                                <th>注文番号</th>
                                <th>日時</th>
                                <th>顧客名</th>
                                <th>商品画像</th>
                                <th>サイズ</th>
                                <th>台座</th>
                                <th>金額</th>
                                <th>ステータス</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Table rows will be loaded dynamically via JavaScript -->
                            <tr>
                                <td colspan="9" class="empty-state">
                                    <div class="empty-state-icon">⏳</div>
                                    <div class="empty-state-text">読み込み中...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- ページネーション -->
                    <?php if ($totalPages > 1): ?>
                        <div class="pagination">
                            <?php if ($page > 1): ?>
                                <a href="?page=<?php echo $page - 1; ?>">← 前へ</a>
                            <?php endif; ?>
                            
                            <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                <a href="?page=<?php echo $i; ?>" class="<?php echo $i === $page ? 'active' : ''; ?>">
                                    <?php echo $i; ?>
                                </a>
                            <?php endfor; ?>
                            
                            <?php if ($page < $totalPages): ?>
                                <a href="?page=<?php echo $page + 1; ?>">次へ →</a>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Order Detail Modal -->
        <div id="orderDetailModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📋 注文詳細</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div id="orderDetailContent">
                    <!-- Content will be loaded dynamically -->
                </div>
            </div>
        </div>
        
        <!-- JavaScript -->
        <script src="js/admin.js"></script>
    <?php endif; ?>
</body>
</html>
