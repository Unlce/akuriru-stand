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

    $emailStatus = ['subcontract_email_sent' => false, 'shipping_notification_sent' => false];

    // 決済確認後、下請けに自動通知
    if ($status === 'paid') {
        try {
            $emailStatus['subcontract_email_sent'] = sendSubcontractEmail($orderSummary);
        } catch (Throwable $e) {
            error_log('Subcontract email failed: ' . $e->getMessage());
        }
    }

    // 発送完了後、顧客に通知
    if ($status === 'shipped') {
        try {
            $emailStatus['shipping_notification_sent'] = sendShippingNotificationEmail($orderSummary);
        } catch (Throwable $e) {
            error_log('Shipping notification failed: ' . $e->getMessage());
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

// 発送通知メール送信
function sendShippingNotificationEmail(array $order) {
    $customerEmail = $order['customer_email'] ?? '';
    if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        error_log('Shipping notification skipped: invalid customer email');
        return false;
    }

    $fromEmail = defined('SHOP_FROM_EMAIL') ? SHOP_FROM_EMAIL : '';
    $fromEmail = filter_var($fromEmail, FILTER_VALIDATE_EMAIL) ? $fromEmail : 'noreply@example.com';

    $headers = 'From: アクリルスタンド工房 <' . $fromEmail . ">\r\n" . 'Reply-To: ' . $fromEmail;

    if (function_exists('mb_language')) {
        mb_language('Japanese');
    }
    if (function_exists('mb_internal_encoding')) {
        mb_internal_encoding('UTF-8');
    }

    $subject = '【発送完了】ご注文商品を発送いたしました - 注文番号: ' . ($order['order_number'] ?? $order['id']);
    $body = buildShippingNotificationBody($order);

    $success = false;
    if (function_exists('mb_send_mail')) {
        $success = mb_send_mail($customerEmail, $subject, $body, $headers);
    } else {
        $success = mail($customerEmail, $subject, $body, $headers);
    }

    if ($success) {
        error_log('Shipping notification sent to: ' . $customerEmail);
    } else {
        error_log('Failed to send shipping notification to: ' . $customerEmail);
    }

    return $success;
}

// 発送通知メール本文生成
function buildShippingNotificationBody(array $order) {
    $sizeLabels = [
        'card' => 'カードサイズ',
        'postcard' => 'はがきサイズ',
        'a5' => 'A5サイズ',
        'a4' => 'A4サイズ'
    ];

    $shippingCompanies = [
        'yamato' => 'ヤマト運輸',
        'sagawa' => '佐川急便',
        'yupack' => '日本郵便（ゆうパック）',
        'japanpost' => '日本郵便'
    ];

    $trackingUrls = [
        'yamato' => 'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=',
        'sagawa' => 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=',
        'yupack' => 'https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=',
        'japanpost' => 'https://trackings.post.japanpost.jp/services/srv/search/?requestNo1='
    ];

    $siteUrl = getenv('SITE_URL') ?: 'https://example.com';
    $trackingPageUrl = $siteUrl . '/tracking.html?order=' . urlencode($order['order_number'] ?? $order['id']);

    $body = $order['customer_name'] . " 様\n\n";
    $body .= "いつもアクリルスタンド工房をご利用いただきありがとうございます。\n\n";
    $body .= "ご注文いただきました商品を発送いたしましたのでお知らせいたします。\n\n";
    $body .= "══════════════════════════════\n";
    $body .= "■ 注文情報\n";
    $body .= "══════════════════════════════\n";
    $body .= "注文番号: " . ($order['order_number'] ?? $order['id']) . "\n";
    $body .= "注文日時: " . ($order['created_at'] ?? '') . "\n";
    $body .= "商品: アクリルスタンド - " . ($sizeLabels[$order['product_size']] ?? $order['product_size']) . "\n";
    $body .= "数量: " . ($order['quantity'] ?? 1) . "個\n";
    $body .= "金額: ¥" . number_format($order['total_price'] ?? 0) . "\n\n";

    // 配送情報を追加
    if (!empty($order['tracking_number'])) {
        $companyName = $shippingCompanies[$order['shipping_company'] ?? ''] ?? ($order['shipping_company'] ?? '配送業者');
        $trackingUrl = '';
        if (isset($trackingUrls[$order['shipping_company'] ?? ''])) {
            $trackingUrl = $trackingUrls[$order['shipping_company']] . $order['tracking_number'];
        }

        $body .= "══════════════════════════════\n";
        $body .= "■ 配送情報\n";
        $body .= "══════════════════════════════\n";
        $body .= "配送会社: " . $companyName . "\n";
        $body .= "追跡番号: " . $order['tracking_number'] . "\n\n";

        if ($trackingUrl) {
            $body .= "配送状況の確認:\n" . $trackingUrl . "\n\n";
        }
    }

    $body .= "当サイトでの追跡:\n" . $trackingPageUrl . "\n\n";
    $body .= "══════════════════════════════\n";
    $body .= "配送先住所\n";
    $body .= "══════════════════════════════\n";
    $body .= ($order['customer_address'] ?? '') . "\n\n";
    $body .= "お届けまでしばらくお待ちください。\n";
    $body .= "商品到着後、何か問題がございましたら\n";
    $body .= "お気軽にお問い合わせください。\n\n";
    $body .= "今後ともアクリルスタンド工房を\n";
    $body .= "よろしくお願いいたします。\n\n";
    $body .= "══════════════════════════════\n";
    $body .= "アクリルスタンド工房\n";

    if (defined('SHOP_ADMIN_EMAIL')) {
        $body .= "お問い合わせ: " . SHOP_ADMIN_EMAIL . "\n";
    }

    return $body;
}
