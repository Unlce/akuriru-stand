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
    
    // 注文が存在するか確認し、メール用に概要を取得
    $orderSummary = fetchOrderSummary($pdo, $orderId);
    if (!$orderSummary) {
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

    $emailStatus = ['subcontract_email_sent' => false];

    // 決済確認後、下請けに自動通知
    if ($status === 'paid') {
        try {
            $emailStatus['subcontract_email_sent'] = sendSubcontractEmail($orderSummary);
        } catch (Throwable $e) {
            error_log('Subcontract email failed: ' . $e->getMessage());
        }
    }
    
    sendJsonResponse([
        'success' => true,
        'message' => 'ステータスを更新しました',
        'email_notifications' => $emailStatus
    ]);
    
} catch (Exception $e) {
    error_log('Update Status API Error: ' . $e->getMessage());
    sendErrorResponse('ステータス更新中にエラーが発生しました', 500);
}

// 注文概要を取得（メール本文用）
function fetchOrderSummary(PDO $pdo, $orderId) {
    $stmt = $pdo->prepare('
        SELECT 
            o.id,
            o.order_number,
            o.status,
            c.name as customer_name,
            c.email as customer_email,
            c.phone as customer_phone,
            c.address as customer_address,
            od.product_size,
            od.base_design,
            od.quantity,
            od.unit_price,
            od.total_price,
            o.created_at
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        INNER JOIN order_details od ON o.id = od.order_id
        WHERE o.id = :order_id
        LIMIT 1
    ');
    $stmt->execute(['order_id' => $orderId]);
    return $stmt->fetch();
}

// 下請けへの通知メール送信
function sendSubcontractEmail(array $order) {
    $to = defined('SUBCONTRACT_EMAIL') ? SUBCONTRACT_EMAIL : '';
    $to = filter_var($to, FILTER_VALIDATE_EMAIL) ? $to : '';
    if (!$to) {
        error_log('Subcontract email skipped: SUBCONTRACT_EMAIL not configured');
        return false;
    }

    $fromEmail = defined('SHOP_FROM_EMAIL') ? SHOP_FROM_EMAIL : '';
    $fromEmail = filter_var($fromEmail, FILTER_VALIDATE_EMAIL) ? $fromEmail : $to;

    $headers = '';
    if ($fromEmail) {
        $headers = 'From: Acrylic Stand Ops <' . $fromEmail . ">\r\n" . 'Reply-To: ' . $fromEmail;
    }

    if (function_exists('mb_language')) {
        mb_language('Japanese');
    }
    if (function_exists('mb_internal_encoding')) {
        mb_internal_encoding('UTF-8');
    }

    $subject = '支給依頼: 注文番号 ' . ($order['order_number'] ?? 'N/A');
    $body = buildSubcontractBody($order);

    $sendMail = function ($toAddr, $subj, $msg, $hdrs) {
        if (function_exists('mb_send_mail')) {
            return @mb_send_mail($toAddr, $subj, $msg, $hdrs);
        }
        return @mail($toAddr, $subj, $msg, $hdrs);
    };

    return (bool)$sendMail($to, $subject, $body, $headers);
}

// 下請け向けメール本文
function buildSubcontractBody(array $order) {
    $sizeNames = [
        'card' => 'カードサイズ',
        'postcard' => 'はがきサイズ',
        'a5' => 'A5サイズ',
        'a4' => 'A4サイズ'
    ];

    $lines = [
        '新しい支給依頼です。下記内容で製造・発送をお願いします。',
        '',
        '注文番号: ' . ($order['order_number'] ?? 'N/A'),
        '数量: ' . ((int)($order['quantity'] ?? 0)) . '個',
        '単価: ¥' . number_format((float)($order['unit_price'] ?? 0)),
        '合計金額: ¥' . number_format((float)($order['total_price'] ?? 0)),
        'サイズ: ' . ($sizeNames[$order['product_size'] ?? ''] ?? ($order['product_size'] ?? '未指定')),
        '台座デザイン: ' . ($order['base_design'] ?? '未指定'),
        '顧客名: ' . ($order['customer_name'] ?? '未入力'),
        'メール: ' . ($order['customer_email'] ?? '未入力'),
        '電話番号: ' . ($order['customer_phone'] ?? '未入力'),
        '住所: ' . ($order['customer_address'] ?? '未入力'),
        '注文日時: ' . ($order['created_at'] ?? ''),
        '',
        '※このメールは決済確認後に自動送信されています。'
    ];

    return implode("\n", $lines);
}
