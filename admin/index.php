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
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: #fff;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            color: #6B46C1;
            font-size: 24px;
        }
        
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            background: #fff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .login-container h2 {
            margin-bottom: 20px;
            color: #6B46C1;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .btn {
            background: #6B46C1;
            color: #fff;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #5a3aa0;
        }
        
        .btn-secondary {
            background: #666;
        }
        
        .btn-secondary:hover {
            background: #555;
        }
        
        .error {
            background: #fee;
            color: #c33;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-card h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .stat-card .number {
            font-size: 32px;
            font-weight: bold;
            color: #6B46C1;
        }
        
        .table-container {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background: #f9f9f9;
            font-weight: 600;
            color: #333;
        }
        
        tr:hover {
            background: #f9f9f9;
        }
        
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-processing {
            background: #cce5ff;
            color: #004085;
        }
        
        .status-completed {
            background: #d4edda;
            color: #155724;
        }
        
        .status-cancelled {
            background: #f8d7da;
            color: #721c24;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
            padding: 20px;
        }
        
        .pagination a {
            padding: 8px 12px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-decoration: none;
            color: #333;
        }
        
        .pagination a.active {
            background: #6B46C1;
            color: #fff;
            border-color: #6B46C1;
        }
        
        .pagination a:hover:not(.active) {
            background: #f5f5f5;
        }
    </style>
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
                        <div class="number"><?php echo number_format($totalOrders); ?></div>
                    </div>
                    <div class="stat-card">
                        <h3>現在のページ</h3>
                        <div class="number"><?php echo $page; ?> / <?php echo $totalPages; ?></div>
                    </div>
                </div>
                
                <!-- 注文一覧テーブル -->
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>注文番号</th>
                                <th>顧客名</th>
                                <th>メール</th>
                                <th>電話番号</th>
                                <th>サイズ</th>
                                <th>数量</th>
                                <th>金額</th>
                                <th>注文状態</th>
                                <th>支払い状態</th>
                                <th>注文日時</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($orders)): ?>
                                <tr>
                                    <td colspan="10" style="text-align: center; padding: 40px;">
                                        まだ注文がありません
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($orders as $order): ?>
                                    <?php
                                    $sizeNames = [
                                        'card' => 'カード',
                                        'postcard' => 'はがき',
                                        'a5' => 'A5',
                                        'a4' => 'A4'
                                    ];
                                    ?>
                                    <tr>
                                        <td><strong><?php echo htmlspecialchars($order['order_number']); ?></strong></td>
                                        <td><?php echo htmlspecialchars($order['customer_name']); ?></td>
                                        <td><?php echo htmlspecialchars($order['customer_email']); ?></td>
                                        <td><?php echo htmlspecialchars($order['customer_phone']); ?></td>
                                        <td><?php echo $sizeNames[$order['product_size']] ?? $order['product_size']; ?></td>
                                        <td><?php echo number_format($order['quantity']); ?>個</td>
                                        <td>¥<?php echo number_format($order['payment_amount']); ?></td>
                                        <td>
                                            <span class="status status-<?php echo $order['status']; ?>">
                                                <?php
                                                $statusNames = [
                                                    'pending' => '保留中',
                                                    'processing' => '処理中',
                                                    'completed' => '完了',
                                                    'cancelled' => 'キャンセル'
                                                ];
                                                echo $statusNames[$order['status']] ?? $order['status'];
                                                ?>
                                            </span>
                                        </td>
                                        <td>
                                            <span class="status status-<?php echo $order['payment_status']; ?>">
                                                <?php
                                                $paymentStatusNames = [
                                                    'pending' => '未払い',
                                                    'completed' => '支払済',
                                                    'failed' => '失敗',
                                                    'refunded' => '返金済'
                                                ];
                                                echo $paymentStatusNames[$order['payment_status']] ?? $order['payment_status'];
                                                ?>
                                            </span>
                                        </td>
                                        <td><?php echo date('Y/m/d H:i', strtotime($order['created_at'])); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
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
    <?php endif; ?>
</body>
</html>
