# API Documentation

このディレクトリには、アクリルスタンド工房のバックエンドAPIが含まれています。

## ファイル構成

```
api/
├── .htaccess       # セキュリティ設定
├── config.php      # データベース接続設定
├── orders.php      # 注文API
└── upload.php      # 画像アップロードAPI
```

## API エンドポイント

### 1. 注文API (`orders.php`)

#### POST - 新規注文作成

**リクエスト:**
```json
{
  "customer": {
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "phone": "090-1234-5678",
    "address": "〒123-4567 東京都渋谷区1-2-3"
  },
  "order_details": {
    "product_size": "card",
    "base_design": "default",
    "quantity": 1,
    "price": 1000,
    "image_path": "uploads/2024/12/21/1234567890_abc123.png",
    "image_data": "data:image/png;base64,..."
  },
  "payment": {
    "payment_status": "pending",
    "amount": 1000
  },
  "analytics": {
    "device_type": "desktop",
    "browser": "Chrome",
    "session_duration": 300,
    "referrer": "https://google.com",
    "pages_viewed": 5
  }
}
```

**レスポンス (成功):**
```json
{
  "success": true,
  "order_number": "AS-20241221-0001",
  "order_id": 1,
  "message": "注文が正常に作成されました"
}
```

**レスポンス (エラー):**
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

#### GET - 注文状態確認

**リクエスト:**
```
GET /api/orders.php?order_number=AS-20241221-0001
```

**レスポンス (成功):**
```json
{
  "success": true,
  "order": {
    "id": 1,
    "order_number": "AS-20241221-0001",
    "status": "pending",
    "created_at": "2024-12-21 12:00:00",
    "customer_name": "山田 太郎",
    "customer_email": "yamada@example.com",
    "product_size": "card",
    "quantity": 1,
    "price": 1000,
    "payment_status": "pending"
  }
}
```

### 2. 画像アップロードAPI (`upload.php`)

#### POST - 画像アップロード

**リクエスト:**
- Content-Type: `multipart/form-data`
- フィールド名: `image`
- 対応形式: JPG, PNG, GIF, WEBP
- 最大サイズ: 10MB

**レスポンス (成功):**
```json
{
  "success": true,
  "file": {
    "path": "uploads/2024/12/21/1234567890_abc123.png",
    "filename": "1234567890_abc123.png",
    "size": 123456,
    "mime_type": "image/png",
    "width": 800,
    "height": 600
  },
  "message": "ファイルが正常にアップロードされました"
}
```

**レスポンス (エラー):**
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

## セキュリティ

### 実装されているセキュリティ機能

1. **SQL インジェクション対策**
   - PDO のプリペアドステートメントを使用
   - すべてのユーザー入力をバインドパラメータで処理

2. **XSS 対策**
   - `htmlspecialchars()` による出力のエスケープ
   - セキュリティヘッダーの設定

3. **ファイルアップロードセキュリティ**
   - ファイルタイプの検証（MIME タイプ）
   - ファイルサイズの制限
   - 安全なファイル名の生成
   - `.htaccess` によるスクリプト実行の禁止

4. **CORS 設定**
   - 許可するオリジンの制御
   - プリフライトリクエストのサポート

5. **入力検証**
   - メールアドレスの形式検証
   - 必須フィールドのチェック
   - データ型の検証

## 設定

### データベース接続

`config.php` を編集して、Lolipop のデータベース情報を入力してください：

```php
define('DB_HOST', 'mysql000.lolipop.jp');           // データベースホスト名
define('DB_NAME', 'LAA0000000-yourdbname');          // データベース名
define('DB_USER', 'LAA0000000');                     // データベースユーザー名
define('DB_PASS', 'your_database_password');         // データベースパスワード
```

詳細は [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) を参照してください。

## エラーハンドリング

すべてのAPIは以下の形式でエラーを返します：

```json
{
  "success": false,
  "error": "エラーメッセージ（日本語）"
}
```

HTTPステータスコード：
- `200` - 成功
- `201` - 作成成功
- `400` - リクエストエラー
- `404` - 見つかりません
- `405` - メソッド不許可
- `500` - サーバーエラー

## デバッグ

### エラーログの確認

Lolipop のユーザー専用ページから「エラーログ」を確認できます。

### ローカルテスト

`curl` を使用してAPIをテストできます：

```bash
# 注文作成のテスト
curl -X POST http://localhost/api/orders.php \
  -H "Content-Type: application/json" \
  -d @test_order.json

# 注文状態の確認
curl "http://localhost/api/orders.php?order_number=AS-20241221-0001"
```

## トラブルシューティング

よくある問題と解決方法については [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) のトラブルシューティングセクションを参照してください。
