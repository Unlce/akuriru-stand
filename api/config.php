<?php
/**
 * Database Configuration File
 *
 * Environment-based configuration for multiple deployment targets
 * Supports: GCP Cloud SQL, Local Development, and other cloud providers
 */

// Environment detection
$appEnv = getenv('APP_ENV') ?: 'local';
$isGcp = ($appEnv === 'gcp' || getenv('GAE_INSTANCE') || getenv('K_SERVICE'));

// Database configuration from environment variables
// GCP Cloud Run/App Engine: Use Unix socket connection
// Local/Other: Use TCP connection with hostname
if ($isGcp && getenv('CLOUD_SQL_CONNECTION_NAME')) {
    // GCP Cloud SQL via Unix socket (recommended for Cloud Run/App Engine)
    define('DB_HOST', '/cloudsql/' . getenv('CLOUD_SQL_CONNECTION_NAME'));
} else {
    // TCP connection (local development or other environments)
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
}

define('DB_NAME', getenv('DB_NAME') ?: 'acrylic_stand');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_CHARSET', 'utf8mb4');

// メール通知設定（環境変数で上書き可能）
// SHOP_ADMIN_EMAIL: 店舗側の受信アドレス（デフォルトは info@zyniqo.co.jp）
// SHOP_FROM_EMAIL: 送信元に使うドメイン認証済みアドレス（空の場合は管理者メールを使用）
// SUBCONTRACT_EMAIL: 下請け（製造/発送パートナー）に送るアドレス
define('SHOP_ADMIN_EMAIL', getenv('SHOP_ADMIN_EMAIL') ?: 'info@zyniqo.co.jp');
define('SHOP_FROM_EMAIL', getenv('SHOP_FROM_EMAIL') ?: 'info@zyniqo.co.jp');
define('SUBCONTRACT_EMAIL', getenv('SUBCONTRACT_EMAIL') ?: '');

// CORS設定（必要に応じて許可するオリジンを変更）
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// OPTIONSリクエストの処理（プリフライトリクエスト）
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Get database connection
 * Supports both Unix socket (GCP Cloud SQL) and TCP connections
 *
 * @return PDO Database connection object
 * @throws PDOException If connection fails
 */
function getDbConnection() {
    try {
        // Check if using Unix socket (starts with /)
        if (strpos(DB_HOST, '/') === 0) {
            // GCP Cloud SQL Unix socket connection
            $dsn = sprintf(
                'mysql:unix_socket=%s;dbname=%s;charset=%s',
                DB_HOST,
                DB_NAME,
                DB_CHARSET
            );
        } else {
            // Standard TCP connection
            $port = defined('DB_PORT') ? DB_PORT : '3306';
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                DB_HOST,
                $port,
                DB_NAME,
                DB_CHARSET
            );
        }

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
            PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4',
        ];

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log('Database connection error: ' . $e->getMessage());
        error_log('Connection details: host=' . DB_HOST . ', db=' . DB_NAME . ', user=' . DB_USER);
        throw new PDOException('データベース接続エラー');
    }
}

/**
 * JSON レスポンスを返す
 * 
 * @param mixed $data レスポンスデータ
 * @param int $statusCode HTTPステータスコード
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * エラーレスポンスを返す
 * 
 * @param string $message エラーメッセージ
 * @param int $statusCode HTTPステータスコード
 */
function sendErrorResponse($message, $statusCode = 400) {
    sendJsonResponse([
        'success' => false,
        'error' => $message
    ], $statusCode);
}

/**
 * 入力データをサニタイズ
 * 
 * @param string $data 入力データ
 * @return string サニタイズされたデータ
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}
