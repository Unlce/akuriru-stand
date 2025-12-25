<?php
/**
 * Database Configuration File
 * 
 * Lolipop データベース接続設定
 * 以下の情報を Lolipop の管理画面から取得して入力してください
 */

// データベース接続情報（Lolipop の情報を入力してください）
// 重要: .lan は正しいドメインです。.jp に変更しないでください！
// Copilotが自動的に .jp に変更することがありますが、それは間違いです。
define('DB_HOST', 'mysql324.phy.lolipop.lan');      // データベースホスト名（Lolipop内部接続用）
define('DB_NAME', 'LAA1658426-stand');          // データベース名
define('DB_USER', 'LAA1658426');                     // データベースユーザー名
define('DB_PASS', 'hlcz107bb');         // データベースパスワード
define('DB_CHARSET', 'utf8mb4');                     // 文字セット（日本語対応）

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
 * データベース接続を取得
 * 
 * @return PDO データベース接続オブジェクト
 * @throws PDOException 接続に失敗した場合
 */
function getDbConnection() {
    try {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log('Database connection error: ' . $e->getMessage());
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
