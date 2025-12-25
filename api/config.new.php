<?php
/**
 * Environment-based Configuration File
 * 
 * この設定ファイルは環境変数を優先し、3つの環境をサポートします:
 * - local: ローカル開発環境 (Docker)
 * - gcp: GCP テスト/ステージング環境
 * - lolipop: Lolipop 本番環境
 */

// 環境の検出（環境変数 APP_ENV で指定、デフォルトは 'lolipop'）
define('APP_ENV', getenv('APP_ENV') ?: 'lolipop');

// デバッグモード（本番環境では必ず false）
define('DEBUG_MODE', getenv('DEBUG_MODE') === 'true' || APP_ENV === 'local');

// エラー表示設定
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

// =====================================================
// データベース設定（環境別）
// =====================================================

switch (APP_ENV) {
    case 'local':
        // ローカル開発環境 (Docker Compose)
        define('DB_HOST', getenv('DB_HOST') ?: 'mysql');
        define('DB_NAME', getenv('DB_NAME') ?: 'acrylic_stand');
        define('DB_USER', getenv('DB_USER') ?: 'stand_user');
        define('DB_PASS', getenv('DB_PASS') ?: 'stand_password');
        define('DB_CHARSET', 'utf8mb4');
        break;
        
    case 'gcp':
        // GCP Cloud SQL 環境（Unix ソケット接続）
        define('DB_HOST', getenv('DB_HOST') ?: '/cloudsql/' . getenv('CLOUD_SQL_CONNECTION_NAME'));
        define('DB_NAME', getenv('DB_NAME') ?: 'acrylic_stand');
        define('DB_USER', getenv('DB_USER') ?: 'stand_user');
        define('DB_PASS', getenv('DB_PASS') ?: '');
        define('DB_CHARSET', 'utf8mb4');
        break;
        
    case 'lolipop':
    default:
        // Lolipop 本番環境
        // 重要: .lan は正しいドメインです。.jp に変更しないでください！
        define('DB_HOST', getenv('DB_HOST') ?: 'mysql324.phy.lolipop.lan');
        define('DB_NAME', getenv('DB_NAME') ?: 'LAA1658426-stand');
        define('DB_USER', getenv('DB_USER') ?: 'LAA1658426');
        define('DB_PASS', getenv('DB_PASS') ?: 'hlcz107bb');
        define('DB_CHARSET', 'utf8mb4');
        break;
}

// =====================================================
// メール設定
// =====================================================

define('SHOP_ADMIN_EMAIL', getenv('SHOP_ADMIN_EMAIL') ?: 'info@zyniqo.co.jp');
define('SHOP_FROM_EMAIL', getenv('SHOP_FROM_EMAIL') ?: 'info@zyniqo.co.jp');
define('SUBCONTRACT_EMAIL', getenv('SUBCONTRACT_EMAIL') ?: '');

// =====================================================
// ストレージ設定
// =====================================================

// アップロードディレクトリ
if (APP_ENV === 'gcp') {
    // GCP Cloud Storage を使用する場合
    define('UPLOAD_DIR', getenv('GCS_BUCKET') ?: 'gs://acrylic-stand-uploads/');
    define('USE_CLOUD_STORAGE', true);
} else {
    // ローカルまたは Lolipop のファイルシステム
    define('UPLOAD_DIR', __DIR__ . '/../uploads/');
    define('USE_CLOUD_STORAGE', false);
}

// =====================================================
// CORS設定
// =====================================================

$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8000',
    'https://acrylic-stand-*.a.run.app', // GCP Cloud Run
    'https://zyniqo.co.jp',
    'https://www.zyniqo.co.jp',
];

// 開発環境では全てのオリジンを許可
if (APP_ENV === 'local') {
    header('Access-Control-Allow-Origin: *');
} else {
    // 本番環境では特定のオリジンのみ許可
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    foreach ($allowedOrigins as $allowed) {
        if (fnmatch($allowed, $origin)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            break;
        }
    }
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// OPTIONSリクエストの処理（プリフライトリクエスト）
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =====================================================
// データベース接続関数
// =====================================================

/**
 * データベース接続を取得
 * 
 * @return PDO データベース接続オブジェクト
 * @throws PDOException 接続に失敗した場合
 */
function getDbConnection() {
    try {
        // Cloud SQL (Unix Socket) の場合
        if (APP_ENV === 'gcp' && strpos(DB_HOST, '/cloudsql/') === 0) {
            $dsn = sprintf(
                'mysql:unix_socket=%s;dbname=%s;charset=%s',
                DB_HOST,
                DB_NAME,
                DB_CHARSET
            );
        } else {
            // 通常のTCP接続
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                DB_HOST,
                DB_NAME,
                DB_CHARSET
            );
        }
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
        ];
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        
        if (DEBUG_MODE) {
            error_log(sprintf('[Config] Database connected: %s@%s/%s (env: %s)', 
                DB_USER, DB_HOST, DB_NAME, APP_ENV));
        }
        
        return $pdo;
    } catch (PDOException $e) {
        error_log('Database connection error: ' . $e->getMessage());
        
        if (DEBUG_MODE) {
            throw new PDOException(
                'データベース接続エラー: ' . $e->getMessage() . 
                ' (Host: ' . DB_HOST . ', DB: ' . DB_NAME . ')'
            );
        } else {
            throw new PDOException('データベース接続エラー');
        }
    }
}

// =====================================================
// ユーティリティ関数
// =====================================================

/**
 * JSON レスポンスを返す
 * 
 * @param mixed $data レスポンスデータ
 * @param int $statusCode HTTPステータスコード
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

/**
 * エラーレスポンスを返す
 * 
 * @param string $message エラーメッセージ
 * @param int $statusCode HTTPステータスコード
 */
function sendErrorResponse($message, $statusCode = 400) {
    if (DEBUG_MODE) {
        error_log('[API Error] ' . $message);
    }
    
    sendJsonResponse([
        'success' => false,
        'error' => $message,
        'timestamp' => date('c'),
        'environment' => DEBUG_MODE ? APP_ENV : null, // デバッグ時のみ環境情報を含める
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

/**
 * 現在の環境情報を取得（デバッグ用）
 * 
 * @return array 環境情報
 */
function getEnvironmentInfo() {
    return [
        'environment' => APP_ENV,
        'debug_mode' => DEBUG_MODE,
        'db_host' => DB_HOST,
        'db_name' => DB_NAME,
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    ];
}

// デバッグモード時に環境情報をログ出力
if (DEBUG_MODE && php_sapi_name() !== 'cli') {
    error_log('[Config] Environment: ' . APP_ENV . ' | Debug: ' . (DEBUG_MODE ? 'ON' : 'OFF'));
}
