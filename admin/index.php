<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/../config/firestore.php';

requireAdmin();

$firestore = getFirestoreClient();

// Get statistics
$ordersRef = $firestore->collection('orders');
$allOrders = $ordersRef->documents();

$stats = [
    'total' => 0,
    'pending' => 0,
    'confirmed' => 0,
    'processing' => 0,
    'shipped' => 0,
    'delivered' => 0,
    'totalRevenue' => 0,
    'todayOrders' => 0,
];

$today = date('Y-m-d');

foreach ($allOrders as $doc) {
    if ($doc->exists()) {
        $order = $doc->data();
        $stats['total']++;
        
        $status = $order['status'] ?? 'pending';
        if (isset($stats[$status])) {
            $stats[$status]++;
        }
        
        if (isset($order['pricing']['total'])) {
            $stats['totalRevenue'] += $order['pricing']['total'];
        }
        
        if (isset($order['createdAt'])) {
            $createdDate = formatTimestamp($order['createdAt']);
            if (strpos($createdDate, $today) === 0) {
                $stats['todayOrders']++;
            }
        }
    }
}

// Get recent orders
$recentOrders = $ordersRef->orderBy('createdAt', 'DESC')->limit(10)->documents();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ダッシュボード - アクリルスタンド工房</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body { background: #f4f6f9; }
        .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-card {
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            border: none;
            box-shadow: 0 5px 20px rgba(0,0,0,0.08);
            transition: transform 0.3s;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-card .icon {
            font-size: 2.5rem;
            opacity: 0.8;
        }
        .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
            margin: 10px 0;
        }
        .stat-card.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .stat-card.success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
        .stat-card.warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .stat-card.info { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .status-pending { background: #ffc107; color: #000; }
        .status-confirmed { background: #17a2b8; color: #fff; }
        .status-processing { background: #6f42c1; color: #fff; }
        .status-shipped { background: #007bff; color: #fff; }
        .status-delivered { background: #28a745; color: #fff; }
    </style>
</head>
<body>
    <nav class="navbar navbar-dark">
        <div class="container-fluid">
            <span class="navbar-brand mb-0 h1">
                <i class="bi bi-grid-fill me-2"></i>アクリルスタンド工房 管理画面
            </span>
            <div>
                <span class="text-white me-3">
                    <i class="bi bi-person-circle me-1"></i><?= $_SESSION['admin_username'] ?>
                </span>
                <a href="/admin/logout.php" class="btn btn-outline-light btn-sm">
                    <i class="bi bi-box-arrow-right me-1"></i>ログアウト
                </a>
            </div>
        </div>
    </nav>

    <div class="container-fluid py-4">
        <div class="row mb-4">
            <div class="col-12">
                <h2><i class="bi bi-speedometer2 me-2"></i>ダッシュボード</h2>
            </div>
        </div>

        <div class="row">
            <div class="col-md-3">
                <div class="stat-card primary">
                    <i class="bi bi-cart-check icon"></i>
                    <div class="value"><?= $stats['todayOrders'] ?></div>
                    <div>今日の注文</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card success">
                    <i class="bi bi-hourglass-split icon"></i>
                    <div class="value"><?= $stats['pending'] ?></div>
                    <div>処理待ち</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card warning">
                    <i class="bi bi-box-seam icon"></i>
                    <div class="value"><?= $stats['total'] ?></div>
                    <div>総注文数</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card info">
                    <i class="bi bi-currency-yen icon"></i>
                    <div class="value">¥<?= number_format($stats['totalRevenue']) ?></div>
                    <div>総売上</div>
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <div class="col-12">
                <div class="card shadow-sm">
                    <div class="card-header bg-white">
                        <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>最近の注文</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-3">
                            <div></div>
                            <a href="/admin/orders.php" class="btn btn-primary">
                                <i class="bi bi-folder2-open me-1"></i>すべての注文を見る
                            </a>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>注文番号</th>
                                        <th>顧客名</th>
                                        <th>金額</th>
                                        <th>ステータス</th>
                                        <th>注文日</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($recentOrders as $doc): ?>
                                        <?php if ($doc->exists()): $order = $doc->data(); ?>
                                        <tr>
                                            <td><strong><?= htmlspecialchars($order['orderNumber'] ?? '') ?></strong></td>
                                            <td><?= htmlspecialchars($order['customer']['name'] ?? '') ?></td>
                                            <td>¥<?= number_format($order['pricing']['total'] ?? 0) ?></td>
                                            <td><span class="status-badge status-<?= $order['status'] ?? 'pending' ?>"><?= $order['status'] ?? 'pending' ?></span></td>
                                            <td><?= formatTimestamp($order['createdAt'] ?? null) ?></td>
                                            <td>
                                                <a href="/admin/order-details.php?id=<?= $order['orderId'] ?>" class="btn btn-sm btn-outline-primary">
                                                    <i class="bi bi-eye"></i>
                                                </a>
                                            </td>
                                        </tr>
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
