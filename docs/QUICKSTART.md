# クイックスタートガイド

このガイドでは、アクリルスタンド工房のプロジェクトを素早くセットアップする方法を説明します。

## 目次

1. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
2. [Lolipop へのデプロイ](#lolipop-へのデプロイ)
3. [機能のテスト](#機能のテスト)

---

## ローカル開発環境のセットアップ

### 必要なもの

- PHP 7.4 以上
- MySQL 5.7 以上 または MariaDB 10.x
- Webサーバー（Apache または nginx）

### ステップ 1: プロジェクトのクローン

```bash
git clone https://github.com/Unlce/akuriru-stand.git
cd akuriru-stand
```

### ステップ 2: データベースのセットアップ

1. MySQL にログイン：
   ```bash
   mysql -u root -p
   ```

2. データベースを作成：
   ```sql
   CREATE DATABASE acrylic_stand CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE acrylic_stand;
   ```

3. テーブルを作成：
   ```bash
   mysql -u root -p acrylic_stand < database/init.sql
   ```

### ステップ 3: データベース接続設定

`api/config.php` を編集：

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'acrylic_stand');
define('DB_USER', 'root');
define('DB_PASS', 'your_password');
```

### ステップ 4: ローカルサーバーの起動

#### 方法 1: PHP ビルトインサーバー（開発用）

```bash
php -S localhost:8080
```

ブラウザで `http://localhost:8080` を開く

#### 方法 2: Apache/nginx

プロジェクトディレクトリを Web サーバーのドキュメントルートに配置するか、仮想ホストを設定します。

### ステップ 5: アップロードディレクトリの権限設定

```bash
chmod 755 uploads/
```

---

## Lolipop へのデプロイ

詳細なデプロイ手順は [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) を参照してください。

### 簡易手順：

1. **データベース作成**
   - Lolipop ユーザー専用ページでデータベースを作成

2. **ファイルアップロード**
   - FTP または Lolipop FTP ですべてのファイルをアップロード

3. **設定ファイル編集**
   - `api/config.php` にデータベース情報を入力

4. **データベース初期化**
   - phpMyAdmin で `database/init.sql` を実行

5. **パーミッション設定**
   - `uploads/` ディレクトリを 755 に設定

6. **動作確認**
   - `https://yourdomain.com/index.html` にアクセス

---

## 機能のテスト

### 1. フロントエンドのテスト

1. ブラウザで `index.html` を開く
2. 画像をアップロード
3. 編集ツールで画像を調整
4. 注文フォームを送信
5. 成功メッセージが表示されることを確認

### 2. API のテスト

#### 注文作成のテスト

```bash
curl -X POST http://localhost:8080/api/orders.php \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "テスト太郎",
      "email": "test@example.com",
      "phone": "090-1234-5678",
      "address": "東京都渋谷区1-2-3"
    },
    "order_details": {
      "product_size": "card",
      "base_design": "default",
      "quantity": 1,
      "price": 1000
    },
    "analytics": {
      "device_type": "desktop",
      "browser": "Chrome",
      "session_duration": 300,
      "pages_viewed": 5
    }
  }'
```

#### 注文状態の確認

```bash
curl "http://localhost:8080/api/orders.php?order_number=AS-20241221-0001"
```

#### 画像アップロードのテスト

```bash
curl -X POST http://localhost:8080/api/upload.php \
  -F "image=@/path/to/test-image.jpg"
```

### 3. 管理画面のテスト

1. `http://localhost:8080/admin/index.php` にアクセス
2. デフォルトパスワード `admin123` でログイン
3. 注文一覧が表示されることを確認

**重要:** 本番環境では必ずパスワードを変更してください！

---

## トラブルシューティング

### 問題: データベース接続エラー

**解決方法:**
- `api/config.php` の設定を確認
- MySQL サービスが起動しているか確認
- データベース名、ユーザー名、パスワードが正しいか確認

### 問題: 画像がアップロードできない

**解決方法:**
- `uploads/` ディレクトリのパーミッションを確認（755）
- PHP の `upload_max_filesize` と `post_max_size` を確認
- ディスクの空き容量を確認

### 問題: 500 Internal Server Error

**解決方法:**
- PHP のエラーログを確認
- `.htaccess` ファイルが正しくアップロードされているか確認
- PHP のバージョンを確認（7.4 以上必要）

---

## 次のステップ

- [`README.md`](README.md) - プロジェクトの詳細情報
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - 詳細なデプロイメントガイド
- [`api/README.md`](api/README.md) - API ドキュメント

---

## サポート

問題が発生した場合は、以下を確認してください：

1. このドキュメントのトラブルシューティングセクション
2. [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) のトラブルシューティング
3. ブラウザのコンソール（開発者ツール）
4. サーバーのエラーログ

---

**楽しいアクリルスタンド作成を！** ✨
