<?php
/**
 * Download Print Data API
 * Generates high-resolution print-ready files for manufacturing
 */

require_once 'config.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get order ID or order number
    $orderId = $_GET['order_id'] ?? null;
    $orderNumber = $_GET['order_number'] ?? null;
    $format = $_GET['format'] ?? 'zip'; // 'zip', 'pdf', 'json'

    if (!$orderId && !$orderNumber) {
        throw new Exception('注文IDまたは注文番号が必要です');
    }

    // Fetch order details
    if ($orderId) {
        $stmt = $pdo->prepare('
            SELECT 
                o.id,
                o.order_number,
                o.status,
                c.name as customer_name,
                c.email as customer_email,
                c.address as customer_address,
                od.product_size,
                od.base_design,
                od.quantity,
                od.unit_price,
                od.total_price,
                od.image_path,
                od.image_data,
                o.created_at
            FROM orders o
            INNER JOIN customers c ON o.customer_id = c.id
            INNER JOIN order_details od ON o.id = od.order_id
            WHERE o.id = ?
            LIMIT 1
        ');
        $stmt->execute([$orderId]);
    } else {
        $stmt = $pdo->prepare('
            SELECT 
                o.id,
                o.order_number,
                o.status,
                c.name as customer_name,
                c.email as customer_email,
                c.address as customer_address,
                od.product_size,
                od.base_design,
                od.quantity,
                od.unit_price,
                od.total_price,
                od.image_path,
                od.image_data,
                o.created_at
            FROM orders o
            INNER JOIN customers c ON o.customer_id = c.id
            INNER JOIN order_details od ON o.id = od.order_id
            WHERE o.order_number = ?
            LIMIT 1
        ');
        $stmt->execute([$orderNumber]);
    }

    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        throw new Exception('注文が見つかりません');
    }

    // Generate print data based on format
    if ($format === 'json') {
        // Return order data as JSON
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="order_' . $order['order_number'] . '.json"');
        
        echo json_encode([
            'order_number' => $order['order_number'],
            'customer_name' => $order['customer_name'],
            'product_size' => $order['product_size'],
            'base_design' => $order['base_design'],
            'quantity' => $order['quantity'],
            'unit_price' => $order['unit_price'],
            'total_price' => $order['total_price'],
            'image_data' => $order['image_data'],
            'image_path' => $order['image_path'],
            'created_at' => $order['created_at']
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($format === 'pdf') {
        // Generate PDF order form
        // Note: Requires FPDF or similar library in production
        // For now, return instructions
        header('Content-Type: text/plain');
        header('Content-Disposition: attachment; filename="order_' . $order['order_number'] . '.txt"');
        
        echo generateOrderForm($order);

    } elseif ($format === 'image') {
        // Return high-resolution image
        if ($order['image_data']) {
            // Extract base64 data
            $imageData = $order['image_data'];
            if (strpos($imageData, 'base64,') !== false) {
                $imageData = explode('base64,', $imageData)[1];
            }
            $imageData = base64_decode($imageData);

            // Determine image type
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->buffer($imageData);

            header('Content-Type: ' . $mimeType);
            header('Content-Disposition: attachment; filename="order_' . $order['order_number'] . '_image.png"');
            header('Content-Length: ' . strlen($imageData));

            echo $imageData;

        } elseif ($order['image_path']) {
            // Serve file from disk
            $filePath = '../' . $order['image_path'];
            if (file_exists($filePath)) {
                $mimeType = mime_content_type($filePath);
                $extension = pathinfo($filePath, PATHINFO_EXTENSION);

                header('Content-Type: ' . $mimeType);
                header('Content-Disposition: attachment; filename="order_' . $order['order_number'] . '_image.' . $extension . '"');
                header('Content-Length: ' . filesize($filePath));

                readfile($filePath);
            } else {
                throw new Exception('画像ファイルが見つかりません');
            }
        } else {
            throw new Exception('画像データがありません');
        }

    } else {
        // Default: return order info as text
        header('Content-Type: text/plain; charset=UTF-8');
        header('Content-Disposition: attachment; filename="order_' . $order['order_number'] . '_data.txt"');
        
        echo generateOrderForm($order);
    }

} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Generate printable order form
 */
function generateOrderForm($order) {
    $sizeLabels = [
        'card' => 'カードサイズ (55mm × 85mm)',
        'postcard' => 'はがきサイズ (100mm × 148mm)',
        'a5' => 'A5サイズ (148mm × 210mm)',
        'a4' => 'A4サイズ (210mm × 297mm)'
    ];

    $form = "═══════════════════════════════════════\n";
    $form .= "　　アクリルスタンド製造指示書\n";
    $form .= "═══════════════════════════════════════\n\n";
    $form .= "注文番号: " . $order['order_number'] . "\n";
    $form .= "注文日時: " . $order['created_at'] . "\n";
    $form .= "ステータス: " . $order['status'] . "\n\n";

    $form .= "─────────────────────────────────────\n";
    $form .= "■ 製品仕様\n";
    $form .= "─────────────────────────────────────\n";
    $form .= "サイズ: " . ($sizeLabels[$order['product_size']] ?? $order['product_size']) . "\n";
    $form .= "台座デザイン: " . $order['base_design'] . "\n";
    $form .= "数量: " . $order['quantity'] . " 個\n\n";

    $form .= "─────────────────────────────────────\n";
    $form .= "■ 顧客情報\n";
    $form .= "─────────────────────────────────────\n";
    $form .= "氏名: " . $order['customer_name'] . "\n";
    $form .= "メール: " . $order['customer_email'] . "\n";
    $form .= "配送先:\n" . $order['customer_address'] . "\n\n";

    $form .= "─────────────────────────────────────\n";
    $form .= "■ 価格\n";
    $form .= "─────────────────────────────────────\n";
    $form .= "単価: ¥" . number_format($order['unit_price']) . "\n";
    $form .= "合計: ¥" . number_format($order['total_price']) . "\n\n";

    $form .= "─────────────────────────────────────\n";
    $form .= "■ 画像データ\n";
    $form .= "─────────────────────────────────────\n";
    if ($order['image_path']) {
        $form .= "ファイルパス: " . $order['image_path'] . "\n";
    }
    if ($order['image_data']) {
        $form .= "画像データ: Base64エンコード済み\n";
        $form .= "（別途ダウンロードしてください）\n";
    }
    $form .= "\n";

    $form .= "─────────────────────────────────────\n";
    $form .= "■ 製造メモ\n";
    $form .= "─────────────────────────────────────\n";
    $form .= "・高解像度での印刷を推奨します\n";
    $form .= "・透明部分の確認を行ってください\n";
    $form .= "・台座の色・形状を仕様通りに製造してください\n\n";

    $form .= "═══════════════════════════════════════\n";
    $form .= "　　　製造担当者署名: ＿＿＿＿＿＿＿＿＿\n";
    $form .= "　　　確認日: ＿＿＿＿年＿＿月＿＿日\n";
    $form .= "═══════════════════════════════════════\n";

    return $form;
}
