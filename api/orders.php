<?php
/**
 * Orders API
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
    sendErrorResponse('注文処理中にエラーが発生しました', 500);
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
    
    // 注文詳細の検証
    $orderDetailsFields = ['product_size', 'base_design', 'quantity', 'price'];
    foreach ($orderDetailsFields as $field) {
        if (!isset($data['order_details'][$field])) {
            sendErrorResponse("注文詳細が不足しています: {$field}");
        }
    }
    
    // データベース接続
    $pdo = getDbConnection();
    
    // トランザクション開始
    $pdo->beginTransaction();
    
    try {
        // 注文番号を生成
        $orderNumber = generateOrderNumber($pdo);
        
        // 1. 顧客情報を保存
        $customerId = saveCustomer($pdo, $data['customer']);
        
        // 2. 注文を作成
        $orderId = saveOrder($pdo, $orderNumber, $customerId);
        
        // 3. 注文詳細を保存
        saveOrderDetails($pdo, $orderId, $data['order_details']);
        
        // 4. 支払い情報を保存
        $paymentData = isset($data['payment']) ? $data['payment'] : [
            'payment_status' => 'pending',
            'amount' => $data['order_details']['price'] * $data['order_details']['quantity']
        ];
        savePayment($pdo, $orderId, $paymentData);
        
        // 5. 分析データを保存
        saveAnalytics($pdo, $orderId, $data['analytics']);
        
        // トランザクションをコミット
        $pdo->commit();
        
        // 成功レスポンスを返す
        sendJsonResponse([
            'success' => true,
            'order_number' => $orderNumber,
            'order_id' => $orderId,
            'message' => '注文が正常に作成されました'
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
    // クエリパラメータから注文番号を取得
    $orderNumber = isset($_GET['order_number']) ? sanitizeInput($_GET['order_number']) : null;
    
    if (!$orderNumber) {
        sendErrorResponse('注文番号が指定されていません');
    }
    
    $pdo = getDbConnection();
    
    // 注文情報を取得
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
            od.price,
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

/**
 * 注文番号を生成 (AS-YYYYMMDD-XXXX形式)
 * 
 * @param PDO $pdo データベース接続
 * @return string 注文番号
 */
function generateOrderNumber($pdo) {
    $date = date('Ymd');
    $prefix = "AS-{$date}-";
    
    // 今日の注文数を取得
    $stmt = $pdo->prepare('
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE DATE(created_at) = CURDATE()
    ');
    $stmt->execute();
    $result = $stmt->fetch();
    $count = $result['count'] + 1;
    
    // 4桁のシーケンス番号
    $sequence = str_pad($count, 4, '0', STR_PAD_LEFT);
    
    return $prefix . $sequence;
}

/**
 * 顧客情報を保存
 * 
 * @param PDO $pdo データベース接続
 * @param array $customer 顧客情報
 * @return int 顧客ID
 */
function saveCustomer($pdo, $customer) {
    $stmt = $pdo->prepare('
        INSERT INTO customers (name, email, phone, address, created_at)
        VALUES (:name, :email, :phone, :address, NOW())
    ');
    
    $stmt->execute([
        'name' => sanitizeInput($customer['name']),
        'email' => sanitizeInput($customer['email']),
        'phone' => sanitizeInput($customer['phone']),
        'address' => sanitizeInput($customer['address'])
    ]);
    
    return $pdo->lastInsertId();
}

/**
 * 注文を保存
 * 
 * @param PDO $pdo データベース接続
 * @param string $orderNumber 注文番号
 * @param int $customerId 顧客ID
 * @return int 注文ID
 */
function saveOrder($pdo, $orderNumber, $customerId) {
    $stmt = $pdo->prepare('
        INSERT INTO orders (order_number, customer_id, status, created_at, updated_at)
        VALUES (:order_number, :customer_id, :status, NOW(), NOW())
    ');
    
    $stmt->execute([
        'order_number' => $orderNumber,
        'customer_id' => $customerId,
        'status' => 'pending'
    ]);
    
    return $pdo->lastInsertId();
}

/**
 * 注文詳細を保存
 * 
 * @param PDO $pdo データベース接続
 * @param int $orderId 注文ID
 * @param array $details 注文詳細
 */
function saveOrderDetails($pdo, $orderId, $details) {
    $stmt = $pdo->prepare('
        INSERT INTO order_details (
            order_id, product_size, base_design, quantity, price, 
            image_path, image_data, created_at
        ) VALUES (
            :order_id, :product_size, :base_design, :quantity, :price,
            :image_path, :image_data, NOW()
        )
    ');
    
    $stmt->execute([
        'order_id' => $orderId,
        'product_size' => sanitizeInput($details['product_size']),
        'base_design' => sanitizeInput($details['base_design']),
        'quantity' => (int)$details['quantity'],
        'price' => (float)$details['price'],
        'image_path' => isset($details['image_path']) ? sanitizeInput($details['image_path']) : null,
        'image_data' => isset($details['image_data']) ? $details['image_data'] : null
    ]);
}

/**
 * 支払い情報を保存
 * 
 * @param PDO $pdo データベース接続
 * @param int $orderId 注文ID
 * @param array $payment 支払い情報
 */
function savePayment($pdo, $orderId, $payment) {
    $stmt = $pdo->prepare('
        INSERT INTO payments (
            order_id, payment_status, transaction_id, amount, created_at
        ) VALUES (
            :order_id, :payment_status, :transaction_id, :amount, NOW()
        )
    ');
    
    $stmt->execute([
        'order_id' => $orderId,
        'payment_status' => sanitizeInput($payment['payment_status']),
        'transaction_id' => isset($payment['transaction_id']) ? sanitizeInput($payment['transaction_id']) : null,
        'amount' => (float)$payment['amount']
    ]);
}

/**
 * 分析データを保存
 * 
 * @param PDO $pdo データベース接続
 * @param int $orderId 注文ID
 * @param array $analytics 分析データ
 */
function saveAnalytics($pdo, $orderId, $analytics) {
    $stmt = $pdo->prepare('
        INSERT INTO order_analytics (
            order_id, device_type, browser, session_duration, 
            referrer, pages_viewed, created_at
        ) VALUES (
            :order_id, :device_type, :browser, :session_duration,
            :referrer, :pages_viewed, NOW()
        )
    ');
    
    $stmt->execute([
        'order_id' => $orderId,
        'device_type' => isset($analytics['device_type']) ? sanitizeInput($analytics['device_type']) : null,
        'browser' => isset($analytics['browser']) ? sanitizeInput($analytics['browser']) : null,
        'session_duration' => isset($analytics['session_duration']) ? (int)$analytics['session_duration'] : null,
        'referrer' => isset($analytics['referrer']) ? sanitizeInput($analytics['referrer']) : null,
        'pages_viewed' => isset($analytics['pages_viewed']) ? (int)$analytics['pages_viewed'] : null
    ]);
}
