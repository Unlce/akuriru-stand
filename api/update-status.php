<?php
/**
 * Update Status API
 * 
 * 注文のステータスを更新するAPI
 */

require_once __DIR__ . '/config.php';

// POSTリクエストのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('POSTメソッドのみサポートされています', 405);
}

try {
    // リクエストボディからJSONデータを取得
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        sendErrorResponse('無効なJSONデータです');
    }
    
    // 必須フィールドの検証
    if (!isset($data['order_id']) || !isset($data['status'])) {
        sendErrorResponse('order_id と status は必須です');
    }
    
    $orderId = sanitizeInput($data['order_id']);
    $status = sanitizeInput($data['status']);
    
    // ステータス値の検証（データベースのENUM値に合わせる）
    $validStatuses = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!in_array($status, $validStatuses)) {
        sendErrorResponse('無効なステータスです');
    }
    
    $pdo = getDbConnection();
    
    // 注文が存在するか確認
    $checkStmt = $pdo->prepare('SELECT id FROM orders WHERE id = :order_id');
    $checkStmt->execute(['order_id' => $orderId]);
    
    if (!$checkStmt->fetch()) {
        sendErrorResponse('注文が見つかりません', 404);
    }
    
    // ステータスを更新
    $stmt = $pdo->prepare('
        UPDATE orders 
        SET status = :status, updated_at = NOW()
        WHERE id = :order_id
    ');
    
    $stmt->execute([
        'status' => $status,
        'order_id' => $orderId
    ]);
    
    sendJsonResponse([
        'success' => true,
        'message' => 'ステータスを更新しました'
    ]);
    
} catch (Exception $e) {
    error_log('Update Status API Error: ' . $e->getMessage());
    sendErrorResponse('ステータス更新中にエラーが発生しました', 500);
}
