<?php
/**
 * Payment Webhook Handler
 * Handles webhooks from Stripe and PayPay
 */

require_once 'config.php';

// Log incoming webhook for debugging
$rawPayload = file_get_contents('php://input');
error_log('[Webhook] Received: ' . $rawPayload);

header('Content-Type: application/json');

try {
    // Determine payment provider from URL parameter or header
    $provider = $_GET['provider'] ?? $_SERVER['HTTP_X_PAYMENT_PROVIDER'] ?? null;
    
    if (!$provider) {
        // Try to detect from payload
        $payload = json_decode($rawPayload, true);
        if (isset($payload['type'])) {
            $provider = 'stripe'; // Stripe sends 'type' field
        } elseif (isset($payload['merchantPaymentId'])) {
            $provider = 'paypay'; // PayPay sends merchantPaymentId
        }
    }
    
    if ($provider === 'stripe') {
        handleStripeWebhook($rawPayload);
    } elseif ($provider === 'paypay') {
        handlePayPayWebhook($rawPayload);
    } else {
        throw new Exception('Unknown payment provider');
    }
    
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    error_log('[Webhook] Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Handle Stripe Webhook
 */
function handleStripeWebhook($payload) {
    global $pdo;
    
    $webhookSecret = getenv('STRIPE_WEBHOOK_SECRET') ?: 'whsec_YOUR_WEBHOOK_SECRET';
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    
    // Note: In production, verify webhook signature using Stripe SDK:
    /*
    require 'vendor/autoload.php';
    \Stripe\Stripe::setApiKey(getenv('STRIPE_SECRET_KEY'));
    
    try {
        $event = \Stripe\Webhook::constructEvent(
            $payload, $sigHeader, $webhookSecret
        );
    } catch(\UnexpectedValueException $e) {
        throw new Exception('Invalid payload');
    } catch(\Stripe\Exception\SignatureVerificationException $e) {
        throw new Exception('Invalid signature');
    }
    */
    
    $event = json_decode($payload, true);
    
    error_log('[Stripe Webhook] Event type: ' . $event['type']);
    
    // Handle the event
    switch ($event['type']) {
        case 'checkout.session.completed':
            $session = $event['data']['object'];
            $orderId = $session['metadata']['order_id'] ?? null;
            
            if ($orderId) {
                // Update order status to 'paid'
                $stmt = $pdo->prepare("
                    UPDATE orders 
                    SET status = 'paid', 
                        payment_status = 'completed',
                        updated_at = NOW() 
                    WHERE id = ?
                ");
                $stmt->execute([$orderId]);
                
                error_log('[Stripe Webhook] Order ' . $orderId . ' marked as paid');
                
                // Send notification emails (handled by update-status.php trigger)
                // Or call email function here if needed
            }
            break;
            
        case 'payment_intent.succeeded':
            error_log('[Stripe Webhook] Payment succeeded');
            break;
            
        case 'payment_intent.payment_failed':
            $paymentIntent = $event['data']['object'];
            error_log('[Stripe Webhook] Payment failed: ' . $paymentIntent['id']);
            break;
            
        default:
            error_log('[Stripe Webhook] Unhandled event type: ' . $event['type']);
    }
}

/**
 * Handle PayPay Webhook
 */
function handlePayPayWebhook($payload) {
    global $pdo;
    
    $event = json_decode($payload, true);
    
    error_log('[PayPay Webhook] Event: ' . json_encode($event));
    
    // Verify webhook authenticity
    // Note: In production, verify HMAC signature from PayPay
    
    $merchantPaymentId = $event['merchantPaymentId'] ?? null;
    $status = $event['status'] ?? null;
    
    if (!$merchantPaymentId) {
        throw new Exception('Missing merchantPaymentId');
    }
    
    // Extract order ID from merchantPaymentId (format: order_{id}_{timestamp})
    if (preg_match('/^order_(\d+)_/', $merchantPaymentId, $matches)) {
        $orderId = $matches[1];
        
        // Update order based on payment status
        if ($status === 'COMPLETED') {
            $stmt = $pdo->prepare("
                UPDATE orders 
                SET status = 'paid',
                    payment_status = 'completed',
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$orderId]);
            
            error_log('[PayPay Webhook] Order ' . $orderId . ' marked as paid');
            
        } elseif ($status === 'FAILED' || $status === 'CANCELED') {
            $stmt = $pdo->prepare("
                UPDATE orders 
                SET payment_status = 'failed',
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$orderId]);
            
            error_log('[PayPay Webhook] Order ' . $orderId . ' payment failed/canceled');
        }
    }
}
