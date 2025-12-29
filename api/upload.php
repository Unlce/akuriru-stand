<?php
/**
 * Upload API
 *
 * 画像ファイルのアップロード処理を行うAPIエンドポイント
 * Supports both local storage and Google Cloud Storage
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage.php';

// アップロード設定
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);

// POSTメソッドのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('POSTメソッドのみ対応しています', 405);
}

try {
    handleUpload();
} catch (Exception $e) {
    error_log('Upload Error: ' . $e->getMessage());
    sendErrorResponse('ファイルのアップロード中にエラーが発生しました', 500);
}

/**
 * ファイルアップロード処理
 */
function handleUpload() {
    // ファイルがアップロードされているか確認
    if (!isset($_FILES['image']) || $_FILES['image']['error'] === UPLOAD_ERR_NO_FILE) {
        sendErrorResponse('ファイルが選択されていません');
    }
    
    $file = $_FILES['image'];
    
    // アップロードエラーの確認
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessage = getUploadErrorMessage($file['error']);
        sendErrorResponse($errorMessage);
    }
    
    // ファイルサイズの検証
    if ($file['size'] > MAX_FILE_SIZE) {
        sendErrorResponse('ファイルサイズが大きすぎます（最大10MB）');
    }
    
    // ファイルタイプの検証
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, ALLOWED_TYPES)) {
        sendErrorResponse('許可されていないファイル形式です。JPG、PNG、GIF、WEBPのみ対応しています。');
    }
    
    // ファイル拡張子の検証
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ALLOWED_EXTENSIONS)) {
        sendErrorResponse('許可されていないファイル拡張子です');
    }
    
    // 日付ベースのディレクトリパスを生成
    $dateDir = date('Y/m/d');

    // 安全なファイル名を生成
    $safeFilename = generateSafeFilename($extension);
    $destination = $dateDir . '/' . $safeFilename;

    // 画像情報を取得（アップロード前）
    $imageInfo = getimagesize($file['tmp_name']);

    // Use storage adapter (local or GCS)
    $uploadResult = uploadToStorage($file, $destination);

    if (!$uploadResult['success']) {
        sendErrorResponse($uploadResult['error'] ?: 'ファイルの保存に失敗しました', 500);
    }

    // 成功レスポンス
    sendJsonResponse([
        'success' => true,
        'file' => [
            'path' => $uploadResult['path'],
            'url' => $uploadResult['url'],
            'filename' => $safeFilename,
            'size' => $file['size'],
            'mime_type' => $mimeType,
            'width' => $imageInfo[0],
            'height' => $imageInfo[1]
        ],
        'message' => 'ファイルが正常にアップロードされました',
        'storage' => useCloudStorage() ? 'gcs' : 'local'
    ], 201);
}

/**
 * 安全なファイル名を生成
 * 
 * @param string $extension ファイル拡張子
 * @return string 安全なファイル名
 */
function generateSafeFilename($extension) {
    // タイムスタンプ + ランダム文字列でユニークなファイル名を生成
    $timestamp = time();
    $random = bin2hex(random_bytes(8));
    return "{$timestamp}_{$random}.{$extension}";
}

/**
 * アップロードエラーメッセージを取得
 * 
 * @param int $errorCode エラーコード
 * @return string エラーメッセージ
 */
function getUploadErrorMessage($errorCode) {
    switch ($errorCode) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            return 'ファイルサイズが大きすぎます';
        case UPLOAD_ERR_PARTIAL:
            return 'ファイルが部分的にしかアップロードされませんでした';
        case UPLOAD_ERR_NO_TMP_DIR:
            return '一時フォルダが見つかりません';
        case UPLOAD_ERR_CANT_WRITE:
            return 'ディスクへの書き込みに失敗しました';
        case UPLOAD_ERR_EXTENSION:
            return 'PHP拡張によってアップロードが停止されました';
        default:
            return '不明なエラーが発生しました';
    }
}
