<?php
/**
 * CSRF Protection
 * 
 * Cross-Site Request Forgery攻撃を防ぐためのトークン生成・検証
 */

// セッション開始（まだ開始していない場合）
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * CSRFトークンを生成
 * 
 * @return string CSRFトークン
 */
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * CSRFトークンを取得（既存または新規）
 * 
 * @return string CSRFトークン
 */
function getCSRFToken() {
    return generateCSRFToken();
}

/**
 * CSRFトークンを検証
 * 
 * @param string $token 検証するトークン
 * @return bool 有効な場合true
 */
function verifyCSRFToken($token) {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * CSRFトークンをHTMLフォーム用のhidden inputとして出力
 * 
 * @return string HTML hidden input
 */
function csrfField() {
    $token = getCSRFToken();
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($token) . '">';
}

/**
 * CSRFトークンをmetaタグとして出力（JavaScript用）
 * 
 * @return string HTML meta tag
 */
function csrfMetaTag() {
    $token = getCSRFToken();
    return '<meta name="csrf-token" content="' . htmlspecialchars($token) . '">';
}

/**
 * リクエストからCSRFトークンを取得して検証
 * 無効な場合は403エラーを返して終了
 */
function validateCSRFToken() {
    $token = null;

    // POSTデータから取得
    if (isset($_POST['csrf_token'])) {
        $token = $_POST['csrf_token'];
    }
    // JSONリクエストの場合
    elseif ($_SERVER['CONTENT_TYPE'] === 'application/json') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (isset($data['csrf_token'])) {
            $token = $data['csrf_token'];
        }
    }
    // HTTPヘッダーから取得
    elseif (isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
    }

    if (!verifyCSRFToken($token)) {
        header('HTTP/1.1 403 Forbidden');
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'CSRF token validation failed'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * CSRF保護ミドルウェア
 * POSTリクエストに対してCSRFトークンを検証
 * 
 * @param bool $enableForGet GETリクエストにも適用するか（デフォルト: false）
 */
function applyCSRFProtection($enableForGet = false) {
    $method = $_SERVER['REQUEST_METHOD'];
    
    // POSTリクエストは常に検証
    if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE' || $method === 'PATCH') {
        validateCSRFToken();
    }
    // GETリクエストの検証（オプション）
    elseif ($enableForGet && $method === 'GET') {
        validateCSRFToken();
    }
}

/**
 * JavaScriptでCSRFトークンを使用するためのスクリプト
 * 
 * @return string JavaScriptコード
 */
function csrfScript() {
    $token = getCSRFToken();
    return <<<JS
<script>
(function() {
    const token = '{$token}';
    
    // Fetch APIのデフォルトヘッダーにCSRFトークンを追加
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        if (!options.headers) {
            options.headers = {};
        }
        
        // POSTなどの変更を伴うリクエストにトークンを追加
        const method = (options.method || 'GET').toUpperCase();
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            if (options.headers instanceof Headers) {
                options.headers.append('X-CSRF-Token', token);
            } else {
                options.headers['X-CSRF-Token'] = token;
            }
            
            // JSONボディにもトークンを追加
            if (options.body && typeof options.body === 'string') {
                try {
                    const body = JSON.parse(options.body);
                    body.csrf_token = token;
                    options.body = JSON.stringify(body);
                } catch (e) {
                    // JSON以外のボディはスキップ
                }
            }
        }
        
        return originalFetch(url, options);
    };
    
    // グローバル変数としても提供
    window.csrfToken = token;
})();
</script>
JS;
}
