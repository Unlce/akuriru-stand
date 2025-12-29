<?php
/**
 * Health Check Endpoint
 * Used by Cloud Run, App Engine, and load balancers for health checks
 */

header('Content-Type: application/json; charset=utf-8');

$health = [
    'status' => 'healthy',
    'timestamp' => time(),
    'service' => 'akuriru-stand',
    'version' => '1.0.0'
];

// Optional: Test database connection
if (getenv('CHECK_DB_HEALTH') === 'true') {
    try {
        require_once __DIR__ . '/api/config.php';
        $pdo = getDbConnection();

        // Simple query to verify connection
        $stmt = $pdo->query('SELECT 1');
        $result = $stmt->fetch();

        $health['database'] = 'connected';
        $health['db_host'] = DB_HOST;
    } catch (Exception $e) {
        $health['database'] = 'error';
        $health['db_error'] = $e->getMessage();

        // Still return 200 for basic health check
        // Set to 503 if you want to fail on DB errors
        // http_response_code(503);
    }
} else {
    $health['database'] = 'not_checked';
}

// Environment info (safe to expose)
$health['environment'] = getenv('APP_ENV') ?: 'local';
$health['php_version'] = PHP_VERSION;

http_response_code(200);
echo json_encode($health, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
exit();
