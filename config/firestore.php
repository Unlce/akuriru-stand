<?php
/**
 * Firestore Database Configuration
 * Cloud Firestore client initialization and helper functions
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Core\Timestamp;

/**
 * Get Firestore client instance (singleton)
 */
function getFirestoreClient() {
    static $firestore = null;

    if ($firestore === null) {
        $firestore = new FirestoreClient([
            'projectId' => 'acrylicstand',
        ]);
    }

    return $firestore;
}

/**
 * Generate unique order ID
 * Format: ORD-YYYYMMDD-XXXXXX
 */
function generateOrderId() {
    return 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
}

/**
 * Generate display order number
 * Format: YYYYMMDDXXX
 */
function generateOrderNumber() {
    return date('Ymd') . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
}

/**
 * Get current timestamp for Firestore
 */
function getFirestoreTimestamp() {
    return new Timestamp(new \DateTime());
}

/**
 * Format Firestore timestamp to readable string
 */
function formatTimestamp($timestamp) {
    if ($timestamp instanceof Timestamp) {
        $dt = $timestamp->get();
        return $dt->format('Y-m-d H:i:s');
    }
    return '';
}
?>
