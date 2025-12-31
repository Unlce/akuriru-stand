# アクリルスタンド工房 - 注文管理システム実装ガイド
# Order Management System Implementation Guide

## 🚀 実装開始

### 使用技術栈
- **数据库**: Cloud Firestore (NoSQL, serverless)
- **后端**: PHP 8.1 + Firestore SDK
- **前端**: Bootstrap 5 + DataTables.js
- **认证**: Session-based admin auth

---

## 📋 第1步: 启用 Firestore (5分钟)

### 在 Cloud Shell 中运行:

```bash
# 确保在项目目录
cd ~/akuriru-stand

# 设置项目
gcloud config set project acrylicstand

# 启用 Firestore API
gcloud services enable firestore.googleapis.com

# 创建 Firestore 数据库 (选择 Native mode)
gcloud firestore databases create --location=asia-northeast1

# 确认创建成功
gcloud firestore databases list
```

预期输出:
```
NAME: (default)
LOCATION: asia-northeast1
TYPE: FIRESTORE_NATIVE
```

---

## 📋 第2步: 安装 Firestore PHP SDK (2分钟)

### 创建 composer.json

```bash
cat > composer.json <<'EOF'
{
    "require": {
        "google/cloud-firestore": "^1.38",
        "google/auth": "^1.28"
    }
}
EOF
```

### 安装依赖

```bash
composer install --no-dev --optimize-autoloader
```

---

## 📋 第3步: 创建数据库配置文件

创建 `config/firestore.php`:

```php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;

function getFirestoreClient() {
    static $firestore = null;

    if ($firestore === null) {
        $firestore = new FirestoreClient([
            'projectId' => 'acrylicstand',
        ]);
    }

    return $firestore;
}

function generateOrderId() {
    return 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
}

function generateOrderNumber() {
    return date('Ymd') . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
}
?>
```

---

## 📋 第4步: 创建订单 API

创建 `api/orders.php`:

```php
<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/firestore.php';

$method = $_SERVER['REQUEST_METHOD'];
$firestore = getFirestoreClient();

try {
    switch ($method) {
        case 'POST':
            // 创建新订单
            $data = json_decode(file_get_contents('php://input'), true);

            $orderId = generateOrderId();
            $orderNumber = generateOrderNumber();

            $orderData = [
                'orderId' => $orderId,
                'orderNumber' => $orderNumber,
                'customer' => [
                    'name' => $data['customer']['name'] ?? '',
                    'email' => $data['customer']['email'] ?? '',
                    'phone' => $data['customer']['phone'] ?? '',
                    'zipCode' => $data['customer']['zipCode'] ?? '',
                    'address' => $data['customer']['address'] ?? '',
                ],
                'product' => [
                    'type' => 'acrylic-stand',
                    'size' => $data['product']['size'] ?? '120x150mm',
                    'baseShape' => $data['product']['baseShape'] ?? 'circle',
                    'baseColor' => $data['product']['baseColor'] ?? '#FFB6C1',
                    'imageUrl' => $data['product']['imageUrl'] ?? '',
                ],
                'pricing' => [
                    'quantity' => intval($data['pricing']['quantity'] ?? 1),
                    'unitPrice' => 1500,
                    'subtotal' => 1500 * intval($data['pricing']['quantity'] ?? 1),
                    'shipping' => 500,
                    'tax' => 200,
                    'total' => 2200,
                    'currency' => 'JPY',
                ],
                'status' => 'pending',
                'paymentStatus' => 'pending',
                'createdAt' => new \Google\Cloud\Core\Timestamp(new \DateTime()),
                'updatedAt' => new \Google\Cloud\Core\Timestamp(new \DateTime()),
            ];

            $docRef = $firestore->collection('orders')->document($orderId);
            $docRef->set($orderData);

            echo json_encode([
                'success' => true,
                'orderId' => $orderId,
                'orderNumber' => $orderNumber,
                'message' => '注文が正常に作成されました'
            ]);
            break;

        case 'GET':
            if (isset($_GET['id'])) {
                // 获取单个订单
                $orderId = $_GET['id'];
                $docRef = $firestore->collection('orders')->document($orderId);
                $snapshot = $docRef->snapshot();

                if ($snapshot->exists()) {
                    echo json_encode([
                        'success' => true,
                        'order' => $snapshot->data()
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => '注文が見つかりません'
                    ]);
                }
            } else {
                // 获取所有订单
                $ordersRef = $firestore->collection('orders');
                $query = $ordersRef->orderBy('createdAt', 'DESC');

                if (isset($_GET['status'])) {
                    $query = $query->where('status', '=', $_GET['status']);
                }

                if (isset($_GET['limit'])) {
                    $query = $query->limit(intval($_GET['limit']));
                }

                $documents = $query->documents();
                $orders = [];

                foreach ($documents as $document) {
                    if ($document->exists()) {
                        $orders[] = $document->data();
                    }
                }

                echo json_encode([
                    'success' => true,
                    'count' => count($orders),
                    'orders' => $orders
                ]);
            }
            break;

        case 'PUT':
            // 更新订单
            $data = json_decode(file_get_contents('php://input'), true);
            $orderId = $_GET['id'] ?? null;

            if (!$orderId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Order ID required']);
                exit;
            }

            $docRef = $firestore->collection('orders')->document($orderId);
            $snapshot = $docRef->snapshot();

            if (!$snapshot->exists()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Order not found']);
                exit;
            }

            $updateData = [
                ['path' => 'updatedAt', 'value' => new \Google\Cloud\Core\Timestamp(new \DateTime())]
            ];

            if (isset($data['status'])) {
                $updateData[] = ['path' => 'status', 'value' => $data['status']];
            }

            if (isset($data['paymentStatus'])) {
                $updateData[] = ['path' => 'paymentStatus', 'value' => $data['paymentStatus']];
            }

            if (isset($data['trackingNumber'])) {
                $updateData[] = ['path' => 'trackingNumber', 'value' => $data['trackingNumber']];
            }

            if (isset($data['adminNotes'])) {
                $updateData[] = ['path' => 'adminNotes', 'value' => $data['adminNotes']];
            }

            $docRef->update($updateData);

            echo json_encode([
                'success' => true,
                'message' => '注文が更新されました'
            ]);
            break;

        case 'DELETE':
            // 删除订单
            $orderId = $_GET['id'] ?? null;

            if (!$orderId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Order ID required']);
                exit;
            }

            $firestore->collection('orders')->document($orderId)->delete();

            echo json_encode([
                'success' => true,
                'message' => '注文が削除されました'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'エラーが発生しました',
        'error' => $e->getMessage()
    ]);
}
?>
```

---

## 📋 第5步: 创建管理员认证

创建 `admin/auth.php`:

```php
<?php
session_start();

// 简单的管理员认证（生产环境应该使用数据库+bcrypt）
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD_HASH', password_hash('admin123', PASSWORD_BCRYPT));

function isAdminLoggedIn() {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

function requireAdmin() {
    if (!isAdminLoggedIn()) {
        header('Location: /admin/login.php');
        exit;
    }
}

function adminLogin($username, $password) {
    if ($username === ADMIN_USERNAME && password_verify($password, ADMIN_PASSWORD_HASH)) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = $username;
        return true;
    }
    return false;
}

function adminLogout() {
    session_destroy();
}
?>
```

---

## 📋 第6步: 创建管理员登录页面

创建 `admin/login.php`:

```php
<?php
require_once __DIR__ . '/auth.php';

if (isAdminLoggedIn()) {
    header('Location: /admin/index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (adminLogin($username, $password)) {
        header('Location: /admin/index.php');
        exit;
    } else {
        $error = 'ユーザー名またはパスワードが正しくありません';
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理者ログイン - アクリルスタンド工房</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-card {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <h2 class="text-center mb-4">🔐 管理者ログイン</h2>

        <?php if ($error): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST">
            <div class="mb-3">
                <label class="form-label">ユーザー名</label>
                <input type="text" name="username" class="form-control" required>
            </div>

            <div class="mb-3">
                <label class="form-label">パスワード</label>
                <input type="password" name="password" class="form-control" required>
            </div>

            <button type="submit" class="btn btn-primary w-100">ログイン</button>
        </form>

        <div class="mt-3 text-center text-muted small">
            デフォルト: admin / admin123
        </div>
    </div>
</body>
</html>
```

---

## 下一步

这是基础架构。接下来我会创建:
1. 管理员仪表盘
2. 订单列表页面
3. 订单详情页面
4. 统计图表

准备继续吗？
