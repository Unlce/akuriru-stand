<?php
/**
 * Order Detail API
 * 
 * 特定の注文の詳細情報を取得するAPI
 */

require_once __DIR__ . '/config.php';

// GETリクエストのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendErrorResponse('GETメソッドのみサポートされています', 405);
}

try {
    // 注文IDを取得（UUID文字列）
    $orderId = isset($_GET['id']) ? sanitizeInput($_GET['id']) : null;
    
    if (!$orderId || strlen($orderId) < 10) {
        sendErrorResponse('注文IDが指定されていません');
    }
    
    $pdo = getDbConnection();
    
    // 注文詳細情報を取得
    $stmt = $pdo->prepare('
        SELECT 
            o.id,
            o.order_number,
            o.status,
            o.created_at,
            o.updated_at,
            c.name as customer_name,
            c.email as customer_email,
            c.phone as customer_phone,
            c.address as customer_address,
            od.product_size as size,
            od.base_design as base_type,
            od.quantity,
            od.price as unit_price,
            od.image_path,
            od.image_data,
            p.payment_status as payment_method,
            p.amount as total_price,
            0 as shipping_fee
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        INNER JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.id = p.order_id
        WHERE o.id = :order_id
    ');
    
    $stmt->execute(['order_id' => $orderId]);
    $order = $stmt->fetch();
    
    if (!$order) {
        sendErrorResponse('注文が見つかりません', 404);
    }
    
    // サイズ名を日本語に変換
    $sizeNames = [
        'card' => 'カードサイズ',
        'postcard' => 'はがきサイズ',
        'a5' => 'A5サイズ',
        'a4' => 'A4サイズ'
    ];
    $order['size_display'] = $sizeNames[$order['size']] ?? $order['size'];
    
    // ステータス名を日本語に変換
    $statusNames = [
        'pending' => '新規',
        'processing' => '処理中',
        'completed' => '完了',
        'cancelled' => 'キャンセル'
    ];
    $order['status_display'] = $statusNames[$order['status']] ?? $order['status'];
    
    // decorationsフィールドを追加（現在は空オブジェクト）
    // JSONエンコード時にオブジェクトとして出力されるように空配列ではなくキャスト
    $order['decorations'] = (object)[];
    
    // notesフィールドを追加（現在は空）
    $order['notes'] = '';
    
    sendJsonResponse([
        'success' => true,
        'order' => $order
    ]);
    
} catch (Exception $e) {
    error_log('Order Detail API Error: ' . $e->getMessage());
    sendErrorResponse('注文詳細の取得中にエラーが発生しました', 500);
}
