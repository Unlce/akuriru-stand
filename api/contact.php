<?php
/**
 * Contact Form API
 * 
 * お問い合わせフォームからの送信を処理するAPIエンドポイント
 */

require_once __DIR__ . '/config.php';

// POSTメソッドのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('POSTメソッドのみ対応しています', 405);
}

try {
    // リクエストボディを取得
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        sendErrorResponse('無効なJSONデータです', 400);
    }

    // 必須フィールドのバリデーション
    $requiredFields = ['name', 'email', 'subject', 'message'];
    foreach ($requiredFields as $field) {
        if (empty($data[$field])) {
            sendErrorResponse("{$field} は必須です", 400);
        }
    }

    // メールアドレスのバリデーション
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        sendErrorResponse('無効なメールアドレスです', 400);
    }

    // データベースに保存
    $stmt = $pdo->prepare("
        INSERT INTO contacts (name, email, subject, order_number, message, created_at)
        VALUES (:name, :email, :subject, :order_number, :message, NOW())
    ");

    $stmt->execute([
        'name' => $data['name'],
        'email' => $data['email'],
        'subject' => $data['subject'],
        'order_number' => $data['orderNumber'] ?? null,
        'message' => $data['message']
    ]);

    $contactId = $pdo->lastInsertId();

    // 管理者にメール通知を送信
    sendAdminNotification($data);

    // 顧客に自動返信メールを送信
    sendAutoReply($data);

    sendSuccessResponse([
        'contact_id' => $contactId,
        'message' => 'お問い合わせを受け付けました'
    ]);

} catch (PDOException $e) {
    error_log('Contact Error: ' . $e->getMessage());
    sendErrorResponse('お問い合わせの保存に失敗しました', 500);
} catch (Exception $e) {
    error_log('Contact Error: ' . $e->getMessage());
    sendErrorResponse('エラーが発生しました', 500);
}

/**
 * 管理者に通知メールを送信
 */
function sendAdminNotification($data) {
    $to = SHOP_ADMIN_EMAIL;
    $subject = '[お問い合わせ] ' . $data['subject'];
    
    $message = "新しいお問い合わせが届きました。\n\n";
    $message .= "━━━━━━━━━━━━━━━━━━━━━━\n";
    $message .= "お名前: {$data['name']}\n";
    $message .= "メールアドレス: {$data['email']}\n";
    $message .= "種別: {$data['subject']}\n";
    
    if (!empty($data['orderNumber'])) {
        $message .= "注文番号: {$data['orderNumber']}\n";
    }
    
    $message .= "━━━━━━━━━━━━━━━━━━━━━━\n\n";
    $message .= "【お問い合わせ内容】\n";
    $message .= $data['message'] . "\n\n";
    $message .= "━━━━━━━━━━━━━━━━━━━━━━\n";
    $message .= "送信日時: " . date('Y-m-d H:i:s') . "\n";

    $headers = "From: " . SHOP_FROM_EMAIL . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    if (function_exists('mb_send_mail')) {
        mb_send_mail($to, $subject, $message, $headers);
    } else {
        mail($to, $subject, $message, $headers);
    }
}

/**
 * 顧客に自動返信メールを送信
 */
function sendAutoReply($data) {
    $to = $data['email'];
    $subject = '[アクリルスタンドクリエイター] お問い合わせを受け付けました';
    
    $message = "{$data['name']} 様\n\n";
    $message .= "この度は、アクリルスタンドクリエイターにお問い合わせいただき、誠にありがとうございます。\n\n";
    $message .= "以下の内容でお問い合わせを受け付けました。\n";
    $message .= "内容を確認の上、1〜2営業日以内にご返信いたします。\n\n";
    $message .= "━━━━━━━━━━━━━━━━━━━━━━\n";
    $message .= "【お問い合わせ内容】\n";
    $message .= "種別: {$data['subject']}\n";
    
    if (!empty($data['orderNumber'])) {
        $message .= "注文番号: {$data['orderNumber']}\n";
    }
    
    $message .= "\n" . $data['message'] . "\n";
    $message .= "━━━━━━━━━━━━━━━━━━━━━━\n\n";
    $message .= "今しばらくお待ちください。\n\n";
    $message .= "※このメールは自動送信されています。\n";
    $message .= "※返信はできませんので、ご了承ください。\n\n";
    $message .= "━━━━━━━━━━━━━━━━━━━━━━\n";
    $message .= "アクリルスタンドクリエイター\n";
    $message .= "Email: " . SHOP_ADMIN_EMAIL . "\n";
    $message .= "━━━━━━━━━━━━━━━━━━━━━━\n";

    $headers = "From: " . SHOP_FROM_EMAIL . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    if (function_exists('mb_send_mail')) {
        mb_send_mail($to, $subject, $message, $headers);
    } else {
        mail($to, $subject, $message, $headers);
    }
}
