<?php
/**
 * Orders API - UUID対応版
 * 
 * 注文の作成と状態確認を行うAPIエンドポイント
 */

require_once __DIR__ . '/config.php';

// リクエストメソッドによる処理の分岐
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'POST':
            createOrder();
            break;
        case 'GET':
            getOrderStatus();
            break;
        default:
            sendErrorResponse('サポートされていないメソッドです', 405);
    }
} catch (Exception $e) {
    error_log('Order API Error: ' . $e->getMessage());
    sendErrorResponse('注文処理中にエラーが発生しました: ' . $e->getMessage(), 500);
}

/**
 * UUID v4 を生成
 */
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * 注文を作成する (POST)
 */
function createOrder() {
    // リクエストボディからJSONデータを取得
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        sendErrorResponse('無効なJSONデータです');
    }
    
    // 必須フィールドの検証
    $requiredFields = ['customer', 'order_details', 'analytics'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            sendErrorResponse("必須フィールドが不足しています: {$field}");
        }
    }
    
    // 顧客情報の検証
    $customerFields = ['name', 'email', 'phone', 'address'];
    foreach ($customerFields as $field) {
        if (!isset($data['customer'][$field]) || empty($data['customer'][$field])) {
            sendErrorResponse("顧客情報が不足しています: {$field}");
        }
    }
    
    // メールアドレスの検証
    if (!filter_var($data['customer']['email'], FILTER_VALIDATE_EMAIL)) {
        sendErrorResponse('無効なメールアドレスです');
    }
    
    // データベース接続
    $pdo = getDbConnection();
    
    // トランザクション開始
    $pdo->beginTransaction();
    
    try {
        // UUIDを生成
        $customerId = generateUUID();
        $orderId = generateUUID();
        $orderDetailsId = generateUUID();
        $paymentId = generateUUID();
        $analyticsId = generateUUID();
        
        // 注文番号を生成
        $orderNumber = generateOrderNumber($pdo);
        
        // 1. 顧客情報を保存
        $stmt = $pdo->prepare('
            INSERT INTO customers (id, name, email, phone, address, created_at)
            VALUES (:id, :name, :email, :phone, :address, NOW())
        ');
        $stmt->execute([
            'id' => $customerId,
            'name' => sanitizeInput($data['customer']['name']),
            'email' => sanitizeInput($data['customer']['email']),
            'phone' => sanitizeInput($data['customer']['phone']),
            'address' => sanitizeInput($data['customer']['address'])
        ]);
        
        // 2. 注文を作成
        $stmt = $pdo->prepare('
            INSERT INTO orders (id, order_number, customer_id, status, created_at, updated_at)
            VALUES (:id, :order_number, :customer_id, :status, NOW(), NOW())
        ');
        $stmt->execute([
            'id' => $orderId,
            'order_number' => $orderNumber,
            'customer_id' => $customerId,
            'status' => 'pending'
        ]);
        
        // 3. 注文詳細を保存
        $quantity = (int)$data['order_details']['quantity'];
        $unitPrice = (float)$data['order_details']['price'];
        $totalPrice = $quantity * $unitPrice;
        
        $stmt = $pdo->prepare('
            INSERT INTO order_details (
                id, order_id, customer_id, product_size, base_design, 
                quantity, price, unit_price, total_price,
                image_path, image_data, image_rotation, image_scale
            ) VALUES (
                :id, :order_id, :customer_id, :product_size, :base_design,
                :quantity, :price, :unit_price, :total_price,
                :image_path, :image_data, :image_rotation, :image_scale
            )
        ');
        $stmt->execute([
            'id' => $orderDetailsId,
            'order_id' => $orderId,
            'customer_id' => $customerId,
            'product_size' => sanitizeInput($data['order_details']['product_size']),
            'base_design' => sanitizeInput($data['order_details']['base_design'] ?? 'default'),
            'quantity' => $quantity,
            'price' => $unitPrice,
            'unit_price' => $unitPrice,
            'total_price' => $totalPrice,
            'image_path' => isset($data['order_details']['image_path']) ? sanitizeInput($data['order_details']['image_path']) : null,
            'image_data' => isset($data['order_details']['image_data']) ? $data['order_details']['image_data'] : null,
            'image_rotation' => isset($data['order_details']['image_rotation']) ? (int)$data['order_details']['image_rotation'] : 0,
            'image_scale' => isset($data['order_details']['image_scale']) ? (int)$data['order_details']['image_scale'] : 100
        ]);
        
        // 4. 支払い情報を保存
        $paymentData = isset($data['payment']) ? $data['payment'] : [
            'payment_status' => 'pending',
            'amount' => $totalPrice
        ];
        
        $stmt = $pdo->prepare('
            INSERT INTO payments (id, order_id, payment_method, payment_status, transaction_id, amount, created_at)
            VALUES (:id, :order_id, :payment_method, :payment_status, :transaction_id, :amount, NOW())
        ');
        $stmt->execute([
            'id' => $paymentId,
            'order_id' => $orderId,
            'payment_method' => $paymentData['payment_method'] ?? 'PayPay',
            'payment_status' => sanitizeInput($paymentData['payment_status'] ?? 'pending'),
            'transaction_id' => isset($paymentData['transaction_id']) ? sanitizeInput($paymentData['transaction_id']) : null,
            'amount' => (float)($paymentData['amount'] ?? $totalPrice)
        ]);
        
        // 5. 分析データを保存
        $stmt = $pdo->prepare('
            INSERT INTO order_analytics (
                id, order_id, device_type, browser, session_duration, 
                referrer, pages_viewed, created_at
            ) VALUES (
                :id, :order_id, :device_type, :browser, :session_duration,
                :referrer, :pages_viewed, NOW()
            )
        ');
        $stmt->execute([
            'id' => $analyticsId,
            'order_id' => $orderId,
            'device_type' => isset($data['analytics']['device_type']) ? sanitizeInput($data['analytics']['device_type']) : null,
            'browser' => isset($data['analytics']['browser']) ? substr(sanitizeInput($data['analytics']['browser']), 0, 255) : null,
            'session_duration' => isset($data['analytics']['session_duration']) ? (int)$data['analytics']['session_duration'] : null,
            'referrer' => isset($data['analytics']['referrer']) ? substr(sanitizeInput($data['analytics']['referrer']), 0, 500) : null,
            'pages_viewed' => isset($data['analytics']['pages_viewed']) ? (int)$data['analytics']['pages_viewed'] : null
        ]);
        
        // トランザクションをコミット
        $pdo->commit();
        
        // メール通知（失敗しても注文処理は継続）
        $emailStatus = [
            'customer_email_sent' => false,
            'admin_email_sent' => false
        ];

        try {
            $emailStatus = sendOrderEmails($data, $orderNumber, $totalPrice);
        } catch (Throwable $e) {
            error_log('Order email send failed: ' . $e->getMessage());
        }

        // 成功レスポンスを返す
        sendJsonResponse([
            'success' => true,
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'message' => '注文が正常に作成されました',
            'email_notifications' => $emailStatus
        ], 201);
        
    } catch (Exception $e) {
        // エラーが発生した場合はロールバック
        $pdo->rollBack();
        error_log('Order creation failed: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * 注文状態を取得する (GET)
 */
function getOrderStatus() {
    $orderNumber = isset($_GET['order_number']) ? sanitizeInput($_GET['order_number']) : null;
    
    $pdo = getDbConnection();
    
    // 単一注文の取得
    if ($orderNumber) {
        $stmt = $pdo->prepare('
            SELECT 
                o.id,
                o.order_number,
                o.status,
                o.created_at,
                o.updated_at,
                c.name as customer_name,
                c.email as customer_email,
                od.product_size,
                od.quantity,
                od.unit_price as price,
                od.total_price,
                p.payment_status,
                p.amount as payment_amount
            FROM orders o
            INNER JOIN customers c ON o.customer_id = c.id
            INNER JOIN order_details od ON o.id = od.order_id
            LEFT JOIN payments p ON o.id = p.order_id
            WHERE o.order_number = :order_number
        ');
        
        $stmt->execute(['order_number' => $orderNumber]);
        $order = $stmt->fetch();
        
        if (!$order) {
            sendErrorResponse('注文が見つかりません', 404);
        }
        
        sendJsonResponse([
            'success' => true,
            'order' => $order
        ]);
    }
    
    // 全注文一覧の取得（管理者向け）
    $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    $whereClause = '';
    $params = [];
    
    if ($status && in_array($status, ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'])) {
        $whereClause = 'WHERE o.status = :status';
        $params['status'] = $status;
    }
    
    $sql = "
        SELECT
            o.id,
            o.order_number,
            o.status,
            o.created_at,
            o.updated_at,
            c.name as customer_name,
            c.email as customer_email,
            c.phone as customer_phone,
            od.product_size as size,
            od.base_design as base_type,
            od.quantity,
            od.unit_price as price,
            od.total_price,
            od.image_path,
            p.payment_status,
            p.amount as payment_amount
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        INNER JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.id = p.order_id
        {$whereClause}
        ORDER BY o.created_at DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(":{$key}", $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $orders = $stmt->fetchAll();
    
    // 総件数を取得
    $countSql = "SELECT COUNT(*) as total FROM orders o {$whereClause}";
    $countStmt = $pdo->prepare($countSql);
    foreach ($params as $key => $value) {
        $countStmt->bindValue(":{$key}", $value);
    }
    $countStmt->execute();
    $total = $countStmt->fetch()['total'];
    
    sendJsonResponse([
        'success' => true,
        'orders' => $orders,
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

/**
 * 注文番号を生成 (AS-YYYYMMDD-XXXX形式)
 */
function generateOrderNumber($pdo) {
    $date = date('Ymd');
    $prefix = "AS-{$date}-";
    
    $stmt = $pdo->prepare('
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE DATE(created_at) = CURDATE()
    ');
    $stmt->execute();
    $result = $stmt->fetch();
    $count = $result['count'] + 1;
    
    $sequence = str_pad($count, 4, '0', STR_PAD_LEFT);
    
    return $prefix . $sequence;
}

    // 注文メールを顧客と管理者に送信
    function sendOrderEmails($data, $orderNumber, $totalPrice) {
        $customerEmail = $data['customer']['email'] ?? '';
        $adminEmail = defined('SHOP_ADMIN_EMAIL') ? SHOP_ADMIN_EMAIL : '';
        $fromEmail = defined('SHOP_FROM_EMAIL') ? SHOP_FROM_EMAIL : '';

        $customerEmail = filter_var($customerEmail, FILTER_VALIDATE_EMAIL) ? $customerEmail : '';
        $adminEmail = filter_var($adminEmail, FILTER_VALIDATE_EMAIL) ? $adminEmail : '';
        $fromEmail = filter_var($fromEmail, FILTER_VALIDATE_EMAIL) ? $fromEmail : ($adminEmail ?: $customerEmail);

        if (!$customerEmail && !$adminEmail) {
            error_log('Email not sent: customer and admin email are missing');
            return [
                'customer_email_sent' => false,
                'admin_email_sent' => false
            ];
        }

        $headerLines = [];
        if ($fromEmail) {
            $headerLines[] = 'From: Acrylic Stand <' . $fromEmail . '>';
            $headerLines[] = 'Reply-To: ' . $fromEmail;
        }
        $headers = implode("\r\n", $headerLines);

        // マルチバイトメール設定
        if (function_exists('mb_language')) {
            mb_language('Japanese');
        }
        if (function_exists('mb_internal_encoding')) {
            mb_internal_encoding('UTF-8');
        }

        $summary = buildOrderEmailBody($data, $orderNumber, $totalPrice);

        $sendMail = function ($to, $subject, $body, $headers) {
            if (function_exists('mb_send_mail')) {
                return @mb_send_mail($to, $subject, $body, $headers);
            }
            return @mail($to, $subject, $body, $headers);
        };

        $customerSent = false;
        if ($customerEmail) {
            $customerSubject = 'ご注文ありがとうございます (注文番号: ' . $orderNumber . ')';
            $customerBody = "この度はご注文ありがとうございます。\n\n" . $summary . "\n\nこのメールは自動送信です。ご不明点は返信またはお問い合わせフォームよりご連絡ください。";
            $customerSent = $sendMail($customerEmail, $customerSubject, $customerBody, $headers);
        }

        $adminSent = false;
        if ($adminEmail) {
            $adminSubject = '新しい注文を受け付けました: ' . $orderNumber;
            $adminBody = "新しい注文を受け付けました。\n\n" . $summary . "\n\n管理画面で詳細を確認してください。";
            $adminSent = $sendMail($adminEmail, $adminSubject, $adminBody, $headers);
        }

        return [
            'customer_email_sent' => (bool)$customerSent,
            'admin_email_sent' => (bool)$adminSent
        ];
    }

    // メール本文を組み立て
    function buildOrderEmailBody($data, $orderNumber, $totalPrice) {
        $sizeNames = [
            'card' => 'カードサイズ',
            'postcard' => 'はがきサイズ',
            'a5' => 'A5サイズ',
            'a4' => 'A4サイズ'
        ];

        $orderDetails = $data['order_details'] ?? [];
        $size = $orderDetails['product_size'] ?? '';
        $sizeLabel = $sizeNames[$size] ?? $size;
        $quantity = isset($orderDetails['quantity']) ? (int)$orderDetails['quantity'] : 0;
        $unitPrice = isset($orderDetails['price']) ? (float)$orderDetails['price'] : 0.0;

        $lines = [
            '注文番号: ' . $orderNumber,
            '合計金額: ¥' . number_format($totalPrice),
            '数量: ' . $quantity . '個',
            '単価: ¥' . number_format($unitPrice),
            'サイズ: ' . ($sizeLabel ?: '未指定'),
            '台座デザイン: ' . ($orderDetails['base_design'] ?? '未指定'),
            'お名前: ' . ($data['customer']['name'] ?? '未入力'),
            'メール: ' . ($data['customer']['email'] ?? '未入力'),
            '電話番号: ' . ($data['customer']['phone'] ?? '未入力'),
            '住所: ' . ($data['customer']['address'] ?? '未入力'),
            '注文日時: ' . date('Y-m-d H:i:s')
        ];

        return implode("\n", $lines);
    }
