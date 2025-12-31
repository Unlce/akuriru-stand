<?php
/**
 * Orders API - RESTful API for order management
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/../config/firestore.php';

$method = $_SERVER['REQUEST_METHOD'];
$firestore = getFirestoreClient();

try {
    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $orderId = generateOrderId();
            $orderNumber = generateOrderNumber();

            $quantity = intval($data['quantity'] ?? 1);
            $unitPrice = 1500;
            $subtotal = $unitPrice * $quantity;
            $shipping = 500;
            $tax = intval(($subtotal + $shipping) * 0.1);
            $total = $subtotal + $shipping + $tax;

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
                    'size' => $data['size'] ?? '120x150mm',
                    'baseShape' => $data['baseShape'] ?? 'circle',
                    'baseColor' => $data['baseColor'] ?? '#FFB6C1',
                    'imageUrl' => $data['imageUrl'] ?? '',
                ],
                'pricing' => [
                    'quantity' => $quantity,
                    'unitPrice' => $unitPrice,
                    'subtotal' => $subtotal,
                    'shipping' => $shipping,
                    'tax' => $tax,
                    'total' => $total,
                    'currency' => 'JPY',
                ],
                'status' => 'pending',
                'paymentStatus' => 'pending',
                'createdAt' => getFirestoreTimestamp(),
                'updatedAt' => getFirestoreTimestamp(),
                'notes' => $data['notes'] ?? '',
            ];

            $firestore->collection('orders')->document($orderId)->set($orderData);

            echo json_encode([
                'success' => true,
                'orderId' => $orderId,
                'orderNumber' => $orderNumber,
                'total' => $total,
                'message' => '注文が正常に作成されました'
            ]);
            break;

        case 'GET':
            if (isset($_GET['id'])) {
                $snapshot = $firestore->collection('orders')->document($_GET['id'])->snapshot();
                if ($snapshot->exists()) {
                    echo json_encode(['success' => true, 'order' => $snapshot->data()]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => '注文が見つかりません']);
                }
            } else {
                $query = $firestore->collection('orders')->orderBy('createdAt', 'DESC')->limit(100);
                $orders = [];
                foreach ($query->documents() as $doc) {
                    if ($doc->exists()) $orders[] = $doc->data();
                }
                echo json_encode(['success' => true, 'count' => count($orders), 'orders' => $orders]);
            }
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $orderId = $_GET['id'] ?? null;
            if (!$orderId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Order ID required']);
                exit;
            }

            $updateData = [['path' => 'updatedAt', 'value' => getFirestoreTimestamp()]];
            if (isset($data['status'])) $updateData[] = ['path' => 'status', 'value' => $data['status']];
            if (isset($data['paymentStatus'])) $updateData[] = ['path' => 'paymentStatus', 'value' => $data['paymentStatus']];
            if (isset($data['trackingNumber'])) $updateData[] = ['path' => 'trackingNumber', 'value' => $data['trackingNumber']];

            $firestore->collection('orders')->document($orderId)->update($updateData);
            echo json_encode(['success' => true, 'message' => '注文が更新されました']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
