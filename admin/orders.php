<?php
require_once __DIR__ . '/auth.php';
requireAdmin();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>注文管理 - アクリルスタンド工房</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <style>
        body { background: #f4f6f9; }
        .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
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
            <a href="/admin/index.php" class="navbar-brand mb-0 h1">
                <i class="bi bi-arrow-left me-2"></i>アクリルスタンド工房 管理画面
            </a>
            <a href="/admin/logout.php" class="btn btn-outline-light btn-sm">
                <i class="bi bi-box-arrow-right me-1"></i>ログアウト
            </a>
        </div>
    </nav>

    <div class="container-fluid py-4">
        <div class="row mb-4">
            <div class="col-12">
                <h2><i class="bi bi-list-ul me-2"></i>注文管理</h2>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <table id="ordersTable" class="table table-hover">
                            <thead>
                                <tr>
                                    <th>注文番号</th>
                                    <th>顧客名</th>
                                    <th>メール</th>
                                    <th>電話</th>
                                    <th>金額</th>
                                    <th>ステータス</th>
                                    <th>注文日</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script>
    $(document).ready(function() {
        $('#ordersTable').DataTable({
            ajax: {
                url: '/api/orders.php',
                dataSrc: 'orders'
            },
            columns: [
                { data: 'orderNumber' },
                { data: 'customer.name' },
                { data: 'customer.email' },
                { data: 'customer.phone' },
                {
                    data: 'pricing.total',
                    render: function(data) {
                        return '¥' + data.toLocaleString();
                    }
                },
                {
                    data: 'status',
                    render: function(data) {
                        return '<span class="status-badge status-' + data + '">' + data + '</span>';
                    }
                },
                {
                    data: 'createdAt',
                    render: function(data) {
                        if (data && data._seconds) {
                            const date = new Date(data._seconds * 1000);
                            return date.toLocaleString('ja-JP');
                        }
                        return '';
                    }
                },
                {
                    data: 'orderId',
                    render: function(data) {
                        return '<a href="/admin/order-details.php?id=' + data + '" class="btn btn-sm btn-primary"><i class="bi bi-eye"></i> 詳細</a>';
                    }
                }
            ],
            order: [[6, 'desc']],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/ja.json'
            }
        });
    });
    </script>
</body>
</html>
