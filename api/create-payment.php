<?php
/**
 * Create Payment Session
 * Handles Stripe Checkout and PayPay API integration
 */

require_once 'config.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($input['order_id'], $input['amount'], $input['payment_method'])) {
        throw new Exception('注文ID、金額、決済方法は必須です');
    }

    $orderId = $input['order_id'];
    $amount = (int)$input['amount'];
    $paymentMethod = $input['payment_method']; // 'stripe' or 'paypay'
    $currency = $input['currency'] ?? 'jpy';
    
    // Get order details from database
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        throw new Exception('注文が見つかりません');
    }
    
    // Verify amount matches order
    if ($amount !== (int)$order['total_price']) {
        throw new Exception('金額が一致しません');
    }

    $paymentData = [];

    // Create payment session based on payment method
    if ($paymentMethod === 'stripe') {
        $paymentData = createStripeSession($order, $amount, $currency);
    } elseif ($paymentMethod === 'paypay') {
        $paymentData = createPayPayPayment($order, $amount);
    } else {
        throw new Exception('無効な決済方法です');
    }

    // Update order with payment session ID
    $stmt = $pdo->prepare("UPDATE orders SET payment_method = ?, payment_session_id = ? WHERE id = ?");
    $stmt->execute([$paymentMethod, $paymentData['session_id'] ?? null, $orderId]);

    echo json_encode([
        'success' => true,
        'payment_data' => $paymentData,
        'order_id' => $orderId
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Create Stripe Checkout Session
 */
function createStripeSession($order, $amount, $currency) {
    $stripeSecretKey = getenv('STRIPE_SECRET_KEY') ?: 'sk_test_YOUR_SECRET_KEY_HERE';
    
    // Note: This is a simplified example. In production, use Stripe PHP SDK
    // composer require stripe/stripe-php
    
    // For now, return mock data structure
    // In production, replace this with actual Stripe API call:
    /*
    \Stripe\Stripe::setApiKey($stripeSecretKey);
    $session = \Stripe\Checkout\Session::create([
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => $currency,
                'product_data' => [
                    'name' => 'アクリルスタンド - ' . $order['size'],
                ],
                'unit_amount' => $amount,
            ],
            'quantity' => $order['quantity'],
        ]],
        'mode' => 'payment',
        'success_url' => getenv('SITE_URL') . '/success.html?order_id=' . $order['id'],
        'cancel_url' => getenv('SITE_URL') . '/cancel.html',
        'metadata' => [
            'order_id' => $order['id'],
        ],
    ]);
    
    return [
        'session_id' => $session->id,
        'checkout_url' => $session->url,
        'public_key' => getenv('STRIPE_PUBLIC_KEY')
    ];
    */
    
    // Mock response for development
    return [
        'session_id' => 'cs_test_' . bin2hex(random_bytes(16)),
        'checkout_url' => 'https://checkout.stripe.com/test',
        'public_key' => getenv('STRIPE_PUBLIC_KEY') ?: 'pk_test_YOUR_PUBLIC_KEY_HERE',
        'mode' => 'test' // Remove this in production
    ];
}

/**
 * Create PayPay Payment
 */
function createPayPayPayment($order, $amount) {
    $paypayApiKey = getenv('PAYPAY_API_KEY') ?: 'YOUR_PAYPAY_API_KEY';
    $paypayApiSecret = getenv('PAYPAY_API_SECRET') ?: 'YOUR_PAYPAY_SECRET';
    $paypayMerchantId = getenv('PAYPAY_MERCHANT_ID') ?: 'YOUR_MERCHANT_ID';
    
    // PayPay API endpoint
    $apiUrl = 'https://api.paypay.ne.jp/v2/codes';
    
    // Prepare payment data
    $paymentData = [
        'merchantPaymentId' => 'order_' . $order['id'] . '_' . time(),
        'amount' => [
            'amount' => $amount,
            'currency' => 'JPY'
        ],
        'codeType' => 'ORDER_QR',
        'orderDescription' => 'アクリルスタンド注文 #' . $order['id'],
        'redirectUrl' => getenv('SITE_URL') . '/success.html?order_id=' . $order['id'],
        'redirectType' => 'WEB_LINK'
    ];
    
    // Note: This is a simplified example. In production:
    // 1. Install PayPay PHP SDK or implement full authentication
    // 2. Generate proper HMAC signature for API authentication
    // 3. Handle webhook notifications
    
    /*
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $paypayApiKey
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 201) {
        throw new Exception('PayPay決済の作成に失敗しました');
    }
    
    $result = json_decode($response, true);
    */
    
    // Mock response for development
    $result = [
        'resultInfo' => [
            'code' => 'SUCCESS',
            'message' => 'Success',
            'codeId' => bin2hex(random_bytes(16))
        ],
        'data' => [
            'codeId' => bin2hex(random_bytes(16)),
            'url' => 'paypay://payment/' . bin2hex(random_bytes(8)),
            'deeplink' => 'paypay://payment/' . bin2hex(random_bytes(8)),
            'expiryDate' => time() + 300, // 5 minutes
            'merchantPaymentId' => $paymentData['merchantPaymentId'],
            'amount' => $paymentData['amount']
        ]
    ];
    
    return [
        'session_id' => $result['data']['codeId'],
        'payment_url' => $result['data']['url'],
        'qr_code_url' => $result['data']['url'],
        'deeplink' => $result['data']['deeplink'],
        'merchant_payment_id' => $paymentData['merchantPaymentId'],
        'expires_at' => $result['data']['expiryDate'],
        'mode' => 'test' // Remove this in production
    ];
}
