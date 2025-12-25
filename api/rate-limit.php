<?php
/**
 * Rate Limiting Middleware
 * 
 * APIへのリクエスト頻度を制限し、DDoS攻撃やスパムを防ぐ
 */

class RateLimiter {
    private $maxRequests;
    private $timeWindow;
    private $storageFile;

    /**
     * Constructor
     * 
     * @param int $maxRequests 時間枠内の最大リクエスト数
     * @param int $timeWindow 時間枠（秒）
     */
    public function __construct($maxRequests = 10, $timeWindow = 60) {
        $this->maxRequests = $maxRequests;
        $this->timeWindow = $timeWindow;
        $this->storageFile = __DIR__ . '/../uploads/.rate_limit_data.json';
    }

    /**
     * レート制限をチェック
     * 
     * @param string $identifier クライアント識別子（通常はIPアドレス）
     * @return bool 制限内であればtrue、超過していればfalse
     */
    public function check($identifier) {
        $data = $this->loadData();
        $now = time();

        // 古いデータをクリーンアップ
        $this->cleanup($data, $now);

        // クライアントのリクエスト履歴を取得
        if (!isset($data[$identifier])) {
            $data[$identifier] = [];
        }

        // 時間枠内のリクエスト数をカウント
        $recentRequests = array_filter($data[$identifier], function($timestamp) use ($now) {
            return ($now - $timestamp) <= $this->timeWindow;
        });

        // 制限チェック
        if (count($recentRequests) >= $this->maxRequests) {
            return false;
        }

        // 新しいリクエストを記録
        $data[$identifier][] = $now;
        $this->saveData($data);

        return true;
    }

    /**
     * クライアントの残りリクエスト数を取得
     * 
     * @param string $identifier クライアント識別子
     * @return int 残りリクエスト数
     */
    public function getRemainingRequests($identifier) {
        $data = $this->loadData();
        $now = time();

        if (!isset($data[$identifier])) {
            return $this->maxRequests;
        }

        $recentRequests = array_filter($data[$identifier], function($timestamp) use ($now) {
            return ($now - $timestamp) <= $this->timeWindow;
        });

        return max(0, $this->maxRequests - count($recentRequests));
    }

    /**
     * 次にリクエスト可能になるまでの秒数を取得
     * 
     * @param string $identifier クライアント識別子
     * @return int 秒数
     */
    public function getRetryAfter($identifier) {
        $data = $this->loadData();
        $now = time();

        if (!isset($data[$identifier]) || empty($data[$identifier])) {
            return 0;
        }

        $oldestRequest = min($data[$identifier]);
        $resetTime = $oldestRequest + $this->timeWindow;
        
        return max(0, $resetTime - $now);
    }

    /**
     * データをファイルから読み込み
     * 
     * @return array
     */
    private function loadData() {
        if (!file_exists($this->storageFile)) {
            return [];
        }

        $content = file_get_contents($this->storageFile);
        return json_decode($content, true) ?: [];
    }

    /**
     * データをファイルに保存
     * 
     * @param array $data
     */
    private function saveData($data) {
        $dir = dirname($this->storageFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($this->storageFile, json_encode($data));
    }

    /**
     * 古いデータをクリーンアップ
     * 
     * @param array &$data
     * @param int $now 現在のタイムスタンプ
     */
    private function cleanup(&$data, $now) {
        foreach ($data as $identifier => $timestamps) {
            // 時間枠外の古いタイムスタンプを削除
            $data[$identifier] = array_filter($timestamps, function($timestamp) use ($now) {
                return ($now - $timestamp) <= $this->timeWindow;
            });

            // 空になったら削除
            if (empty($data[$identifier])) {
                unset($data[$identifier]);
            }
        }
    }
}

/**
 * レート制限ミドルウェア関数
 * 
 * @param int $maxRequests 最大リクエスト数
 * @param int $timeWindow 時間枠（秒）
 */
function applyRateLimit($maxRequests = 10, $timeWindow = 60) {
    $limiter = new RateLimiter($maxRequests, $timeWindow);
    
    // クライアント識別子（IPアドレス）
    $identifier = $_SERVER['REMOTE_ADDR'];
    
    // プロキシ経由の場合は実際のIPを取得
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $identifier = trim($ips[0]);
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $identifier = $_SERVER['HTTP_CLIENT_IP'];
    }

    // レート制限チェック
    if (!$limiter->check($identifier)) {
        $retryAfter = $limiter->getRetryAfter($identifier);
        
        header('HTTP/1.1 429 Too Many Requests');
        header('Content-Type: application/json; charset=utf-8');
        header("Retry-After: $retryAfter");
        
        echo json_encode([
            'success' => false,
            'error' => 'リクエストが多すぎます。しばらく待ってから再試行してください。',
            'retry_after' => $retryAfter
        ], JSON_UNESCAPED_UNICODE);
        
        exit;
    }

    // レスポンスヘッダーにレート制限情報を追加
    $remaining = $limiter->getRemainingRequests($identifier);
    header("X-RateLimit-Limit: $maxRequests");
    header("X-RateLimit-Remaining: $remaining");
    header("X-RateLimit-Reset: " . (time() + $timeWindow));
}
